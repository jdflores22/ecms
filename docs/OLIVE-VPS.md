# Olive ICS — API on VPS (201.18.216.37)

Move the **new link** backend off Railway so **Hostinger SMTP** works (Railway Hobby blocks outbound SMTP).

| Piece | Host |
|-------|------|
| Frontend | `https://olive-mole-175469.hostingersite.com` |
| API | VPS `201.18.216.37` (Nginx → self-contained .NET) |
| MySQL | **Local MariaDB on the VPS** (`127.0.0.1`, database `ecms`) — not Hostinger Remote MySQL |
| Browser → API | Same-origin `ecms-api-proxy.php` (no CORS) |

## Database (blank + admin only)

On first API start with `ECMS_MINIMAL_SEED=true` (set by `install-mysql-local.sh`):

- EF migrations create all tables
- Seeds **roles**, default **payment fee row**, **container size/type catalog** (no shipping lines, depots, demo containers, or demo users)
- Creates **one** user: `admin` (password in `/etc/ecms/.initial_admin_password` on the VPS)

No MAERSK/MSC demo data. Configure shipping lines and depots in the admin UI.

If demo or local XAMPP data already landed in production, remove it with `scripts/sql/purge-demo-seed-data.sql` (dry-run uses `ROLLBACK` until you switch to `COMMIT`). After deploying the API fix, ensure `/etc/ecms/ecms-api.env` has `ECMS_MINIMAL_SEED=true` and `ECMS_SEED_DEMO_USERS=false`.

## 1. Bootstrap VPS (once)

```bash
ssh root@201.18.216.37
bash olive-bootstrap.sh
```

From your PC (install MariaDB + blank DB + env):

```powershell
$env:VPS_ROOT_PASSWORD = '...'
# ECMS_RESET_DATABASE=1 (default) drops/recreates ecms for a clean slate
python .\scripts\vps\remote_install_mysql.py
```

Then deploy the API:

```powershell
$env:SKIP_BOOTSTRAP = '1'
python .\scripts\vps\remote_deploy_olive.py
```

Read admin password on VPS:

```bash
cat /etc/ecms/.initial_admin_password
```

## 2. Deploy from Windows PC

```powershell
cd c:\xampp\htdocs\ecms
$env:VPS_ROOT_PASSWORD = '...'
.\scripts\deploy-olive-all.ps1          # API + Hostinger frontend + android local.properties
# or: .\scripts\deploy-olive-vps.ps1    # frontend + optional API via deploy-api-vps.ps1
```

**Android trucker app:** `API_BASE_URL=http://201.18.216.37/api` in `android-trucker/local.properties`, then rebuild APK.

```powershell
.\scripts\deploy-olive-all.ps1 -BuildDebugApk
```

## Integrations (LOGICTECK, Firebase push, Redis)

See **[OLIVE-INTEGRATIONS.md](./OLIVE-INTEGRATIONS.md)** — fill `backend/ECMS.API/.env.integrations` and run `.\scripts\push-olive-integrations.ps1`.

## 3. Optional HTTPS API subdomain

```bash
certbot --nginx -d api.yourdomain.com
```
