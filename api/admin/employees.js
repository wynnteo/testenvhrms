// api/admin/employees.js
import { readEmployees } from "../../lib/github-store.js";

// Starting point used only when there are no existing employees yet.
// Mirrors api/admin/action.js so suggestions stay in sync.
const USERID_START = 9990001;

function getNextUserId(employees) {
  let max = null;
  for (const emp of employees) {
    const n = parseInt(emp.userId, 10);
    if (!isNaN(n) && (max === null || n > max)) max = n;
  }
  return max === null ? String(USERID_START) : String(max + 1);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { employees } = await readEmployees();

    function safeTime(value) {
      const t = new Date(value).getTime();
      return isNaN(t) ? 0 : t;
    }
    const sorted = [...employees].sort(
      (a, b) => safeTime(b.lastModified) - safeTime(a.lastModified)
    );

    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const total      = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    return res.json({
      ok: true,
      employees: pageItems,
      total,
      page,
      pageSize,
      totalPages,
      // Computed against the FULL list, not just the current page.
      nextUserId: getNextUserId(employees),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}