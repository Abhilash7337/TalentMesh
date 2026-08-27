import { runQuery } from "../db/connection.js";

export async function listCandidates({ limit = 20, skip = 0 } = {}) {
  const records = await runQuery(
    `MATCH (c:Candidate)
     RETURN c
     ORDER BY c.name
     SKIP $skip LIMIT $limit`,
    { skip, limit }
  );
  return records.map((r) => r.get("c").properties);
}

export async function getCandidateById(id) {
  const records = await runQuery(
    `MATCH (c:Candidate {id: $id})
     OPTIONAL MATCH (c)-[has:HAS_SKILL]->(s:Skill)
     RETURN c,
            collect(CASE WHEN s IS NULL THEN NULL ELSE {
              skillId: s.id, name: s.name, category: s.category,
              proficiency: has.proficiency, yearsUsed: has.yearsUsed
            } END) AS skills`,
    { id }
  );
  if (records.length === 0) return null;
  const record = records[0];
  return {
    ...record.get("c").properties,
    skills: record.get("skills").filter(Boolean),
  };
}
