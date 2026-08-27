import { runQuery } from "../db/connection.js";

const IMPORTANCE_WEIGHT = { required: 1.0, "nice-to-have": 0.5 };
const HOP_DECAY = { 0: 1.0, 1: 0.6, 2: 0.3 };

function contribution(row) {
  return (
    row.pathStrength * HOP_DECAY[row.hopDistance] * (row.proficiency / 5) * IMPORTANCE_WEIGHT[row.importance]
  );
}

function buildBreakdown(requiredSkills, bestBySkillId) {
  return [...requiredSkills.entries()].map(([skillId, skill]) => {
    const match = bestBySkillId.get(skillId);
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
}

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
async function fetchRequiredSkills(jobId) {
  const records = await runQuery(
    `MATCH (j:Job {id: $jobId})-[req:REQUIRES_SKILL]->(s:Skill)
     RETURN s.id AS skillId, s.name AS skillName, req.importance AS importance`,
    { jobId }
  );
  return new Map(records.map((r) => [r.get("skillId"), { name: r.get("skillName"), importance: r.get("importance") }]));
}

async function fetchCandidateMatchRows(jobId) {
  return runQuery(
    `MATCH (j:Job {id: $jobId})-[req:REQUIRES_SKILL]->(reqSkill:Skill)
     MATCH p = (reqSkill)-[:RELATED_TO*0..2]-(reachSkill:Skill)
     MATCH (cand:Candidate)-[has:HAS_SKILL]->(reachSkill)
     RETURN cand.id AS candidateId, cand.name AS name, cand.headline AS headline,
            reqSkill.id AS requiredSkillId,
            req.importance AS importance,
            reachSkill.name AS viaSkillName, length(p) AS hopDistance,
            reduce(s = 1.0, rel IN relationships(p) | s * rel.strength) AS pathStrength,
            has.proficiency AS proficiency`,
    { jobId }
  );
}

export async function getRecommendedCandidates(jobId, { limit = 10 } = {}) {
  // Required skills are fetched independently of the match rows below so a
  // required skill nobody comes close to having still counts toward the
  // denominator and still shows up (as unmatched) in every breakdown — using
  // only the skills that happened to appear in a match would silently drop
  // "impossible" requirements from both the score and the explanation.
  const requiredSkills = await fetchRequiredSkills(jobId);
  const maxPossibleScore = [...requiredSkills.values()].reduce((sum, s) => sum + IMPORTANCE_WEIGHT[s.importance], 0);
  if (maxPossibleScore === 0) return [];

  const rows = await fetchCandidateMatchRows(jobId);

  // candidateId -> requiredSkillId -> best {contribution, hopDistance, viaSkillName}
  const byCandidate = new Map();
  for (const r of rows) {
    const candidateId = r.get("candidateId");
    const requiredSkillId = r.get("requiredSkillId");
    const row = {
      hopDistance: r.get("hopDistance"),
      importance: r.get("importance"),
      pathStrength: r.get("pathStrength"),
      proficiency: r.get("proficiency"),
    };
    if (!byCandidate.has(candidateId)) {
      byCandidate.set(candidateId, { candidateId, name: r.get("name"), headline: r.get("headline"), perSkill: new Map() });
    }
    const entry = byCandidate.get(candidateId);
    const c = contribution(row);
    const existing = entry.perSkill.get(requiredSkillId);
    if (!existing || c > existing.contribution) {
      entry.perSkill.set(requiredSkillId, { contribution: c, hopDistance: row.hopDistance, viaSkillName: r.get("viaSkillName") });
    }
  }

  const results = [...byCandidate.values()].map((entry) => ({
    candidateId: entry.candidateId,
    name: entry.name,
    headline: entry.headline,
    matchPercent: Math.round(
      ([...entry.perSkill.values()].reduce((sum, m) => sum + m.contribution, 0) / maxPossibleScore) * 100
    ),
    matchBreakdown: buildBreakdown(requiredSkills, entry.perSkill),
  }));

  results.sort((a, b) => b.matchPercent - a.matchPercent);
  return results.slice(0, limit);
}

// Same idea, reversed: for one candidate, which jobs are they a strong match
// for? Anchored from every job's required skills instead of one job's, then
// filtered down to this one candidate's HAS_SKILL edges in the last MATCH —
// still a plain MATCH chain throughout (no OPTIONAL MATCH, no negation), the
// only shape confirmed safe against this CognoDB instance's engine quirk
// (see docs/queries.md).
async function fetchAllJobRequiredSkills() {
  const records = await runQuery(
    `MATCH (j:Job)-[req:REQUIRES_SKILL]->(s:Skill)
     RETURN j.id AS jobId, s.id AS skillId, s.name AS skillName, req.importance AS importance`,
    {}
  );
  const byJob = new Map();
  for (const r of records) {
    const jobId = r.get("jobId");
    if (!byJob.has(jobId)) byJob.set(jobId, new Map());
    byJob.get(jobId).set(r.get("skillId"), { name: r.get("skillName"), importance: r.get("importance") });
  }
  return byJob;
}

async function fetchJobMatchRowsForCandidate(candidateId) {
  return runQuery(
    `MATCH (job:Job)-[req:REQUIRES_SKILL]->(reqSkill:Skill)
     MATCH p = (reqSkill)-[:RELATED_TO*0..2]-(reachSkill:Skill)
     MATCH (cand:Candidate {id: $candidateId})-[has:HAS_SKILL]->(reachSkill)
     RETURN job.id AS jobId, job.title AS title, job.seniority AS seniority,
            job.location AS location, job.status AS status,
            reqSkill.id AS requiredSkillId, req.importance AS importance,
            reachSkill.name AS viaSkillName, length(p) AS hopDistance,
            reduce(s = 1.0, rel IN relationships(p) | s * rel.strength) AS pathStrength,
            has.proficiency AS proficiency`,
    { candidateId }
  );
}

export async function getRecommendedJobsForCandidate(candidateId, { limit = 10 } = {}) {
  const [requiredSkillsByJob, rows] = await Promise.all([
    fetchAllJobRequiredSkills(),
    fetchJobMatchRowsForCandidate(candidateId),
  ]);

  // jobId -> requiredSkillId -> best {contribution, hopDistance, viaSkillName}
  const byJob = new Map();
  for (const r of rows) {
    const jobId = r.get("jobId");
    const requiredSkillId = r.get("requiredSkillId");
    const row = {
      hopDistance: r.get("hopDistance"),
      importance: r.get("importance"),
      pathStrength: r.get("pathStrength"),
      proficiency: r.get("proficiency"),
    };
    if (!byJob.has(jobId)) {
      byJob.set(jobId, {
        jobId,
        title: r.get("title"),
        seniority: r.get("seniority"),
        location: r.get("location"),
        status: r.get("status"),
        perSkill: new Map(),
      });
    }
    const entry = byJob.get(jobId);
    const c = contribution(row);
    const existing = entry.perSkill.get(requiredSkillId);
    if (!existing || c > existing.contribution) {
      entry.perSkill.set(requiredSkillId, { contribution: c, hopDistance: row.hopDistance, viaSkillName: r.get("viaSkillName") });
    }
  }

  const results = [...byJob.values()].map((entry) => {
    const requiredSkills = requiredSkillsByJob.get(entry.jobId) ?? new Map();
    const maxPossibleScore = [...requiredSkills.values()].reduce((sum, s) => sum + IMPORTANCE_WEIGHT[s.importance], 0);
    return {
      jobId: entry.jobId,
      title: entry.title,
      seniority: entry.seniority,
      location: entry.location,
      status: entry.status,
      matchPercent: maxPossibleScore
        ? Math.round(([...entry.perSkill.values()].reduce((sum, m) => sum + m.contribution, 0) / maxPossibleScore) * 100)
        : 0,
      matchBreakdown: buildBreakdown(requiredSkills, entry.perSkill),
    };
  });

  results.sort((a, b) => b.matchPercent - a.matchPercent);
  return results.slice(0, limit);
}
