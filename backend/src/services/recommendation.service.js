import { runQuery } from "../db/connection.js";

const IMPORTANCE_WEIGHT = { required: 1.0, "nice-to-have": 0.5 };
const HOP_DECAY = { 0: 1.0, 1: 0.6, 2: 0.3 };

// THE FLAGSHIP / "SQL WOULD FIND THIS AWKWARD" QUERY.
//
// Goal: for a job, rank candidates not just by exact skill matches, but give
// partial credit for skills that are "adjacent" via the RELATED_TO graph —
// e.g. a job requiring Node.js should still surface a candidate who only
// lists React and JavaScript, because JavaScript is 1 hop from Node.js.
//
// This one Cypher query does the traversal: `[:RELATED_TO*0..2]` finds every
// skill within 0, 1, or 2 hops of each required skill (0 hops = the exact
// skill itself), then joins to every candidate who HAS_SKILL any of those
// reachable skills. In SQL, the same idea needs a recursive CTE walking a
// self-referencing skill_relations edge table to depth 2, joined back to a
// candidate_skills table, with manual path-weight accumulation across
// recursion levels and de-duplication of the many redundant paths a
// recursive join produces — the graph engine does this natively in one
// traversal clause.
//
// The scoring itself (decay by hop distance, weight by importance, take the
// best path per required skill, sum across required skills) is ordinary
// arithmetic, so it's done here in JS rather than crammed into the Cypher —
// keeps the query focused on "what's reachable" and the scoring logic
// separately readable and unit-testable.
async function fetchRawMatches(jobId) {
  return runQuery(
    `MATCH (j:Job {id: $jobId})-[req:REQUIRES_SKILL]->(reqSkill:Skill)
     MATCH p = (reqSkill)-[:RELATED_TO*0..2]-(reachSkill:Skill)
     MATCH (cand:Candidate)-[has:HAS_SKILL]->(reachSkill)
     RETURN cand.id AS candidateId, cand.name AS name, cand.headline AS headline,
            reqSkill.id AS requiredSkillId, reqSkill.name AS requiredSkillName,
            req.importance AS importance,
            reachSkill.name AS viaSkillName, length(p) AS hopDistance,
            reduce(s = 1.0, rel IN relationships(p) | s * rel.strength) AS pathStrength,
            has.proficiency AS proficiency`,
    { jobId }
  );
}

export async function getRecommendedCandidates(jobId, { limit = 10 } = {}) {
  const records = await fetchRawMatches(jobId);
  if (records.length === 0) return [];

  // maxPossibleScore: what a candidate would score with every required skill
  // held directly (hop 0) at max proficiency — used to express results as a
  // 0-100 "match %" instead of a raw, unexplained number.
  const requiredSkills = new Map(); // requiredSkillId -> {name, importance}
  for (const r of records) {
    requiredSkills.set(r.get("requiredSkillId"), {
      name: r.get("requiredSkillName"),
      importance: r.get("importance"),
    });
  }
  const maxPossibleScore = [...requiredSkills.values()].reduce(
    (sum, s) => sum + IMPORTANCE_WEIGHT[s.importance],
    0
  );

  // candidateId -> requiredSkillId -> best {contribution, hopDistance, viaSkillName}
  const byCandidate = new Map();
  for (const r of records) {
    const candidateId = r.get("candidateId");
    const requiredSkillId = r.get("requiredSkillId");
    const hopDistance = r.get("hopDistance");
    const importance = r.get("importance");
    const contribution =
      r.get("pathStrength") *
      HOP_DECAY[hopDistance] *
      (r.get("proficiency") / 5) *
      IMPORTANCE_WEIGHT[importance];

    if (!byCandidate.has(candidateId)) {
      byCandidate.set(candidateId, {
        candidateId,
        name: r.get("name"),
        headline: r.get("headline"),
        perSkill: new Map(),
      });
    }
    const entry = byCandidate.get(candidateId);
    const existing = entry.perSkill.get(requiredSkillId);
    if (!existing || contribution > existing.contribution) {
      entry.perSkill.set(requiredSkillId, {
        contribution,
        hopDistance,
        viaSkillName: r.get("viaSkillName"),
      });
    }
  }

  const results = [...byCandidate.values()].map((entry) => {
    const totalScore = [...entry.perSkill.values()].reduce((sum, m) => sum + m.contribution, 0);
    const matchBreakdown = [...requiredSkills.entries()].map(([skillId, skill]) => {
      const match = entry.perSkill.get(skillId);
      return {
        skillId,
        skillName: skill.name,
        importance: skill.importance,
        matched: Boolean(match),
        matchType: !match ? null : match.hopDistance === 0 ? "direct" : "related",
        viaSkillName: match && match.hopDistance > 0 ? match.viaSkillName : null,
        hopDistance: match ? match.hopDistance : null,
      };
    });
    return {
      candidateId: entry.candidateId,
      name: entry.name,
      headline: entry.headline,
      matchPercent: Math.round((totalScore / maxPossibleScore) * 100),
      matchBreakdown,
    };
  });

  results.sort((a, b) => b.matchPercent - a.matchPercent);
  return results.slice(0, limit);
}
