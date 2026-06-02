// api/users.js
import { readEmployees } from "../lib/github-store.js";

const SF_BASE = "https://api10preview.sapsf.com";
 
function parseISO(s) {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
 
function toSFDate(isoStr) {
  // Convert "2026-05-12T19:11:50" → "\/Date(1747077110000)\/"
  const d = parseISO(isoStr);
  if (!d) return `\/Date(0)\/`;
  return `\/Date(${d.getTime()})\/`;
}
 
function applyFilters(employees, query) {
  const dtFrom = parseISO(query.modifiedfrom || query.modified_from);
  const dtTo   = parseISO(query.modifiedto   || query.modified_to);
 
  let result = employees.filter(emp => {
    const lm = parseISO(emp.lastModified);
    if (dtFrom && lm && lm < dtFrom) return false;
    if (dtTo   && lm && lm > dtTo)   return false;
    return true;
  });
 
  const total = result.length;
  const skip  = Math.max(0, parseInt(query["$skip"] || "0", 10));
  const top   = parseInt(query["$top"] || String(result.length), 10);
  result = result.slice(skip, skip + top);
  return { result, total };
}
 
function buildJSON(employees) {
  const results = employees.map(emp => ({
    __metadata: {
      uri:  `${SF_BASE}/odata/v2/User('${emp.userId}')`,
      type: "SFOData.User",
    },
    userId:       emp.userId,
    firstName:    emp.firstName,
    lastName:     emp.lastName,
    custom05:     emp.custom05,
    lastModified: toSFDate(emp.lastModified),
    email:        emp.email,
    status:       emp.status,
  }));
 
  return { d: { results } };
}
 
export default async function handler(req, res) {
  console.log("OData handler hit:", req.method, req.url, req.query);
  res.setHeader("Access-Control-Allow-Origin", "*");
 
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
 
  try {
    const { employees } = await readEmployees();
    console.log(`Loaded ${employees.length} employees`);
    const { result } = applyFilters(employees, req.query);
    res.setHeader("Content-Type", "application/json;charset=utf-8");
    return res.status(200).json(buildJSON(result));
  } catch (err) {
    console.error("OData error:", err);
    return res.status(500).json({ error: err.message });
  }
}