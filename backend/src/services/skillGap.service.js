import { runQuery } from "../db/connection.js";

// NOTE ON A COGNODB ENGINE QUIRK: an earlier version of this file used
// `WHERE NOT (reqSkill)<-[:HAS_SKILL]-(:Candidate {id: $candidateId})` to find
// required skills the candidate lacks. Testing against the live instance
// showed this CognoDB build does not scope pattern-predicates (existential
// boolean checks like `NOT (a)-[:REL]->(b)`) to the specific bound nodes —
// it effectively answers "does any relationship of this type exist in the
// graph at all," which is always true once any candidate anywhere has that
// skill. The same problem affects OPTIONAL MATCH when the far/second-hop
// node carries a property filter (inline or WHERE) — the filter is silently
// ignored. Every query below sticks to patterns confirmed safe by direct
// testing: plain (non-optional) MATCH chains, with any "does X exist"
// decisions made afterward in JS via array/set operations instead of in Cypher.

async function fetchRequiredSkills(jobId) {
  const records = await runQuery(
    `MATCH (j:Job {id: $jobId})-[req:REQUIRES_SKILL]->(s:Skill)
     RETURN s.id AS skillId, s.name AS skillName, req.importance AS importance, req.minYears AS minYears`,
    { jobId }
  );
  return records.map((r) => ({
    skillId: r.get("skillId"),
    skillName: r.get("skillName"),
    importance: r.get("importance"),
    minYears: r.get("minYears"),
  }));
}

async function fetchSkillsCandidateHasForJob(candidateId, jobId) {
  const records = await runQuery(
    `MATCH (j:Job {id: $jobId})-[req:REQUIRES_SKILL]->(reqSkill:Skill)<-[has:HAS_SKILL]-(:Candidate {id: $candidateId})
     RETURN reqSkill.id AS skillId, has.proficiency AS proficiency`,
    { candidateId, jobId }
  );
  return new Map(records.map((r) => [r.get("skillId"), r.get("proficiency")]));
}

// For a known list of missing skills, find any skill the candidate DOES hold
// that is within 1-2 RELATED_TO hops of one — the "head start" signal. Both
// endpoints here are reached by walking forward from the candidate (a plain,
// always-safe MATCH chain), then filtered by WHERE ... IN — a plain MATCH's
// WHERE filter on a far node was confirmed to work correctly (unlike OPTIONAL
// MATCH's), so this stays entirely within the confirmed-safe query shapes.
async function fetchHeadStarts(candidateId, gapSkillIds) {
  if (gapSkillIds.length === 0) return [];
  const records = await runQuery(
    `MATCH (cand:Candidate {id: $candidateId})-[ownedHas:HAS_SKILL]->(owned:Skill)
     MATCH p = (owned)-[:RELATED_TO*1..2]-(gap:Skill)
     WHERE gap.id IN $gapSkillIds
     RETURN gap.id AS skillId, owned.name AS viaSkillName, length(p) AS hopDistance,
            reduce(s = 1.0, rel IN relationships(p) | s * rel.strength) AS pathStrength,
            ownedHas.proficiency AS viaProficiency`,
    { candidateId, gapSkillIds }
  );
  return records.map((r) => ({
    skillId: r.get("skillId"),
    viaSkillName: r.get("viaSkillName"),
    hopDistance: r.get("hopDistance"),
    pathStrength: r.get("pathStrength"),
    viaProficiency: r.get("viaProficiency"),
  }));
}

export async function getSkillGap(candidateId, jobId) {
  const requiredSkills = await fetchRequiredSkills(jobId);
  const heldProficiencyBySkillId = await fetchSkillsCandidateHasForJob(candidateId, jobId);

  const alreadyHas = requiredSkills
    .filter((s) => heldProficiencyBySkillId.has(s.skillId))
    .map((s) => ({ ...s, proficiency: heldProficiencyBySkillId.get(s.skillId) }));

  const missing = requiredSkills.filter((s) => !heldProficiencyBySkillId.has(s.skillId));
  const headStartRows = await fetchHeadStarts(candidateId, missing.map((s) => s.skillId));

  // Symmetric RELATED_TO edges (stored both directions) can produce more than
  // one path of the same length between two skills — keep only the strongest.
  const bestHeadStartBySkillId = new Map();
  for (const row of headStartRows) {
    const existing = bestHeadStartBySkillId.get(row.skillId);
    if (!existing || row.pathStrength > existing.pathStrength) {
      bestHeadStartBySkillId.set(row.skillId, row);
    }
  }

  const gaps = [];
  const headStartGaps = [];
  for (const skill of missing) {
    const headStart = bestHeadStartBySkillId.get(skill.skillId);
    if (headStart) {
      headStartGaps.push({ ...skill, headStart });
    } else {
      gaps.push(skill);
    }
  }

  return { candidateId, jobId, alreadyHas, gaps, headStartGaps };
}
