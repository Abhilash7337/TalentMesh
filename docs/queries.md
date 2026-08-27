# TalentMesh — Main Queries Explained

Five queries exercise the graph in ways a relational schema would find awkward or couldn't
express in a single traversal. Basic CRUD (list/detail for candidates and jobs) is covered in
`backend/src/services/candidate.service.js` and `job.service.js` and isn't repeated here.

## 1. Recommended candidates for a job (the flagship query)

**Endpoint:** `GET /jobs/:id/recommended-candidates`
**Service:** `backend/src/services/recommendation.service.js`

```cypher
MATCH (j:Job {id: $jobId})-[req:REQUIRES_SKILL]->(reqSkill:Skill)
MATCH p = (reqSkill)-[:RELATED_TO*0..2]-(reachSkill:Skill)
MATCH (cand:Candidate)-[has:HAS_SKILL]->(reachSkill)
RETURN cand.id AS candidateId, cand.name AS name, cand.headline AS headline,
       reqSkill.id AS requiredSkillId, reqSkill.name AS requiredSkillName,
       req.importance AS importance,
       reachSkill.name AS viaSkillName, length(p) AS hopDistance,
       reduce(s = 1.0, rel IN relationships(p) | s * rel.strength) AS pathStrength,
       has.proficiency AS proficiency
```

**What it returns:** every (candidate, required-skill) pair reachable through the required
skill's 0-2 hop neighborhood in the `RELATED_TO` graph, with the hop distance and the product of
`strength` values along that path. `*0..2` covers hop 0 (the candidate holds the exact skill),
1, and 2 in one traversal.

**Why it's graph-native:** ranking candidates by *adjacent*, not just exact, skill overlap is a
multi-hop traversal through a weighted adjacency graph. In SQL, the same idea needs a recursive
CTE walking a self-referencing `skill_relations` edge table to depth 2, joined back to a
`candidate_skills` table, with the path-strength product carried through each recursion level and
duplicate paths de-duplicated by hand — a graph engine expresses this as one pattern clause.

**Scoring (done in JS, not Cypher):** for each required skill, the best-scoring path is kept
(`pathStrength × hopDecay × proficiency/5 × importanceWeight`, decay = 1.0/0.6/0.3 for hop 0/1/2),
scores are summed across required skills, then expressed as a 0-100 `matchPercent` against the
maximum possible score. The API response includes a `matchBreakdown` per required skill — matched
or not, direct or via which related skill, at what hop — so the UI can show *why* a candidate
scored the way they did, not just a bare number.

## 2. Skill-gap analysis

**Endpoint:** `GET /candidates/:id/skill-gap/:jobId`
**Service:** `backend/src/services/skillGap.service.js`

Three plain queries, joined in JS: (1) the job's required skills, (2) which of those the
candidate already holds directly, (3) for the remainder — the gaps — which of the candidate's
*other* skills sit within 1-2 `RELATED_TO` hops of a missing skill (their "head start").

```cypher
-- head-start lookup, once the gap list is known
MATCH (cand:Candidate {id: $candidateId})-[ownedHas:HAS_SKILL]->(owned:Skill)
MATCH p = (owned)-[:RELATED_TO*1..2]-(gap:Skill)
WHERE gap.id IN $gapSkillIds
RETURN gap.id AS skillId, owned.name AS viaSkillName, length(p) AS hopDistance,
       reduce(s = 1.0, rel IN relationships(p) | s * rel.strength) AS pathStrength,
       ownedHas.proficiency AS viaProficiency
```

**What it returns:** three buckets — skills already held, hard gaps (missing, no nearby skill),
and head-start gaps (missing, but the candidate has something adjacent, named, with hop distance).

**Why it's graph-native:** "what's missing, but almost covered by what you already know" is the
same weighted-adjacency traversal as query 1, reframed as a gap report instead of a ranking.

## 3. Referral paths into a company

**Endpoint:** `GET /jobs/:id/referral-paths`
**Service:** `backend/src/services/referral.service.js`

```cypher
MATCH (j:Job {id: $jobId})<-[:POSTED]-(targetCompany:Company)
MATCH (candidate:Candidate)-[:WORKED_AT]->(sharedCompany:Company)<-[:WORKED_AT]-(colleague:Candidate)-[:WORKED_AT]->(targetCompany)
WHERE candidate <> colleague
RETURN DISTINCT candidate.id AS candidateId, candidate.name AS name, candidate.headline AS headline,
       colleague.id AS colleagueId, colleague.name AS colleagueName,
       sharedCompany.name AS sharedCompanyName
LIMIT $limit
```
(Candidates who already worked at the target company directly are excluded — see the engine-quirk
note below for why that exclusion is done in JS rather than in this query.)

**What it returns:** a 3-hop path — candidate → a company they share with some colleague →
that colleague → the company posting this job — meaning "this candidate has a warm path in
through someone who's worked at the hiring company."

**Why it's graph-native:** this is a multi-hop *path* query, not a lookup. In SQL it's a
self-join of a `work_history` table against itself twice with an anti-join to exclude direct
hires — expressible, but the intent ("a path of shared employment history") is far more legible
as a graph pattern than as three joined copies of the same table.

## 4. Trending / co-occurring skills

**Endpoint:** `GET /skills/trending` (optionally `?skillId=` for one skill's companions)
**Service:** `backend/src/services/trending.service.js`

```cypher
-- companions of one specific skill
MATCH (s:Skill {id: $skillId})<-[:HAS_SKILL]-(cand:Candidate)-[:HAS_SKILL]->(other:Skill)
WHERE other <> s
RETURN other.id AS skillId, other.name AS skillName, other.category AS category,
       count(DISTINCT cand) AS coOccurrenceCount
ORDER BY coOccurrenceCount DESC LIMIT $limit

-- global top co-occurring pairs
MATCH (s1:Skill)<-[:HAS_SKILL]-(cand:Candidate)-[:HAS_SKILL]->(s2:Skill)
WHERE s1.id < s2.id
RETURN s1.id AS skillAId, s1.name AS skillAName, s2.id AS skillBId, s2.name AS skillBName,
       count(DISTINCT cand) AS coOccurrenceCount
ORDER BY coOccurrenceCount DESC LIMIT $limit
```

**What it returns:** "people with X often also have Y" — either for one named skill, or the
overall top co-occurring pairs across all candidates.

**Why it's graph-native:** a 2-hop pattern through the shared `Candidate` node. The SQL
equivalent is a self-join of `candidate_skills` on `candidate_id`, which works for pairs but gets
markedly worse if the analysis ever needs to extend past 2 hops (e.g. "skills 2 people removed").

## An important engine-specific finding (worth defending in review)

While building queries 2 and 3, testing directly against the live CognoDB instance surfaced a
real deviation from standard Cypher behavior: **pattern-predicates used as booleans — `NOT (a)-[:REL]->(b)`,
or a property filter on the *far* node of an `OPTIONAL MATCH` — are not scoped to the specific
bound nodes in this engine.** A query like
`WHERE NOT (candidate)-[:WORKED_AT]->(targetCompany)`, with both `candidate` and `targetCompany`
already bound to specific nodes, was observed answering "does a `WORKED_AT` relationship exist
*anywhere* in the graph" rather than "between these two specific nodes" — which is always true,
so it silently zeroed out every result instead of erroring.

This was caught by testing each query against real data and checking the actual output, not by
inspecting the Cypher for syntactic correctness — the queries were syntactically valid and ran
without error; they just returned the wrong (empty, in this case) answer. The fix, applied in
`skillGap.service.js` and `referral.service.js`, was to route around the affected shapes entirely:
fetch the relevant node sets with plain (non-optional, non-negated) `MATCH` queries — confirmed by
direct testing to scope correctly — and do the set-difference/exclusion logic in JS. `OPTIONAL
MATCH` with an *unfiltered* far node (used in candidate/job detail lookups) and plain `MATCH`
chains with a `WHERE ... IN` filter on a far node both tested correctly and are used freely.
