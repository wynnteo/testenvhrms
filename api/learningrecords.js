// api/learningrecords.js
// Mocks: POST /hrms/hrmshub/api/v1/hrms/company/{hrms_org_code}/learningrecords
//
// This does NOT hit SuccessFactors — it emulates your own HRMS Hub Lambda's
// contract, so you can point your caller at this mock instead of SIT.
//
// Behavior mirrors post_employees_training_records() in the real Lambda:
//   - employeeId is required
//   - elementId is required (use "0" for new records, matching real SF)
//   - "duration" must parse as a number (Edm.Double)
//   - only the first validation failure is reported per record (like real SF)
//   - response echoes employeeId / elementId / referenceId per record
//   - accepted records are appended to trainingrecords.txt for inspection

import { readTrainingRecords, writeTrainingRecords } from "../lib/github-store.js";

function isPresent(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isValidDuration(value) {
  if (!isPresent(value)) return false;
  const n = parseFloat(value);
  return !isNaN(n) && isFinite(n);
}

// Returns an error message for the first failing validation, or null if the
// record passes. Mirrors real SF's behavior of reporting one error at a time.
function validateRecord(rec) {
  if (!isPresent(rec.employeeId)) {
    return `Property employeeId is required.`;
  }
  if (!isPresent(rec.elementId)) {
    return `Property elementId is required.`;
  }
  if (!isValidDuration(rec.duration)) {
    return `Property duration has invalid value. For input string: "${rec.duration}", required type is Edm.Double.`;
  }
  return null;
}

export default async function handler(req, res) {
  console.log("learningrecords handler hit:", req.method, req.url, req.query);
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const hrmsOrgCode = req.query.hrms_org_code || "";
  if (!hrmsOrgCode) {
    return res.status(400).json({ error: "Failure", detail: "URL missing hrmsOrgCode" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const records = (body && body.records) || [];
  if (!records.length) {
    return res.status(400).json({ error: "Failure", detail: "records is required" });
  }

  try {
    const { records: stored, sha } = await readTrainingRecords();
    const receivedAt = new Date().toISOString();

    const results = [];
    const accepted = [];

    for (const rec of records) {
      const result = {
        employeeId: rec.employeeId,
        elementId: rec.elementId || "0",
      };

      const error = validateRecord(rec);
      if (error) {
        result.error = error;
      } else {
        accepted.push({ ...rec, hrmsOrgCode, receivedAt });
      }

      if (rec.referenceId) result.referenceId = rec.referenceId;

      results.push(result);
    }

    if (accepted.length) {
      await writeTrainingRecords([...stored, ...accepted], sha);
    }

    return res.status(200).json({
      employees: results,
      count: results.length,
      hrmsOrgCode,
    });
  } catch (err) {
    console.error("learningrecords error:", err);
    return res.status(500).json({ error: "Failure", detail: "Error while updating" });
  }
}