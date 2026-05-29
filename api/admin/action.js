// api/admin/action.js
// Handles all employee mutation actions from the admin UI.

import { readEmployees, writeEmployees } from "../../lib/github-store.js";

function nowISO() {
  return new Date().toISOString().replace(/\.\d+Z$/, "").replace("T", "T");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { action, userId, firstName, lastName, email, custom05 } = body || {};

  try {
    const { employees, sha } = await readEmployees();

    if (action === "add") {
      if (!userId || !firstName || !lastName) {
        return res.status(400).json({ ok: false, error: "userId, firstName, lastName required" });
      }
      if (employees.find(e => e.userId === userId)) {
        return res.status(400).json({ ok: false, error: `User ID ${userId} already exists` });
      }
      employees.push({
        userId,
        firstName,
        lastName,
        email: email || "dummy@successfactors.com",
        custom05: custom05 || "NTUC LearningHub Pte Ltd (L100)",
        status: "t",
        lastModified: nowISO(),
      });
      await writeEmployees(employees, sha);
      return res.json({ ok: true, message: `Employee ${firstName} ${lastName} hired` });
    }

    if (action === "terminate") {
      const emp = employees.find(e => e.userId === userId);
      if (!emp) return res.status(404).json({ ok: false, error: "Employee not found" });
      emp.status = "f";
      emp.lastModified = nowISO();
      await writeEmployees(employees, sha);
      return res.json({ ok: true, message: `Employee ${userId} terminated` });
    }

    if (action === "activate") {
      const emp = employees.find(e => e.userId === userId);
      if (!emp) return res.status(404).json({ ok: false, error: "Employee not found" });
      emp.status = "t";
      emp.lastModified = nowISO();
      await writeEmployees(employees, sha);
      return res.json({ ok: true, message: `Employee ${userId} re-hired` });
    }

    if (action === "delete") {
      const idx = employees.findIndex(e => e.userId === userId);
      if (idx === -1) return res.status(404).json({ ok: false, error: "Employee not found" });
      employees.splice(idx, 1);
      await writeEmployees(employees, sha);
      return res.json({ ok: true, message: `Employee ${userId} deleted` });
    }

    return res.status(400).json({ ok: false, error: "Unknown action" });

  } catch (err) {
    console.error("Admin action error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
