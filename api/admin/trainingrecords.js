// api/admin/trainingrecords.js
// Returns training records accepted by /api/learningrecords, paginated.

import { readTrainingRecords } from "../../lib/github-store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { records } = await readTrainingRecords();

    // Most recently received first.
    const sorted = [...records].sort(
      (a, b) => new Date(b.receivedAt || 0) - new Date(a.receivedAt || 0)
    );

    const page     = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const total      = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    return res.json({
      ok: true,
      records: pageItems,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}