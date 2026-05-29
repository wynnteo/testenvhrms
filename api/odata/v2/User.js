// api/odata/v2/User.js
// Emulates SuccessFactors OData v2 /User endpoint — returns Atom XML feed.

import { readEmployees } from "../../../lib/github-store.js";

const BASE_URL = "https://api10preview.sapsf.com";

function esc(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseISO(s) {
  if (!s) return null;
  const d = new Date(s.replace("Z", "").replace(" ", "T"));
  return isNaN(d) ? null : d;
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
  const skip  = Math.max(0, parseInt(query["$skip"] || query.skip || "0", 10));
  const top   = parseInt(query["$top"]  || query.top  || String(result.length), 10);
  result = result.slice(skip, skip + top);
  return { result, total };
}

function buildXML(employees, totalCount) {
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  const entries = employees.map(emp => `  <entry>
    <id>${BASE_URL}/odata/v2/User('${esc(emp.userId)}')</id>
    <title type="text"></title>
    <updated>${now}</updated>
    <author><name></name></author>
    <link rel="edit" title="User" href="User('${esc(emp.userId)}')"></link>
    <category term="SFOData.User" scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"></category>
    <content type="application/xml">
      <m:properties>
        <d:userId>${esc(emp.userId)}</d:userId>
        <d:firstName>${esc(emp.firstName)}</d:firstName>
        <d:lastName>${esc(emp.lastName)}</d:lastName>
        <d:custom05>${esc(emp.custom05)}</d:custom05>
        <d:lastModified m:type="Edm.DateTime">${esc(emp.lastModified)}</d:lastModified>
        <d:email>${esc(emp.email)}</d:email>
        <d:status>${esc(emp.status)}</d:status>
      </m:properties>
    </content>
  </entry>`).join("\n");

  return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
      xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"
      xml:base="${BASE_URL}/odata/v2/">
  <title type="text">User</title>
  <id>${BASE_URL}/odata/v2/User</id>
  <updated>${now}</updated>
  <link rel="self" title="User" href="User"></link>
  <m:count>${totalCount}</m:count>
${entries}
</feed>`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { employees } = await readEmployees();
    const { result, total } = applyFilters(employees, req.query);
    const xml = buildXML(result, total);
    res.setHeader("Content-Type", "application/xml;charset=utf-8");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("OData error:", err);
    return res.status(500).json({ error: err.message });
  }
}
