# ICS on Hostinger VPS — Deployment Guide

Deploy the **ASP.NET Core API** on a Hostinger VPS while keeping:

| Component | Where it runs |
|-----------|----------------|
| **React frontend** | Hostinger shared hosting (`deepskyblue-marten-415020.hostingersite.com`) |
| **MySQL database** | Hostinger managed MySQL (`h5g5-db.hstgr.io`) |
| **ICS API** | Your new VPS |

```
Browser
   │
   ├─► https://deepskyblue-marten-415020.hostingersite.com  (static React)
   │
   └─► https://api.YOUR-DOMAIN.com/api/...  (VPS → Nginx → .NET 7 API)
              │
              └─► h5g5-db.hstgr.io:3306  (Hostinger MySQL, SSL)
```

---

## Before you start

- [ ] Database schema imported in phpMyAdmin (`scripts/ecms-schema.sql` or EF migrations)
- [ ] MySQL hostname, database name, username, password from hPanel
- [ ] GitHub repo: `https://github.com/jdflores22/ecms`
- [ ] A domain or subdomain for the API (e.g. `api.yourdomain.com`) — recommended for HTTPS

---

## Part 1 — Create the VPS (Hostinger hPanel)

1. Log in to **hPanel** → **VPS** → **Create VPS** (or upgrade if you already have one).
2. Recommended minimum:
   - **OS:** Ubuntu 22.04 LTS
   - **RAM:** 2 GB (1 GB works for light traffic; 2 GB is safer)
   - **Location:** Same region as your MySQL if possible
3. Note after provisioning:
   - VPS **public IP** (e.g. `203.0.113.10`)
   - **root** password (or SSH key)
   - SSH port (usually `22`)

4. **DNS** (optional but recommended): create an **A record** pointing `api.yourdomain.com` → VPS IP.

---

## Part 2 — First login and base setup

From your PC (PowerShell):

```powershell
ssh root@YOUR_VPS_IP
```

On the VPS:

```bash
# Update packages
apt update && apt upgrade -y

# Basic tools
apt install -y curl git ufw nginx certbot python3-certbot-nginx

# Firewall: SSH + HTTP + HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

Create a deploy user (do not run the API as root):

```bash
adduser ecms
usermod -aG sudo ecms
mkdir -p /var/www/ecms
chown ecms:ecms /var/www/ecms
```

---

## Part 3 — Install .NET 7 runtime

```bash
# Microsoft package repo
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

apt update
apt install -y aspnetcore-runtime-7.0

# Verify
dotnet --list-runtimes
# Expect: Microsoft.AspNetCore.App 7.0.x
```

---

## Part 4 — Allow VPS to reach Hostinger MySQL

The API on the VPS must connect to remote MySQL.

1. **hPanel** → **Databases** → **Remote MySQL**
2. Add your **VPS public IP** (not your home PC IP)
3. Save

Connection details (from your hPanel):

| Setting | Example |
|---------|---------|
| Host | `h5g5-db.hstgr.io` |
| Port | `3306` |
| Database | `u910121167_HVdBWy0pE_ecms` |
| User | `u910121167_HVdBWy0pE_ecms` |
| Password | from hPanel (quote in config if it contains `#`) |
| SSL | Required |

Test from the VPS:

```bash
apt install -y mysql-client
mysql -h h5g5-db.hstgr.io -P 3306 -u u910121167_HVdBWy0pE_ecms -p u910121167_HVdBWy0pE_ecms -e "SELECT 1;"
```

If this fails with **Access denied**, reset the MySQL password in hPanel and retry.

---

## Part 5 — Publish and upload the API

### Option A — Build on your PC, upload to VPS (simplest)

On your **Windows PC**:

```powershell
cd c:\xampp\htdocs\ecms
dotnet publish backend\ECMS.API\ECMS.API.csproj -c Release -o .\publish\api
```

Upload to VPS (replace IP and user):

```powershell
scp -r .\publish\api\* ecms@YOUR_VPS_IP:/var/www/ecms/api/
```

### Option B — Build on the VPS

```bash
sudo -u ecms -i
cd ~
git clone https://github.com/jdflores22/ecms.git
cd ecms
dotnet publish backend/ECMS.API/ECMS.API.csproj -c Release -o /var/www/ecms/api
```

Create uploads directory:

```bash
mkdir -p /var/www/ecms/api/uploads
chown -R ecms:ecms /var/www/ecms
```

---

## Part 6 — Production configuration

Create `/var/www/ecms/api/appsettings.Production.json` on the VPS:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "DefaultConnection": "Server=h5g5-db.hstgr.io;Port=3306;Database=u910121167_HVdBWy0pE_ecms;User=u910121167_HVdBWy0pE_ecms;Password=YOUR_PASSWORD;SslMode=Required;",
    "Redis": ""
  },
  "Jwt": {
    "Key": "CHANGE-TO-A-LONG-RANDOM-SECRET-AT-LEAST-32-CHARS",
    "Issuer": "ICS.API",
    "Audience": "ICS.Client",
    "AccessTokenMinutes": "60"
  },
  "FileStorage": {
    "UploadPath": "uploads"
  },
  "Cors": {
    "Origins": [
      "https://deepskyblue-marten-415020.hostingersite.com",
      "https://www.deepskyblue-marten-415020.hostingersite.com"
    ]
  }
}
```

Replace `YOUR_PASSWORD` and generate a new **Jwt:Key** for production.

**Security:** restrict file permissions:

```bash
chmod 600 /var/www/ecms/api/appsettings.Production.json
chown ecms:ecms /var/www/ecms/api/appsettings.Production.json
```

---

## Part 7 — systemd service (API always running)

Create `/etc/systemd/system/ecms-api.service`:

```ini
[Unit]
Description=ICS API
After=network.target

[Service]
WorkingDirectory=/var/www/ecms/api
ExecStart=/usr/bin/dotnet /var/www/ecms/api/ECMS.API.dll
Restart=always
RestartSec=10
User=ecms
Group=ecms
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:5000
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
systemctl daemon-reload
systemctl enable ecms-api
systemctl start ecms-api
systemctl status ecms-api
```

View logs:

```bash
journalctl -u ecms-api -f
```

On first start, the API runs **DbSeeder** — demo users are created if tables are empty.

Quick local test on VPS:

```bash
curl -s http://127.0.0.1:5000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin@123"}' | head -c 200
```

---

## Part 8 — Nginx reverse proxy + HTTPS

Create `/etc/nginx/sites-available/ecms-api`:

```nginx
server {
    listen 80;
    server_name api.YOUR-DOMAIN.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
ln -sf /etc/nginx/sites-available/ecms-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

HTTPS with Let's Encrypt:

```bash
certbot --nginx -d api.YOUR-DOMAIN.com
```

Certbot updates Nginx for HTTPS automatically. Renewals are scheduled via cron.

**No custom domain yet?** Use the VPS IP temporarily and set `server_name _;` — you'll need HTTPS for production browsers (CORS + mixed content). A subdomain is strongly recommended.

---

## Part 9 — Point the frontend at the VPS API

Rebuild the React app with the production API URL:

```powershell
cd c:\xampp\htdocs\ecms
.\scripts\deploy-frontend-hostinger.ps1 -ApiBaseUrl "https://api.YOUR-DOMAIN.com/api"
```

This sets `VITE_API_BASE_URL` and uploads to shared hosting.

Open: https://deepskyblue-marten-415020.hostingersite.com/

Test login with seeded credentials (if seeder ran), e.g. `admin` / `Admin@123`.

---

## Part 10 — Verification checklist

| Check | How |
|-------|-----|
| API up | `curl https://api.YOUR-DOMAIN.com/api/auth/login` (POST with JSON body) |
| CORS | Browser DevTools → Network → login request has no CORS error |
| DB | API logs show no MySQL connection errors |
| Uploads | `https://api.YOUR-DOMAIN.com/uploads/...` serves files after upload |
| Frontend | Login works on Hostinger site URL |

---

## Troubleshooting

### `Access denied` for MySQL from VPS

- Confirm **VPS IP** is in hPanel → Remote MySQL (not your home IP)
- Reset MySQL password in hPanel; update `appsettings.Production.json`
- Host must be `h5g5-db.hstgr.io` (no `https://`)

### CORS errors in browser

- Add your exact frontend URL (with `https://`) to `Cors:Origins` in production config
- Restart API: `systemctl restart ecms-api`

### 502 Bad Gateway from Nginx

- API not running: `systemctl status ecms-api`
- Wrong port in Nginx vs `ASPNETCORE_URLS`

### Login works locally but not production

- Frontend built with wrong `VITE_API_BASE_URL` — rebuild and redeploy
- JWT key changed after tokens were issued — log in again

### Schema missing

Import on phpMyAdmin: `scripts/ecms-schema.sql`

---

## Updating the API after code changes

On PC:

```powershell
cd c:\xampp\htdocs\ecms
dotnet publish backend\ECMS.API\ECMS.API.csproj -c Release -o .\publish\api
scp -r .\publish\api\* ecms@YOUR_VPS_IP:/var/www/ecms/api/
```

On VPS:

```bash
sudo systemctl restart ecms-api
```

---

## Optional — Docker on VPS

The repo includes `docker/docker-compose.yml` for **local dev** (MySQL + Redis + API + frontend). For production with Hostinger MySQL, run **API only**:

```bash
docker build -f docker/Dockerfile.api -t ecms-api .
docker run -d --name ecms-api -p 127.0.0.1:5000:8080 \
  -e ASPNETCORE_ENVIRONMENT=Production \
  -e ConnectionStrings__DefaultConnection="Server=h5g5-db.hstgr.io;..." \
  -e Jwt__Key="your-secret" \
  -e Cors__Origins__0="https://deepskyblue-marten-415020.hostingersite.com" \
  -v ecms-uploads:/app/uploads \
  ecms-api
```

Point Nginx at `127.0.0.1:5000` as in Part 8. systemd is simpler for a single .NET app unless you already use Docker.

---

## Security reminders

- Rotate **JWT key** and MySQL password before go-live
- Never commit `appsettings.Production.json` or `.env.production` to git
- Keep Ubuntu and .NET runtime updated: `apt update && apt upgrade`
- Use SSH keys instead of password login when possible
- Back up MySQL regularly via hPanel or `mysqldump`

---

## Quick reference

| Item | Value |
|------|--------|
| Frontend URL | `https://deepskyblue-marten-415020.hostingersite.com` |
| API URL (you set) | `https://api.YOUR-DOMAIN.com` |
| MySQL host | `h5g5-db.hstgr.io` |
| API service | `systemctl {start\|stop\|restart\|status} ecms-api` |
| API logs | `journalctl -u ecms-api -f` |
| Deploy frontend | `.\scripts\deploy-frontend-hostinger.ps1 -ApiBaseUrl "https://api.YOUR-DOMAIN.com/api"` |
