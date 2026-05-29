// api/admin/employees.js
import { readEmployees } from "../../lib/github-store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { employees } = await readEmployees();
    return res.json({ ok: true, employees });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
