# Olive VPS — Redis, Firebase push, LOGICTECK

Configure **Olive API** (`/etc/ecms/ecms-api.env` on `201.18.216.37`).

## Quick push from your PC

1. Copy `backend/ECMS.API/.env.integrations.example` → `.env.integrations`
2. Fill LOGICTECK URLs (from LOGICTECK team) and Firebase JSON path
3. Run:

```powershell
$env:VPS_ROOT_PASSWORD = '...'
.\scripts\push-olive-integrations.ps1
```

Optional Redis on VPS (once):

```powershell
python .\scripts\vps\remote_install_redis.py
```

Then set `ConnectionStrings__Redis=127.0.0.1:6379` in `.env.integrations` and push again.

---

## LOGICTECK

| Variable | Direction | Purpose |
|----------|-----------|---------|
| `LOGICTECK_API_KEY` or `Logicteck__ApiKey` | Shared secret | LOGICTECK calls ICS with `X-Logicteck-Api-Key`; ICS sends same header outbound |
| `Logicteck__PublicApiBaseUrl` | ICS → QR payloads | Base URL **without** `/api`, e.g. `http://201.18.216.37` |
| `Logicteck__BookUrl` | ICS → LOGICTECK | Receives pre-forecast when trucker taps **Send to LOGICTECK** |
| `Logicteck__PortalUrl` | ICS UI | Opens after successful send (optional) |
| `Logicteck__EmptyReturnUrl` | ICS → LOGICTECK | Full empty-return form + photos (optional) |

**LOGICTECK calls ICS (no Hostinger proxy):**

- `GET {PublicApiBaseUrl}/api/logicteck/booking/{ICS-...}`
- `GET {PublicApiBaseUrl}/api/logicteck/booking/{ICS-...}/dossier`
- `POST {PublicApiBaseUrl}/api/logicteck/validate-qr`

Give LOGICTECK: base URL, API key, and [LOGICTECK-API-HANDOFF.md](./LOGICTECK-API-HANDOFF.md).

**PayMongo-style webhook:** LOGICTECK inbound URLs are whatever they host; you only paste them into env.

---

## Firebase (push notifications)

1. Same Firebase project as `android-trucker/app/google-services.json` (e.g. `ecms-6d551`).
2. Service account JSON: Firebase Console → **Service accounts** → **Generate new private key** (often already saved as `*firebase-adminsdk*.json` beside `google-services.json`).
3. In `.env.integrations`, point `FIREBASE_SERVICE_ACCOUNT_FILE` at that JSON (not `google-services.json` — that file is Android-only).

Push script uploads to `/etc/ecms/firebase-credentials.json` and sets:

```ini
FIREBASE_CREDENTIALS_PATH=/etc/ecms/firebase-credentials.json
```

**Android:** trucker app must register FCM token via ICS API (`IPushNotificationService`). Rebuild app after API is configured.

Verify: `curl http://201.18.216.37/health` → `push.configured: true`

---

## Redis

| Item | Notes |
|------|--------|
| **Push notifications** | Use **Firebase**, not Redis |
| **Redis today** | Env var is stored for **Phase 2** (cache, shared rate limits). App does not require it to run |
| **Olive VPS** | Local Redis: `python scripts/vps/remote_install_redis.py` → `ConnectionStrings__Redis=127.0.0.1:6379` |
| **Railway** | Add Redis plugin → `ConnectionStrings__Redis` = Railway Redis URL |

---

## Railway (legacy site)

Same variable names in **Railway → Variables** (use `__` for nested Logicteck keys). Set `Logicteck__PublicApiBaseUrl` to `https://ecms-production-42be.up.railway.app` and `PUBLIC_FRONTEND_URL` to the deepskyblue Hostinger URL.

Firebase on Railway: paste minified JSON into `FIREBASE_CREDENTIALS_JSON` (no file upload).
