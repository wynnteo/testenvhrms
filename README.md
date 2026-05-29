# Mock SuccessFactors OData Server

A lightweight Flask app that emulates the SuccessFactors OData v2 `/User` endpoint
for testing purposes. Data is persisted in a plain JSON `.txt` file — no database needed.

---

## 🚀 Deploy to Render.com (Free)

1. Push this folder to a **GitHub repo** (public or private).
2. Go to [render.com](https://render.com) → **New → Blueprint**.
3. Connect your repo — Render will detect `render.yaml` automatically.
4. Click **Apply**. Your service will be live in ~2 minutes.
5. Note your URL, e.g. `https://mock-successfactors.onrender.com`

> ⚠️ Free Render instances spin down after 15 min of inactivity.
> First request after sleep takes ~30s. Upgrade to Starter ($7/mo) to avoid this.

---

## 🔧 Point Your Lambda at the Mock

In your SSM config for the org, change **`base_url`** only:

```json
{
  "base_url": "https://mock-successfactors.onrender.com",
  "odata": {
    "endpoint": "/odata/v2/User",
    ...
  }
}
```

Everything else stays the same. The Lambda will call:
```
GET https://mock-successfactors.onrender.com/odata/v2/User?$top=50&$skip=0
```

---

## 🖥️ Admin UI

Visit `/admin` to manage employees:

| Action | Description |
|--------|-------------|
| **Hire** | Adds a new employee (status = `t`) with today's `lastModified` |
| **Terminate** | Sets status to `f`, bumps `lastModified` to now |
| **Re-hire** | Sets status back to `t` |
| **Delete** | Removes the record entirely |

---

## 🔗 OData Endpoint

```
GET /odata/v2/User
```

**Query Parameters:**

| Param | Example | Notes |
|-------|---------|-------|
| `$top` | `50` | Page size |
| `$skip` | `0` | Offset (page_number-1 * page_size) |
| `modifiedfrom` | `2026-05-01T00:00:00Z` | Filter by lastModified >= |
| `modifiedto` | `2026-05-31T23:59:59Z` | Filter by lastModified <= |

**Response:** Atom XML feed identical to real SuccessFactors OData v2.

---

## 🏃 Run Locally

```bash
pip install -r requirements.txt
DATA_FILE=employees.txt python app.py
# → http://localhost:5000/admin
# → http://localhost:5000/odata/v2/User
```

---

## 📁 File Storage

Employee data is stored in a single JSON file (`employees.txt`).
On Render, this is on a persistent 1 GB disk at `/var/data/employees.txt`.
If the file doesn't exist on first boot, seed data from your sample XML is loaded automatically.

---

## 🔑 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATA_FILE` | `employees.txt` | Path to the JSON storage file |
| `ADMIN_TOKEN` | `admin-secret-token` | (Reserved for future auth on admin routes) |
| `PORT` | `5000` | Port to listen on (set automatically by Render) |
