// api/count.js
// Returns total employee count, optionally filtered by modifiedfrom/modifiedto

import { readEmployees } from "../lib/github-store.js";

function parseISO(s) {
  if (!s) return null;
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { employees } = await readEmployees();

    const dtFrom = parseISO(req.query.modifiedfrom || req.query.modified_from);
    const dtTo   = parseISO(req.query.modifiedto   || req.query.modified_to);

    const count = employees.filter(emp => {
      const lm = parseISO(emp.lastModified);
      if (dtFrom && lm && lm < dtFrom) return false;
      if (dtTo   && lm && lm > dtTo)   return false;
      return true;
    }).length;

    // Return plain text integer, same as real SF $count
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(String(count));
  } catch (err) {
    console.error("Count error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}