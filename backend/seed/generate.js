// Generates realistic-looking seed data as JSON files under seed/data/.
// This is a one-time data-generation step, run manually (`npm run generate`),
// NOT part of the app's runtime — its only job is to produce the JSON files
// that load.js then reads and writes into CognoDB.
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SKILLS, SKILL_RELATIONS, ARCHETYPES, SOFT_SKILLS } from "./skills-catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "data");
mkdirSync(OUT_DIR, { recursive: true });

const CANDIDATE_COUNT = 200;
const COMPANY_TARGET = 27;
const JOB_TARGET = 75;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// --- Skills -----------------------------------------------------------
const skills = SKILLS.map((s, i) => ({ id: `skill-${String(i + 1).padStart(3, "0")}`, ...s }));
const skillIdByName = Object.fromEntries(skills.map((s) => [s.name, s.id]));

const skillRelations = SKILL_RELATIONS.map(([a, b, strength]) => ({
  fromId: skillIdByName[a],
  toId: skillIdByName[b],
  strength,
}));

// --- Companies ----------------------------------------------------------
const COMPANY_POOL = [
  ["Nimbus Cloud Systems", "Cloud Infrastructure"],
  ["Bluepeak Analytics", "Data & Analytics"],
  ["Vantage Health Tech", "Healthcare"],
  ["Ledgerline Fintech", "Fintech"],
  ["Orbital Commerce", "E-commerce"],
  ["Fernwood Robotics", "Robotics"],
  ["Cobalt Gaming Studios", "Gaming"],
  ["Meridian EdLabs", "EdTech"],
  ["Ironclad Security", "Cybersecurity"],
  ["Portside Logistics", "Logistics"],
  ["Helix Biotech", "Biotech"],
  ["Stratos Media Group", "Media"],
  ["Anchorpoint Insurance", "Insurance"],
  ["Driftwood Travel Co.", "Travel"],
  ["Solace Wellness", "Health & Wellness"],
  ["Cascade Energy Systems", "Energy"],
  ["Brightline Mobility", "Transportation"],
  ["Kestrel Aerospace", "Aerospace"],
  ["Thistle & Co. Retail", "Retail"],
  ["Northfield Agritech", "Agriculture Tech"],
  ["Pinehurst Legal Tech", "LegalTech"],
  ["Amberlight Studios", "Creative & Design"],
  ["Redwood Cloud Data", "Cloud Infrastructure"],
  ["Talon Cyber Defense", "Cybersecurity"],
  ["Glasswing Marketing", "Marketing Tech"],
  ["Underline Payments", "Fintech"],
  ["Vesper Analytics", "Data & Analytics"],
].slice(0, COMPANY_TARGET);

const companies = COMPANY_POOL.map(([name, industry], i) => ({
  id: `company-${String(i + 1).padStart(3, "0")}`,
  name,
  industry,
}));

// --- Jobs -----------------------------------------------------------
const LOCATIONS = ["Austin, TX", "Seattle, WA", "San Francisco, CA", "New York, NY", "Boston, MA", "Denver, CO", "Chicago, IL", "Atlanta, GA", "Remote", "Toronto, ON", "London, UK", "Berlin, DE", "Bangalore, IN", "Portland, OR", "Raleigh, NC"];
const SENIORITIES = ["Junior", "Mid", "Senior", "Staff", "Lead"];
const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

const jobs = [];
let jobCounter = 1;
for (const company of companies) {
  const jobsForThisCompany = randInt(2, 4);
  for (let i = 0; i < jobsForThisCompany && jobs.length < JOB_TARGET; i++) {
    const archetypeKey = pick(ARCHETYPE_KEYS);
    const archetype = ARCHETYPES[archetypeKey];
    const seniority = pick(SENIORITIES);
    const title = `${seniority} ${pick(archetype.titles)}`;

    const requiredCount = randInt(2, 4);
    const required = pickN(archetype.skills, requiredCount).map((name) => ({
      skillId: skillIdByName[name],
      importance: "required",
      minYears: randInt(1, 5),
    }));
    const niceToHaveCount = randInt(1, 2);
    const pool = [...archetype.skills.filter((s) => !required.some((r) => r.skillId === skillIdByName[s])), ...SOFT_SKILLS];
    const niceToHave = pickN(pool, niceToHaveCount).map((name) => ({
      skillId: skillIdByName[name],
      importance: "nice-to-have",
      minYears: randInt(0, 2),
    }));

    jobs.push({
      id: `job-${String(jobCounter).padStart(3, "0")}`,
      title,
      seniority,
      location: pick(LOCATIONS),
      status: Math.random() < 0.8 ? "open" : "closed",
      postedDate: daysAgo(randInt(1, 120)),
      companyId: company.id,
      requiresSkills: [...required, ...niceToHave],
      _archetype: archetypeKey, // internal only — stripped before writing JSON
    });
    jobCounter++;
  }
}

// --- Candidates -----------------------------------------------------------
const FIRST_NAMES = ["Aditi", "Liam", "Sofia", "Noah", "Mei", "Ethan", "Priya", "Lucas", "Zoe", "Arjun", "Emma", "Kenji", "Isla", "Mateo", "Amara", "Oliver", "Nina", "Diego", "Hana", "Caleb", "Fatima", "Owen", "Leah", "Ravi", "Ava", "Samuel", "Ines", "Jonas", "Mira", "Elias", "Tara", "Felix", "Yuki", "Grace", "Rohan", "Chloe", "Anders", "Layla", "Marcus", "Naomi"];
const LAST_NAMES = ["Sharma", "Nguyen", "Garcia", "Müller", "Kim", "Johnson", "Patel", "Rossi", "Andersson", "Silva", "Chen", "Okafor", "Kowalski", "Tanaka", "Reyes", "Novak", "Haddad", "Larsen", "Fischer", "Costa", "Ibrahim", "Sato", "Dubois", "Petrov", "Adeyemi", "Hansen", "Moreno", "Weber", "Yamada", "Cohen"];
const GENERIC_ROLE_TITLES = ["Software Engineer", "Senior Software Engineer", "Engineering Intern", "Software Developer", "Technical Lead"];

const candidates = [];
for (let i = 1; i <= CANDIDATE_COUNT; i++) {
  const id = `candidate-${String(i).padStart(4, "0")}`;
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
  const yearsExperience = randInt(0, 15);

  const primaryKey = pick(ARCHETYPE_KEYS);
  const hasSecondary = Math.random() < 0.3;
  const secondaryKey = hasSecondary ? pick(ARCHETYPE_KEYS.filter((k) => k !== primaryKey)) : null;
  const skillPool = [
    ...ARCHETYPES[primaryKey].skills,
    ...(secondaryKey ? ARCHETYPES[secondaryKey].skills : []),
  ];
  const seniorityWord = yearsExperience < 2 ? "Junior" : yearsExperience < 6 ? "" : yearsExperience < 10 ? "Senior" : "Staff";
  const headline = `${seniorityWord ? seniorityWord + " " : ""}${pick(ARCHETYPES[primaryKey].titles)}`.trim();

  const hardSkillCount = randInt(3, 7);
  const hardSkills = pickN([...new Set(skillPool)], Math.min(hardSkillCount, new Set(skillPool).size));
  const includeSoft = Math.random() < 0.7;
  const chosenSkillNames = includeSoft ? [...hardSkills, pick(SOFT_SKILLS)] : hardSkills;

  const hasSkills = chosenSkillNames.map((name) => ({
    skillId: skillIdByName[name],
    proficiency: Math.min(5, Math.max(1, randInt(1, 5) + (yearsExperience > 8 ? 1 : 0))),
    yearsUsed: Math.max(1, Math.min(yearsExperience, randInt(1, 6))),
  }));

  // Work history: 1-3 past/current roles with non-overlapping, backward-stepping date ranges.
  const workedAtCount = randInt(1, Math.min(3, Math.max(1, Math.ceil(yearsExperience / 3))));
  const workCompanies = pickN(companies, workedAtCount);
  let cursorDaysAgo = 0;
  const workedAt = workCompanies.map((company, idx) => {
    const stintDays = randInt(180, 900);
    const startDaysAgo = cursorDaysAgo + stintDays;
    const entry = {
      companyId: company.id,
      role: pick(GENERIC_ROLE_TITLES),
      startDate: daysAgo(startDaysAgo),
      endDate: idx === 0 ? null : daysAgo(cursorDaysAgo + 1),
    };
    cursorDaysAgo = startDaysAgo;
    return entry;
  });

  // Applications: bias toward jobs matching the candidate's own archetype(s),
  // so APPLIED_TO isn't pure noise either.
  const relevantJobs = jobs.filter((j) => j._archetype === primaryKey || j._archetype === secondaryKey);
  const applyPool = relevantJobs.length ? relevantJobs : jobs;
  const appliedTo = pickN(applyPool, randInt(0, 4)).map((job) => {
    const roll = Math.random();
    const status = roll < 0.4 ? "applied" : roll < 0.65 ? "interviewing" : roll < 0.9 ? "rejected" : "hired";
    return { jobId: job.id, appliedDate: daysAgo(randInt(1, 90)), status };
  });

  candidates.push({
    id,
    name,
    email,
    location: pick(LOCATIONS),
    yearsExperience,
    headline,
    hasSkills,
    workedAt,
    appliedTo,
  });
}

// Strip internal-only fields before writing.
const jobsOut = jobs.map(({ _archetype, ...rest }) => rest);

writeFileSync(join(OUT_DIR, "skills.json"), JSON.stringify(skills, null, 2));
writeFileSync(join(OUT_DIR, "skill-relations.json"), JSON.stringify(skillRelations, null, 2));
writeFileSync(join(OUT_DIR, "companies.json"), JSON.stringify(companies, null, 2));
writeFileSync(join(OUT_DIR, "jobs.json"), JSON.stringify(jobsOut, null, 2));
writeFileSync(join(OUT_DIR, "candidates.json"), JSON.stringify(candidates, null, 2));

console.log("Generated seed data:");
console.log(`  skills.json           ${skills.length} skills`);
console.log(`  skill-relations.json  ${skillRelations.length} relations`);
console.log(`  companies.json        ${companies.length} companies`);
console.log(`  jobs.json             ${jobsOut.length} jobs`);
console.log(`  candidates.json       ${candidates.length} candidates`);
