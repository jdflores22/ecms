# ECMS API on Railway — Deployment Guide

Host the **ASP.NET Core API** on [Railway](https://railway.com/new) while keeping:

| Component | Where |
|-----------|--------|
| React frontend | Hostinger shared hosting |
| MySQL | Hostinger (`h5g5-db.hstgr.io`) |
| API | Railway |

```
Browser → Hostinger frontend
       → Railway API (https://your-app.up.railway.app/api/...)
              → Hostinger MySQL
```

---

## Before you start

- [ ] GitHub repo pushed: `https://github.com/jdflores22/ecms`
- [ ] Database schema imported in phpMyAdmin (`scripts/ecms-schema.sql`)
- [ ] Railway account (GitHub login works at [railway.com/new](https://railway.com/new))
- [ ] MySQL password from Hostinger hPanel

---

## Part 1 — Create Railway project

1. Open **[railway.com/new](https://railway.com/new)**
2. Click **Deploy from GitHub repo**
3. Authorize Railway → select **`jdflores22/ecms`**
4. Railway creates a service and starts building from `docker/Dockerfile.api` (see `railway.toml`)

Wait for the first build. It may fail until environment variables are set — that is normal.

---

## Part 2 — Environment variables

In Railway: **your service → Variables** → add these:

### Required

| Variable | Value |
|----------|--------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_URLS` | `http://0.0.0.0:8080` |
| `ConnectionStrings__DefaultConnection` | See below |
| `Jwt__Key` | Long random secret (32+ chars) |
| `Jwt__Issuer` | `ECMS.API` |
| `Jwt__Audience` | `ECMS.Client` |
| `Cors__Origins__0` | `https://deepskyblue-marten-415020.hostingersite.com` |
| `Cors__Origins__1` | `https://www.deepskyblue-marten-415020.hostingersite.com` |
| `FileStorage__UploadPath` | `uploads` |

**Connection string** (replace `YOUR_PASSWORD`):

```
Server=h5g5-db.hstgr.io;Port=3306;Database=u910121167_HVdBWy0pE_ecms;User=u910121167_HVdBWy0pE_ecms;Password=YOUR_PASSWORD;SslMode=Required;
```

If the password contains `#`, paste it as-is in the Railway dashboard (no quotes needed).

### Optional

| Variable | Value |
|----------|--------|
| `ConnectionStrings__Redis` | leave empty |
| `Jwt__AccessTokenMinutes` | `60` |

Click **Deploy** / wait for redeploy after saving variables.

---

## Part 3 — Allow Railway to reach Hostinger MySQL

Hostinger only accepts MySQL connections from **whitelisted IPs**.

### Option A — Static outbound IP (recommended for Railway)

1. Railway → your project → **Settings** → enable **Static Outbound IP** (paid add-on if required on your plan)
2. Copy the static IP
3. **Hostinger hPanel** → **Databases** → **Remote MySQL** → add that IP
4. Redeploy Railway service

### Option B — Allow any host (quick test, less secure)

Some Hostinger plans let you add `%` as a remote host in **Remote MySQL**. Use only for testing, then lock down to a static IP.

### Option C — Use Railway MySQL instead

Create a **MySQL** plugin in Railway and migrate data from Hostinger. More work; skip if you already use Hostinger MySQL.

### Verify

After deploy, check **Railway → Deployments → View logs**. You should **not** see MySQL connection errors on startup.

---

## Part 4 — Public URL for the API

1. Railway → your service → **Settings** → **Networking**
2. Click **Generate domain** (e.g. `ecms-api-production.up.railway.app`)
3. Copy the URL — your API base is:

```
https://ecms-api-production.up.railway.app/api
```

Test in browser or PowerShell:

```powershell
curl -X POST "https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"Admin@123"}'
```

A JSON response with `accessToken` means the API and database work.

---

## Part 5 — Redeploy frontend (Hostinger)

Point the React app at Railway:

```powershell
cd c:\xampp\htdocs\ecms
.\scripts\deploy-frontend-hostinger.ps1 -ApiBaseUrl "https://YOUR-RAILWAY-DOMAIN.up.railway.app/api"
```

Open: https://deepskyblue-marten-415020.hostingersite.com/ and test login.

---

## Part 6 — File uploads (important)

Railway’s filesystem is **ephemeral** — uploaded photos are lost on redeploy unless you add storage.

**Short term:** uploads work until the next deploy (OK for testing).

**Production options:**

1. **Railway Volume** — mount at `/app/uploads` in service settings
2. **S3-compatible storage** (future code change)
3. **VPS** with persistent disk (see `HOSTINGER-VPS-DEPLOY.md`)

To add a Volume:

1. Railway → service → **Volumes** → Add volume
2. Mount path: `/app/uploads`

---

## Updating after code changes

Push to GitHub → Railway auto-redeploys (if connected).

Or manually: Railway → **Deployments** → **Redeploy**.

---

## Troubleshooting

### Build fails

- Check **Build logs** in Railway
- Ensure repo has `docker/Dockerfile.api` and `ECMS.sln` at root

### `Access denied` / MySQL connection errors

- Whitelist Railway’s **outbound IP** in Hostinger Remote MySQL
- Verify hostname `h5g5-db.hstgr.io` (not `localhost`, not `https://...`)
- Reset MySQL password in hPanel if unsure

### CORS error in browser

- Add exact frontend URL to `Cors__Origins__0` (include `https://`, no trailing slash)
- Redeploy after changing variables

### 502 / application failed to respond

- Set `ASPNETCORE_URLS` = `http://0.0.0.0:8080`
- Networking port should match **8080**

### Login returns 401

- DB seeder runs on startup if tables are empty — default `admin` / `Admin@123`
- If you imported schema only, start API once so seeder can run, or seed manually

### Health check fails

Railway may probe `/api/auth/login` with GET — that can return 405. If deploys stay green but health check warns, change `healthcheckPath` in `railway.toml` or disable health check in Railway settings.

---

## Cost note

Railway offers a trial / hobby tier with usage limits. Monitor **Usage** in the dashboard. A small .NET API + external MySQL is usually low cost compared to a full VPS.

---

## Quick reference

| Item | Value |
|------|--------|
| Railway setup | [railway.com/new](https://railway.com/new) |
| Repo | `jdflores22/ecms` |
| Dockerfile | `docker/Dockerfile.api` |
| MySQL host | `h5g5-db.hstgr.io` |
| Frontend deploy | `.\scripts\deploy-frontend-hostinger.ps1 -ApiBaseUrl "https://....up.railway.app/api"` |

---

## Architecture comparison

| | Railway | VPS |
|---|---------|-----|
| Server management | Minimal | You manage OS, Nginx, SSL |
| .NET support | Docker | systemd + .NET runtime |
| MySQL | External (Hostinger) | External (Hostinger) |
| Upload persistence | Needs Volume | Easy on disk |
| Fixed outbound IP | Add-on | VPS IP is fixed |

For ECMS, Railway is a good fit if you want the API live quickly without managing a server.
