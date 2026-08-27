// Reads the JSON files in seed/data/ and writes them into CognoDB as a graph.
// Every write below goes through the driver's parameter map ($rows) — Cypher
// text itself never contains data, only placeholders. That's what "no
// string-concatenated Cypher" means in practice.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getSession, verifyConnection, closeDriver } from "../src/db/connection.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
const RESET = process.argv.includes("--reset");
const BATCH_SIZE = 200;

const readJson = (name) => JSON.parse(readFileSync(join(DATA_DIR, name), "utf-8"));

// Runs one Cypher statement once per chunk of `rows`, passing each chunk as
// the $rows parameter for UNWIND. Chunking keeps each transaction small,
// which matters on CognoDB's free c0 tier (0.5 vCPU / 256 MB RAM) — one
// query trying to UNWIND thousands of rows at once risks timing out or
// exhausting memory on an instance that small.
async function runBatched(session, cypher, rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await session.run(cypher, { rows: chunk });
  }
}

async function main() {
  console.log("Verifying connection to CognoDB...");
  try {
    await verifyConnection();
  } catch (err) {
    console.error("Could not reach CognoDB. Check NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD in .env.");
    console.error(`  ${err.message}`);
    process.exitCode = 1;
    return;
  }
  console.log("Connected.");

  const skills = readJson("skills.json");
  const skillRelations = readJson("skill-relations.json");
  const companies = readJson("companies.json");
  const jobs = readJson("jobs.json");
  const candidates = readJson("candidates.json");

  const session = getSession();
  try {
    if (RESET) {
      console.log("--reset passed: wiping existing graph...");
      await session.run("MATCH (n) DETACH DELETE n");
    }

    console.log("Creating uniqueness constraints (id per node label)...");
    const constraints = [
      "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Candidate) REQUIRE c.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE",
      "CREATE CONSTRAINT IF NOT EXISTS FOR (co:Company) REQUIRE co.id IS UNIQUE",
    ];
    for (const stmt of constraints) {
      try {
        await session.run(stmt);
      } catch (err) {
        console.warn(`  constraint skipped (${err.message.split("\n")[0]})`);
      }
    }

    console.log("Loading nodes...");
    await runBatched(
      session,
      `UNWIND $rows AS row
       MERGE (s:Skill {id: row.id})
       SET s.name = row.name, s.category = row.category`,
      skills
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MERGE (c:Company {id: row.id})
       SET c.name = row.name, c.industry = row.industry`,
      companies
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MERGE (j:Job {id: row.id})
       SET j.title = row.title, j.seniority = row.seniority, j.location = row.location,
           j.status = row.status, j.postedDate = row.postedDate`,
      jobs
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MERGE (cand:Candidate {id: row.id})
       SET cand.name = row.name, cand.email = row.email, cand.location = row.location,
           cand.yearsExperience = row.yearsExperience, cand.headline = row.headline`,
      candidates
    );

    console.log("Loading relationships...");
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (co:Company {id: row.companyId}), (j:Job {id: row.id})
       MERGE (co)-[:POSTED]->(j)`,
      jobs
    );

    const requiresSkillRows = jobs.flatMap((j) =>
      j.requiresSkills.map((r) => ({ jobId: j.id, skillId: r.skillId, importance: r.importance, minYears: r.minYears }))
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (j:Job {id: row.jobId}), (s:Skill {id: row.skillId})
       MERGE (j)-[r:REQUIRES_SKILL]->(s)
       SET r.importance = row.importance, r.minYears = row.minYears`,
      requiresSkillRows
    );

    const hasSkillRows = candidates.flatMap((c) =>
      c.hasSkills.map((h) => ({ candidateId: c.id, skillId: h.skillId, proficiency: h.proficiency, yearsUsed: h.yearsUsed }))
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (cand:Candidate {id: row.candidateId}), (s:Skill {id: row.skillId})
       MERGE (cand)-[r:HAS_SKILL]->(s)
       SET r.proficiency = row.proficiency, r.yearsUsed = row.yearsUsed`,
      hasSkillRows
    );

    const workedAtRows = candidates.flatMap((c) =>
      c.workedAt.map((w) => ({ candidateId: c.id, companyId: w.companyId, role: w.role, startDate: w.startDate, endDate: w.endDate }))
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (cand:Candidate {id: row.candidateId}), (co:Company {id: row.companyId})
       MERGE (cand)-[r:WORKED_AT]->(co)
       SET r.role = row.role, r.startDate = row.startDate, r.endDate = row.endDate`,
      workedAtRows
    );

    const appliedToRows = candidates.flatMap((c) =>
      c.appliedTo.map((a) => ({ candidateId: c.id, jobId: a.jobId, appliedDate: a.appliedDate, status: a.status }))
    );
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (cand:Candidate {id: row.candidateId}), (j:Job {id: row.jobId})
       MERGE (cand)-[r:APPLIED_TO]->(j)
       SET r.appliedDate = row.appliedDate, r.status = row.status`,
      appliedToRows
    );

    // Symmetric: create the RELATED_TO edge in both directions so a
    // traversal doesn't need to care which skill was queried first.
    const relatedToRows = skillRelations.flatMap((r) => [
      { fromId: r.fromId, toId: r.toId, strength: r.strength },
      { fromId: r.toId, toId: r.fromId, strength: r.strength },
    ]);
    await runBatched(
      session,
      `UNWIND $rows AS row
       MATCH (a:Skill {id: row.fromId}), (b:Skill {id: row.toId})
       MERGE (a)-[r:RELATED_TO]->(b)
       SET r.strength = row.strength`,
      relatedToRows
    );

    console.log("Counting nodes and relationships...");
    const nodeCounts = await session.run(
      "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label"
    );
    const relCounts = await session.run(
      "MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY type"
    );

    console.log("\nNodes:");
    let totalNodes = 0;
    for (const record of nodeCounts.records) {
      const count = record.get("count").toNumber();
      totalNodes += count;
      console.log(`  ${record.get("label")}: ${count}`);
    }
    console.log(`  TOTAL: ${totalNodes}`);

    console.log("\nRelationships:");
    let totalRels = 0;
    for (const record of relCounts.records) {
      const count = record.get("count").toNumber();
      totalRels += count;
      console.log(`  ${record.get("type")}: ${count}`);
    }
    console.log(`  TOTAL: ${totalRels}`);

    console.log("\nSeed load complete.");
  } finally {
    await session.close();
  }
}

main()
  .catch((err) => {
    console.error("Seed load failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => closeDriver());
