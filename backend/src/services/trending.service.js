import { runQuery } from "../db/connection.js";

// Co-occurrence via a shared candidate: Skill1 <-[HAS_SKILL]- Candidate -[HAS_SKILL]-> Skill2.
// A 2-hop pattern through the candidate node — "how many candidates have both."

// Companions for one specific skill: "people with X often also have Y."
async function getCompanionsForSkill(skillId, limit) {
  const records = await runQuery(
    `MATCH (s:Skill {id: $skillId})<-[:HAS_SKILL]-(cand:Candidate)-[:HAS_SKILL]->(other:Skill)
     WHERE other <> s
     RETURN other.id AS skillId, other.name AS skillName, other.category AS category,
            count(DISTINCT cand) AS coOccurrenceCount
     ORDER BY coOccurrenceCount DESC
     LIMIT $limit`,
    { skillId, limit }
  );
  return records.map((r) => ({
    skillId: r.get("skillId"),
    skillName: r.get("skillName"),
    category: r.get("category"),
    coOccurrenceCount: r.get("coOccurrenceCount"),
  }));
}

// Global top co-occurring pairs across every candidate. `s1.id < s2.id` dedupes
// unordered pairs (so React+JavaScript isn't counted separately from JavaScript+React)
// without a self-join subquery.
async function getTopCoOccurringPairs(limit) {
  const records = await runQuery(
    `MATCH (s1:Skill)<-[:HAS_SKILL]-(cand:Candidate)-[:HAS_SKILL]->(s2:Skill)
     WHERE s1.id < s2.id
     RETURN s1.id AS skillAId, s1.name AS skillAName, s2.id AS skillBId, s2.name AS skillBName,
            count(DISTINCT cand) AS coOccurrenceCount
     ORDER BY coOccurrenceCount DESC
     LIMIT $limit`,
    { limit }
  );
  return records.map((r) => ({
    skillAId: r.get("skillAId"),
    skillAName: r.get("skillAName"),
    skillBId: r.get("skillBId"),
    skillBName: r.get("skillBName"),
    coOccurrenceCount: r.get("coOccurrenceCount"),
  }));
}

export async function getTrendingSkills({ skillId, limit = 15 } = {}) {
  if (skillId) {
    return { skillId, companions: await getCompanionsForSkill(skillId, limit) };
  }
  return { pairs: await getTopCoOccurringPairs(limit) };
}
