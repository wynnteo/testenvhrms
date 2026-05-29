# Mock SuccessFactors — Vercel + GitHub Storage

Emulates the SuccessFactors OData v2 `/User` endpoint for testing.
Employee data is stored as `employees.txt` in **this same GitHub repo** — no database, no card needed.

---

## 🚀 Setup (one-time, ~5 minutes)

### Step 1 — Push to GitHub
Create a new GitHub repo and push all these files to it.

### Step 2 — Generate a GitHub Token
1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. Click **Generate new token**
3. Set expiry (e.g. 1 year)
4. Under **Repository access** → select **Only select repositories** → pick this repo
5. Under **Permissions → Repository permissions**:
   - **Contents** → `Read and write`
6. Click **Generate token** and copy it

### Step 3 — Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Click **Deploy** (no build settings needed)

### Step 4 — Add Environment Variables in Vercel
Go to your project → **Settings → Environment Variables** and add:

| Key | Value |
|-----|-------|
| `GITHUB_TOKEN` | your fine-grained token from Step 2 |
| `GITHUB_REPO` | `yourname/your-repo-name` |
| `GITHUB_BRANCH` | `main` |

Then go to **Deployments → Redeploy** (so the env vars take effect).

---

## 🔧 Point Your Lambda at the Mock

In SSM config, change **only `base_url`**:

```json
{
  "base_url": "https://your-project.vercel.app",
  "odata": {
    "endpoint": "/odata/v2/User"
  }
}
```

Your Lambda will call:
```
GET https://your-project.vercel.app/odata/v2/User?$top=50&$skip=0
```

---

## 🖥️ Admin UI

Visit `https://your-project.vercel.app/admin`

| Action | What it does |
|--------|-------------|
| **Hire** | Adds employee with `status: t`, sets `lastModified` to now |
| **Terminate** | Sets `status: f`, bumps `lastModified` to now |
| **Re-hire** | Sets `status: t` back |
| **Delete** | Removes the record entirely |

> `lastModified` is always updated on any change, so your Lambda's `modifiedfrom`/`modifiedto` delta filters will pick up changes correctly.

---

## 📁 File Structure

```
├── api/
│   ├── odata/v2/User.js       ← OData XML endpoint (what Lambda calls)
│   └── admin/
│       ├── employees.js       ← Returns employee list as JSON
│       └── action.js          ← Hire / terminate / activate / delete
├── lib/
│   └── github-store.js        ← Reads/writes employees.txt via GitHub API
├── public/
│   └── admin.html             ← Admin UI
├── vercel.json
└── package.json
```

---

## 🔍 How GitHub Storage Works

Every read/write goes through the GitHub Contents API:
- **Read**: `GET /repos/{owner}/{repo}/contents/employees.txt`
- **Write**: `PUT /repos/{owner}/{repo}/contents/employees.txt` (with SHA for optimistic locking)

The file `employees.txt` will appear in your repo root after the first write.
You can also edit it directly on GitHub as a manual escape hatch.
