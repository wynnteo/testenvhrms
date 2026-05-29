import json
import os
from datetime import datetime, timezone
from flask import Flask, request, Response, jsonify, render_template_string
from functools import wraps

app = Flask(__name__)

DATA_FILE = os.environ.get("DATA_FILE", "employees.txt")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "admin-secret-token")


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def load_employees():
    if not os.path.exists(DATA_FILE):
        return _default_employees()
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_employees(employees):
    with open(DATA_FILE, "w") as f:
        json.dump(employees, f, indent=2)

def _default_employees():
    """Seed data matching the sample XML you provided."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    return [
        {"userId": "3010190", "firstName": "MOY CHAI", "lastName": "Leo",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-12T19:11:50", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "3003593", "firstName": "YONG SENG", "lastName": "Lim",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-14T19:12:12", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "3003600", "firstName": "Geck Khuan", "lastName": "Abas",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-14T19:12:12", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "2350493", "firstName": "Hannah", "lastName": "LEE",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-16T19:11:55", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "2350716", "firstName": "GEK HENG", "lastName": "LEE",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-16T19:11:55", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "2350822", "firstName": "Chee Fun", "lastName": "Aw",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-16T19:11:55", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "3010322", "firstName": "Daashini", "lastName": "TEO",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-16T19:11:56", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "2350596", "firstName": "Choon Tiong", "lastName": "Tay",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-17T19:11:59", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "2350604", "firstName": "REN JIE JONATHAN", "lastName": "NG",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-17T19:11:59", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "2350802", "firstName": "Tamara Ana", "lastName": "NG",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-17T19:12:00", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
        {"userId": "3003477", "firstName": "MINLIANG", "lastName": "MUHD",
         "email": "dummy@successfactors.com", "status": "t",
         "lastModified": "2026-05-17T19:12:00", "custom05": "NTUC LearningHub Pte Ltd (L100)"},
    ]


# ---------------------------------------------------------------------------
# Filtering helpers
# ---------------------------------------------------------------------------

def parse_iso(s):
    """Parse ISO datetime string to datetime object (best effort)."""
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None

def apply_filters(employees, params):
    """Apply OData $filter, $top, $skip from query params."""
    # --- date range filter from custom params (passed by your lambda) ---
    modified_from = params.get("modifiedfrom") or params.get("modified_from")
    modified_to   = params.get("modifiedto")   or params.get("modified_to")
    dt_from = parse_iso(modified_from)
    dt_to   = parse_iso(modified_to)

    result = []
    for emp in employees:
        lm = parse_iso(emp.get("lastModified", ""))
        if dt_from and lm and lm < dt_from:
            continue
        if dt_to and lm and lm > dt_to:
            continue
        result.append(emp)

    # --- OData $top / $skip pagination ---
    top  = params.get("$top",  params.get("top"))
    skip = params.get("$skip", params.get("skip"))
    try:
        skip = int(skip) if skip else 0
    except ValueError:
        skip = 0
    try:
        top = int(top) if top else len(result)
    except ValueError:
        top = len(result)

    total = len(result)
    result = result[skip: skip + top]
    return result, total


# ---------------------------------------------------------------------------
# XML builder  (mirrors real SF OData v2 Atom feed exactly)
# ---------------------------------------------------------------------------

BASE_URL = "https://api10preview.sapsf.com"

def build_feed_xml(employees, total_count):
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    entries = ""
    for emp in employees:
        uid = emp["userId"]
        entries += f"""    <entry>
        <id>{BASE_URL}/odata/v2/User('{uid}')</id>
        <title type="text"></title>
        <updated>{now}</updated>
        <author><name></name></author>
        <link rel="edit" title="User" href="User('{uid}')"></link>
        <category term="SFOData.User"
            scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme"></category>
        <content type="application/xml">
            <m:properties>
                <d:userId>{uid}</d:userId>
                <d:firstName>{_esc(emp.get('firstName',''))}</d:firstName>
                <d:lastName>{_esc(emp.get('lastName',''))}</d:lastName>
                <d:custom05>{_esc(emp.get('custom05',''))}</d:custom05>
                <d:lastModified m:type="Edm.DateTime">{emp.get('lastModified','')}</d:lastModified>
                <d:email>{_esc(emp.get('email',''))}</d:email>
                <d:status>{emp.get('status','t')}</d:status>
            </m:properties>
        </content>
    </entry>
"""

    xml = f"""<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
      xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"
      xml:base="{BASE_URL}/odata/v2/">
    <title type="text">User</title>
    <id>{BASE_URL}/odata/v2/User</id>
    <updated>{now}</updated>
    <link rel="self" title="User" href="User"></link>
    <m:count>{total_count}</m:count>
{entries}</feed>"""
    return xml

def _esc(s):
    return (s.replace("&", "&amp;")
             .replace("<", "&lt;")
             .replace(">", "&gt;")
             .replace('"', "&quot;"))


# ---------------------------------------------------------------------------
# Admin UI  (simple HTML page — no JS framework needed)
# ---------------------------------------------------------------------------

ADMIN_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock SuccessFactors Admin</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #f0f4f8; color: #1a202c; }
  header { background: #1a56db; color: white; padding: 16px 32px;
           display: flex; align-items: center; gap: 12px; }
  header h1 { font-size: 1.2rem; font-weight: 600; }
  header span { font-size: 0.8rem; opacity: 0.8;
                background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 20px; }
  main { max-width: 1100px; margin: 32px auto; padding: 0 16px; }
  .card { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1);
          padding: 24px; margin-bottom: 24px; }
  .card h2 { font-size: 1rem; font-weight: 600; margin-bottom: 16px;
             padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  label { display: block; font-size: 0.8rem; font-weight: 500;
          color: #4a5568; margin-bottom: 4px; }
  input, select { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e0;
                  border-radius: 6px; font-size: 0.9rem; }
  input:focus, select:focus { outline: none; border-color: #1a56db;
                               box-shadow: 0 0 0 3px rgba(26,86,219,.15); }
  .btn { padding: 9px 20px; border: none; border-radius: 6px; font-size: 0.9rem;
         font-weight: 500; cursor: pointer; transition: all .15s; }
  .btn-primary { background: #1a56db; color: white; }
  .btn-primary:hover { background: #1446b5; }
  .btn-danger  { background: #e53e3e; color: white; }
  .btn-danger:hover  { background: #c53030; }
  .btn-warning { background: #d69e2e; color: white; }
  .btn-warning:hover { background: #b7791f; }
  .flash { padding: 10px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 0.9rem; }
  .flash.ok  { background: #c6f6d5; color: #276749; }
  .flash.err { background: #fed7d7; color: #9b2c2c; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  th { background: #f7fafc; text-align: left; padding: 10px 12px;
       font-weight: 600; color: #4a5568; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tr:hover td { background: #f7fafc; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px;
           font-size: 0.78rem; font-weight: 600; }
  .badge-active   { background: #c6f6d5; color: #276749; }
  .badge-inactive { background: #fed7d7; color: #9b2c2c; }
  .actions { display: flex; gap: 6px; }
  .full { grid-column: 1 / -1; }
  @media(max-width:600px){ .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<header>
  <h1>🏗️ Mock SuccessFactors</h1>
  <span>Testing Environment</span>
</header>
<main>

{% if msg %}
<div class="flash {{ 'ok' if ok else 'err' }}">{{ msg }}</div>
{% endif %}

<!-- Add Employee -->
<div class="card">
  <h2>➕ Hire New Employee</h2>
  <form method="POST" action="/admin/add">
    <div class="grid">
      <div>
        <label>User ID *</label>
        <input name="userId" required placeholder="e.g. 9990001">
      </div>
      <div>
        <label>Email</label>
        <input name="email" placeholder="e.g. john@company.com" value="dummy@successfactors.com">
      </div>
      <div>
        <label>First Name *</label>
        <input name="firstName" required placeholder="e.g. John">
      </div>
      <div>
        <label>Last Name *</label>
        <input name="lastName" required placeholder="e.g. Smith">
      </div>
      <div class="full">
        <label>Company (custom05)</label>
        <input name="custom05" value="NTUC LearningHub Pte Ltd (L100)">
      </div>
    </div>
    <br>
    <button class="btn btn-primary" type="submit">Hire Employee</button>
  </form>
</div>

<!-- Employee List -->
<div class="card">
  <h2>👥 Employee List ({{ employees|length }} records)</h2>
  <table>
    <thead>
      <tr>
        <th>User ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Company</th>
        <th>Last Modified</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
    {% for emp in employees %}
    <tr>
      <td><code>{{ emp.userId }}</code></td>
      <td>{{ emp.firstName }} {{ emp.lastName }}</td>
      <td>{{ emp.email }}</td>
      <td>{{ emp.custom05 }}</td>
      <td>{{ emp.lastModified }}</td>
      <td>
        <span class="badge {{ 'badge-active' if emp.status == 't' else 'badge-inactive' }}">
          {{ 'Active' if emp.status == 't' else 'Terminated' }}
        </span>
      </td>
      <td class="actions">
        {% if emp.status == 't' %}
        <form method="POST" action="/admin/terminate/{{ emp.userId }}"
              onsubmit="return confirm('Terminate {{ emp.firstName }}?')">
          <button class="btn btn-warning" type="submit">Terminate</button>
        </form>
        {% else %}
        <form method="POST" action="/admin/activate/{{ emp.userId }}">
          <button class="btn btn-primary" type="submit">Re-hire</button>
        </form>
        {% endif %}
        <form method="POST" action="/admin/delete/{{ emp.userId }}"
              onsubmit="return confirm('Permanently delete {{ emp.firstName }}?')">
          <button class="btn btn-danger" type="submit">Delete</button>
        </form>
      </td>
    </tr>
    {% endfor %}
    </tbody>
  </table>
</div>

<!-- Endpoint Info -->
<div class="card">
  <h2>🔗 OData Endpoint (point your Lambda here)</h2>
  <p style="font-size:0.85rem;color:#4a5568;margin-bottom:8px;">
    Replace <code>base_url</code> in your config with this server's URL.
    The endpoint path stays the same: <code>/odata/v2/User</code>
  </p>
  <code style="display:block;background:#f7fafc;padding:12px;border-radius:6px;
               font-size:0.85rem;word-break:break-all;">
    GET {{ request.host_url }}odata/v2/User?$top=50&amp;$skip=0
  </code>
  <br>
  <p style="font-size:0.85rem;color:#4a5568;">
    Supported query params: <code>$top</code>, <code>$skip</code>,
    <code>modifiedfrom</code>, <code>modifiedto</code>, <code>$filter</code>
  </p>
</div>

</main>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# OData endpoint  — this is what your Lambda calls
# ---------------------------------------------------------------------------

@app.route("/odata/v2/User", methods=["GET"])
def odata_user():
    employees = load_employees()
    params = request.args.to_dict()

    filtered, total = apply_filters(employees, params)
    xml = build_feed_xml(filtered, total)

    return Response(xml, status=200, mimetype="application/xml;charset=utf-8")


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------

@app.route("/admin", methods=["GET"])
def admin_home():
    employees = load_employees()
    return render_template_string(ADMIN_HTML, employees=employees, msg=None, ok=True,
                                  request=request)

@app.route("/admin/add", methods=["POST"])
def admin_add():
    employees = load_employees()
    uid = request.form.get("userId", "").strip()
    if not uid:
        return render_template_string(ADMIN_HTML, employees=employees,
                                      msg="User ID is required.", ok=False, request=request)
    if any(e["userId"] == uid for e in employees):
        return render_template_string(ADMIN_HTML, employees=employees,
                                      msg=f"User ID {uid} already exists.", ok=False, request=request)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    emp = {
        "userId":       uid,
        "firstName":    request.form.get("firstName", "").strip(),
        "lastName":     request.form.get("lastName", "").strip(),
        "email":        request.form.get("email", "dummy@successfactors.com").strip(),
        "custom05":     request.form.get("custom05", "NTUC LearningHub Pte Ltd (L100)").strip(),
        "status":       "t",
        "lastModified": now,
    }
    employees.append(emp)
    save_employees(employees)
    return render_template_string(ADMIN_HTML, employees=employees,
                                  msg=f"✅ Employee {emp['firstName']} {emp['lastName']} hired successfully.",
                                  ok=True, request=request)

@app.route("/admin/terminate/<user_id>", methods=["POST"])
def admin_terminate(user_id):
    employees = load_employees()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    for emp in employees:
        if emp["userId"] == user_id:
            emp["status"] = "f"
            emp["lastModified"] = now
            save_employees(employees)
            return render_template_string(ADMIN_HTML, employees=employees,
                                          msg=f"✅ Employee {user_id} terminated.",
                                          ok=True, request=request)
    return render_template_string(ADMIN_HTML, employees=employees,
                                  msg=f"Employee {user_id} not found.", ok=False, request=request)

@app.route("/admin/activate/<user_id>", methods=["POST"])
def admin_activate(user_id):
    employees = load_employees()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    for emp in employees:
        if emp["userId"] == user_id:
            emp["status"] = "t"
            emp["lastModified"] = now
            save_employees(employees)
            return render_template_string(ADMIN_HTML, employees=employees,
                                          msg=f"✅ Employee {user_id} re-hired.",
                                          ok=True, request=request)
    return render_template_string(ADMIN_HTML, employees=employees,
                                  msg=f"Employee {user_id} not found.", ok=False, request=request)

@app.route("/admin/delete/<user_id>", methods=["POST"])
def admin_delete(user_id):
    employees = load_employees()
    before = len(employees)
    employees = [e for e in employees if e["userId"] != user_id]
    if len(employees) == before:
        return render_template_string(ADMIN_HTML, employees=employees,
                                      msg=f"Employee {user_id} not found.", ok=False, request=request)
    save_employees(employees)
    return render_template_string(ADMIN_HTML, employees=employees,
                                  msg=f"🗑️ Employee {user_id} deleted.",
                                  ok=True, request=request)

# Simple health check
@app.route("/health")
def health():
    return jsonify({"status": "ok", "records": len(load_employees())})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
