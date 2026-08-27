import { runQuery } from "../db/connection.js";

export async function getStats() {
  const records = await runQuery(`MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count`, {});
  const counts = Object.fromEntries(records.map((r) => [r.get("label"), r.get("count")]));
  return {
    candidates: counts.Candidate || 0,
    jobs: counts.Job || 0,
    skills: counts.Skill || 0,
    companies: counts.Company || 0,
  };
}
