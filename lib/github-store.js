// lib/github-store.js
// Reads and writes employees.txt in your GitHub repo as persistent storage.

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO  = process.env.GITHUB_REPO;   // e.g. "yourname/mock-sf"
const DATA_PATH    = process.env.DATA_PATH || "employees.txt";
const BRANCH       = process.env.GITHUB_BRANCH || "main";

const API_BASE = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_PATH}`;

const headers = {
  "Authorization": `Bearer ${GITHUB_TOKEN}`,
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

export async function readEmployees() {
  const res = await fetch(`${API_BASE}?ref=${BRANCH}`, { headers });
  if (res.status === 404) return { employees: defaultEmployees(), sha: null };
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { employees: JSON.parse(content), sha: data.sha };
}

export async function writeEmployees(employees, sha) {
  const content = Buffer.from(JSON.stringify(employees, null, 2)).toString("base64");
  const body = {
    message: `chore: update employees [skip ci]`,
    content,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(API_BASE, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed: ${res.status} ${err}`);
  }
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
