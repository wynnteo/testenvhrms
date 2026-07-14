// lib/github-store.js
// Reads and writes employees.txt / trainingrecords.txt in your GitHub repo
// as persistent storage (no database needed).

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO  = process.env.GITHUB_REPO;   // e.g. "yourname/mock-sf"
const BRANCH        = process.env.GITHUB_BRANCH || "main";

const EMPLOYEES_PATH = process.env.DATA_PATH || "employees.txt";
const TRAINING_PATH  = process.env.TRAINING_DATA_PATH || "trainingrecords.txt";

const headers = {
  "Authorization": `Bearer ${GITHUB_TOKEN}`,
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

function apiBaseFor(path) {
  return `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
}

// Generic read: fetches a JSON-encoded file from the repo.
// Returns { data, sha }. If the file doesn't exist yet, returns the
// provided default and sha: null (first write will create the file).
// If the file exists but is empty or not valid JSON (e.g. created by hand,
// or left over from an interrupted write), falls back to the default too,
// rather than crashing the whole endpoint.
async function readJSONFile(path, getDefault) {
  const res = await fetch(`${apiBaseFor(path)}?ref=${BRANCH}`, { headers });
  if (res.status === 404) return { data: getDefault(), sha: null };
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8").trim();

  if (!content) {
    return { data: getDefault(), sha: data.sha };
  }

  try {
    return { data: JSON.parse(content), sha: data.sha };
  } catch (err) {
    console.error(`Stored data at ${path} is not valid JSON, falling back to default:`, err.message);
    return { data: getDefault(), sha: data.sha };
  }
}

// Generic write: writes a JSON-encoded file back to the repo.
async function writeJSONFile(path, value, sha, message) {
  const content = Buffer.from(JSON.stringify(value, null, 2)).toString("base64");
  const body = {
    message,
    content,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(apiBaseFor(path), {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed: ${res.status} ${err}`);
  }
}

export async function readEmployees() {
  const { data, sha } = await readJSONFile(EMPLOYEES_PATH, defaultEmployees);
  return { employees: data, sha };
}

export async function writeEmployees(employees, sha) {
  await writeJSONFile(EMPLOYEES_PATH, employees, sha, `chore: update employees [skip ci]`);
}

// Training records (learningrecords endpoint) — stored separately so it
// doesn't collide with employees.txt.
export async function readTrainingRecords() {
  const { data, sha } = await readJSONFile(TRAINING_PATH, () => []);
  return { records: data, sha };
}

export async function writeTrainingRecords(records, sha) {
  await writeJSONFile(TRAINING_PATH, records, sha, `chore: update training records [skip ci]`);
}

function defaultEmployees() {
  const now = new Date().toISOString().replace("T", "T").split(".")[0];
  return [
    { userId: "3010190", firstName: "MOY CHAI",        lastName: "Leo",   email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-12T19:11:50", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "3003593", firstName: "YONG SENG",       lastName: "Lim",   email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-14T19:12:12", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "3003600", firstName: "Geck Khuan",      lastName: "Abas",  email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-14T19:12:12", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "2350493", firstName: "Hannah",          lastName: "LEE",   email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-16T19:11:55", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "2350716", firstName: "GEK HENG",        lastName: "LEE",   email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-16T19:11:55", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "2350822", firstName: "Chee Fun",        lastName: "Aw",    email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-16T19:11:55", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "3010322", firstName: "Daashini",        lastName: "TEO",   email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-16T19:11:56", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "2350596", firstName: "Choon Tiong",     lastName: "Tay",   email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-17T19:11:59", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "2350604", firstName: "REN JIE JONATHAN",lastName: "NG",    email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-17T19:11:59", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "2350802", firstName: "Tamara Ana",      lastName: "NG",    email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-17T19:12:00", custom05: "NTUC LearningHub Pte Ltd (L100)" },
    { userId: "3003477", firstName: "MINLIANG",        lastName: "MUHD",  email: "dummy@successfactors.com", status: "t", lastModified: "2026-05-17T19:12:00", custom05: "NTUC LearningHub Pte Ltd (L100)" },
  ];
}