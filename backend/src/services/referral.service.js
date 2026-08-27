import { runQuery } from "../db/connection.js";

// "Warm referral" pattern: candidate -> [WORKED_AT] -> sharedCompany <- [WORKED_AT] <-
// colleague -> [WORKED_AT] -> targetCompany. A 3-hop path meaning "this candidate
// overlapped with someone (the colleague) who has worked at the company posting
// this job."
//
// NOTE: excluding candidates who already worked at the target company directly
// used to be a `WHERE ... AND NOT (candidate)-[:WORKED_AT]->(targetCompany)`
// clause. Testing against the live CognoDB instance showed pattern-predicates
// like `NOT (a)-[:REL]->(b)` are not scoped to the specific bound nodes here —
// they evaluate as "does this relationship type exist anywhere," which is
// always true, so that clause silently zeroed out every result. Fetching the
// "already worked there" set with a plain MATCH (confirmed to scope correctly)
// and subtracting it in JS sidesteps the bug entirely.
async function fetchAlreadyAtTargetCompany(jobId) {
  const records = await runQuery(
    `MATCH (j:Job {id: $jobId})<-[:POSTED]-(co:Company)
     MATCH (cand:Candidate)-[:WORKED_AT]->(co)
     RETURN DISTINCT cand.id AS id`,
    { jobId }
  );
  return new Set(records.map((r) => r.get("id")));
}

async function fetchRawReferralPaths(jobId, limit) {
  return runQuery(
    `MATCH (j:Job {id: $jobId})<-[:POSTED]-(targetCompany:Company)
     MATCH (candidate:Candidate)-[:WORKED_AT]->(sharedCompany:Company)<-[:WORKED_AT]-(colleague:Candidate)-[:WORKED_AT]->(targetCompany)
     WHERE candidate <> colleague
     RETURN DISTINCT candidate.id AS candidateId, candidate.name AS name, candidate.headline AS headline,
            colleague.id AS colleagueId, colleague.name AS colleagueName,
            sharedCompany.name AS sharedCompanyName
     LIMIT $limit`,
    { jobId, limit: limit * 5 } // over-fetch raw paths, then collapse per-candidate below
  );
}

export async function getReferralPaths(jobId, { limit = 20 } = {}) {
  const [records, alreadyThere] = await Promise.all([
    fetchRawReferralPaths(jobId, limit),
    fetchAlreadyAtTargetCompany(jobId),
  ]);

  const byCandidate = new Map();
  for (const r of records) {
    const candidateId = r.get("candidateId");
    if (alreadyThere.has(candidateId)) continue; // already works there — no referral needed
    if (!byCandidate.has(candidateId)) {
      byCandidate.set(candidateId, {
        candidateId,
        name: r.get("name"),
        headline: r.get("headline"),
        paths: [],
      });
    }
    byCandidate.get(candidateId).paths.push({
      colleagueId: r.get("colleagueId"),
      colleagueName: r.get("colleagueName"),
      sharedCompanyName: r.get("sharedCompanyName"),
    });
  }

  return [...byCandidate.values()]
    .sort((a, b) => b.paths.length - a.paths.length)
    .slice(0, limit);
}
