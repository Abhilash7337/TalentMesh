import neo4j from "neo4j-driver";
import "dotenv/config";

const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = process.env;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
  throw new Error(
    "Missing NEO4J_URI, NEO4J_USER, or NEO4J_PASSWORD. Copy .env.example to .env and fill in your CognoDB credentials."
  );
}

// CognoDB speaks Bolt/openCypher, so the official Neo4j driver works unmodified.
// disableLosslessIntegers: without this, every integer property (yearsExperience,
// proficiency, count() results, etc.) comes back as a {low, high} Integer object
// instead of a plain JS number — this dataset never gets near the range where that
// precision would matter, so plain numbers are the right tradeoff for a readable API.
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

export async function verifyConnection() {
  await driver.verifyConnectivity();
}

export function getSession() {
  return driver.session();
}

export async function runQuery(cypher, params = {}) {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

export async function closeDriver() {
  await driver.close();
}

export default driver;
