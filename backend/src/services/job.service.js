import { runQuery } from "../db/connection.js";

export async function listJobs({ limit = 20, skip = 0, status, q } = {}) {
  const records = await runQuery(
    `MATCH (j:Job)
     WHERE ($status IS NULL OR j.status = $status)
       AND ($q IS NULL OR toLower(j.title) CONTAINS toLower($q))
     OPTIONAL MATCH (co:Company)-[:POSTED]->(j)
     RETURN j, co.name AS companyName
     ORDER BY j.postedDate DESC
     SKIP $skip LIMIT $limit`,
    { skip, limit, status: status ?? null, q: q || null }
  );
  return records.map((r) => ({ ...r.get("j").properties, companyName: r.get("companyName") }));
}

export async function getJobById(id) {
  const records = await runQuery(
    `MATCH (j:Job {id: $id})
     OPTIONAL MATCH (co:Company)-[:POSTED]->(j)
     OPTIONAL MATCH (j)-[req:REQUIRES_SKILL]->(s:Skill)
     RETURN j, co.name AS companyName, co.id AS companyId,
            collect(CASE WHEN s IS NULL THEN NULL ELSE {
              skillId: s.id, name: s.name, category: s.category,
              importance: req.importance, minYears: req.minYears
            } END) AS requiredSkills`,
    { id }
  );
  if (records.length === 0) return null;
  const record = records[0];
  return {
    ...record.get("j").properties,
    company: record.get("companyId") ? { id: record.get("companyId"), name: record.get("companyName") } : null,
    requiredSkills: record.get("requiredSkills").filter(Boolean),
  };
}
