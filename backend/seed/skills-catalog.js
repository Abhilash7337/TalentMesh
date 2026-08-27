// Hand-curated skill catalog and skill-adjacency graph.
// This is the one part of the seed data that is NOT randomly generated — the
// RELATED_TO edges below encode genuine skill relationships (React really is
// related to JavaScript; PostgreSQL really is related to SQL). Phase 3's
// multi-hop queries are only interesting because these edges mean something.

export const SKILLS = [
  // language
  { name: "JavaScript", category: "language" },
  { name: "TypeScript", category: "language" },
  { name: "Python", category: "language" },
  { name: "Java", category: "language" },
  { name: "Go", category: "language" },
  { name: "Rust", category: "language" },
  { name: "C++", category: "language" },
  { name: "C#", category: "language" },
  { name: "Ruby", category: "language" },
  { name: "PHP", category: "language" },
  // framework
  { name: "React", category: "framework" },
  { name: "Vue.js", category: "framework" },
  { name: "Angular", category: "framework" },
  { name: "Next.js", category: "framework" },
  { name: "Node.js", category: "framework" },
  { name: "Express", category: "framework" },
  { name: "Django", category: "framework" },
  { name: "Flask", category: "framework" },
  { name: "Spring Boot", category: "framework" },
  { name: "FastAPI", category: "framework" },
  // cloud
  { name: "AWS", category: "cloud" },
  { name: "Azure", category: "cloud" },
  { name: "GCP", category: "cloud" },
  { name: "Docker", category: "cloud" },
  { name: "Kubernetes", category: "cloud" },
  { name: "Terraform", category: "cloud" },
  { name: "CI/CD", category: "cloud" },
  { name: "Serverless", category: "cloud" },
  // database
  { name: "PostgreSQL", category: "database" },
  { name: "MySQL", category: "database" },
  { name: "MongoDB", category: "database" },
  { name: "Redis", category: "database" },
  { name: "SQL", category: "database" },
  { name: "Database Design", category: "database" },
  { name: "Elasticsearch", category: "database" },
  { name: "GraphQL", category: "database" },
  // data-ml
  { name: "Machine Learning", category: "data-ml" },
  { name: "TensorFlow", category: "data-ml" },
  { name: "PyTorch", category: "data-ml" },
  { name: "Pandas", category: "data-ml" },
  { name: "Data Analysis", category: "data-ml" },
  { name: "NLP", category: "data-ml" },
  { name: "Computer Vision", category: "data-ml" },
  { name: "Data Visualization", category: "data-ml" },
  // soft-skill
  { name: "Communication", category: "soft-skill" },
  { name: "Leadership", category: "soft-skill" },
  { name: "Teamwork", category: "soft-skill" },
  { name: "Problem Solving", category: "soft-skill" },
  { name: "Time Management", category: "soft-skill" },
  { name: "Mentoring", category: "soft-skill" },
  { name: "Agile/Scrum", category: "soft-skill" },
  { name: "Public Speaking", category: "soft-skill" },
];

// Each entry is one undirected adjacency; the loader creates the RELATED_TO
// relationship in both directions so traversal doesn't care which way you start.
export const SKILL_RELATIONS = [
  // frontend cluster
  ["JavaScript", "TypeScript", 0.9],
  ["JavaScript", "React", 0.85],
  ["JavaScript", "Vue.js", 0.8],
  ["JavaScript", "Node.js", 0.85],
  ["TypeScript", "React", 0.8],
  ["TypeScript", "Angular", 0.85],
  ["TypeScript", "Next.js", 0.75],
  ["React", "Next.js", 0.9],
  ["Vue.js", "TypeScript", 0.6],
  ["Angular", "JavaScript", 0.7],
  ["React", "GraphQL", 0.4],
  // backend cluster
  ["Node.js", "Express", 0.9],
  ["Express", "MongoDB", 0.6],
  ["Express", "PostgreSQL", 0.55],
  ["Node.js", "GraphQL", 0.5],
  ["Node.js", "MongoDB", 0.55],
  ["Python", "Django", 0.9],
  ["Python", "Flask", 0.85],
  ["Python", "FastAPI", 0.85],
  ["Django", "PostgreSQL", 0.6],
  ["Flask", "SQL", 0.5],
  ["Java", "Spring Boot", 0.9],
  ["Spring Boot", "PostgreSQL", 0.55],
  ["PHP", "MySQL", 0.6],
  ["C#", "SQL", 0.5],
  ["Rust", "Go", 0.4],
  ["C++", "Rust", 0.4],
  // cloud / devops cluster
  ["Docker", "Kubernetes", 0.9],
  ["Kubernetes", "Terraform", 0.6],
  ["Docker", "CI/CD", 0.7],
  ["Kubernetes", "AWS", 0.6],
  ["Docker", "AWS", 0.6],
  ["Terraform", "AWS", 0.65],
  ["AWS", "Azure", 0.4],
  ["AWS", "GCP", 0.4],
  ["Azure", "GCP", 0.35],
  ["CI/CD", "Kubernetes", 0.55],
  ["Serverless", "AWS", 0.6],
  ["Serverless", "GCP", 0.5],
  // database cluster
  ["PostgreSQL", "SQL", 0.95],
  ["MySQL", "SQL", 0.95],
  ["SQL", "Database Design", 0.85],
  ["PostgreSQL", "Database Design", 0.8],
  ["MongoDB", "Database Design", 0.6],
  ["Redis", "Database Design", 0.5],
  ["Elasticsearch", "Database Design", 0.55],
  // data-ml cluster
  ["Python", "Machine Learning", 0.9],
  ["Machine Learning", "TensorFlow", 0.9],
  ["Machine Learning", "PyTorch", 0.9],
  ["Machine Learning", "Data Analysis", 0.7],
  ["Python", "Pandas", 0.85],
  ["Pandas", "Data Analysis", 0.85],
  ["Data Analysis", "SQL", 0.6],
  ["Machine Learning", "NLP", 0.7],
  ["Machine Learning", "Computer Vision", 0.7],
  ["Data Analysis", "Data Visualization", 0.7],
  ["Python", "Data Visualization", 0.5],
  // soft-skill cluster
  ["Leadership", "Mentoring", 0.8],
  ["Leadership", "Communication", 0.6],
  ["Communication", "Public Speaking", 0.7],
  ["Teamwork", "Communication", 0.6],
  ["Agile/Scrum", "Teamwork", 0.6],
  ["Agile/Scrum", "Time Management", 0.5],
  ["Problem Solving", "Communication", 0.4],
  ["Leadership", "Agile/Scrum", 0.5],
];

// Archetypes drive BOTH job requirements and candidate specialties, so the
// two sides of the graph line up realistically instead of being independent
// random noise. `titles` feed job titles and candidate headlines/roles.
export const ARCHETYPES = {
  frontend: {
    skills: ["JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular"],
    titles: ["Frontend Engineer", "UI Engineer", "Frontend Developer"],
  },
  backend: {
    skills: ["Node.js", "Express", "Python", "Django", "Flask", "FastAPI", "Java", "Spring Boot", "PostgreSQL", "SQL", "MySQL"],
    titles: ["Backend Engineer", "Backend Developer", "API Engineer"],
  },
  fullstack: {
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "Express", "PostgreSQL", "SQL"],
    titles: ["Full-Stack Engineer", "Full-Stack Developer"],
  },
  devops: {
    skills: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD", "Serverless"],
    titles: ["DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer"],
  },
  data: {
    skills: ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Pandas", "Data Analysis", "NLP", "Computer Vision", "SQL", "Data Visualization"],
    titles: ["Data Scientist", "Machine Learning Engineer", "Data Analyst"],
  },
};

export const SOFT_SKILLS = ["Communication", "Leadership", "Teamwork", "Problem Solving", "Time Management", "Mentoring", "Agile/Scrum", "Public Speaking"];
