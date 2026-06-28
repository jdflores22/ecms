# LOGICTECK — API handoff (transfer data via ICS reference / QR)

Give this document to the **LOGICTECK team**. It explains how to pull approved pre-advice data from ICS **without ICS login** — using the **ICS QR reference** (e.g. `ICS-202600018`) or the value encoded in the transfer QR.

ICS does **not** hold the empty return booking. LOGICTECK creates and owns the booking on your side after you receive the data.

---

## What LOGICTECK needs from ICS (credentials)

| Item | Value | Notes |
|------|--------|--------|
| **ICS API base URL** | `https://ecms-production-42be.up.railway.app` | Production (Railway). No trailing slash. |
| **API key header** | `X-Logicteck-Api-Key` | Shared secret — **ICS admin sends separately** (not in git). |
| **ICS reference format** | `ICS-YYYY#####` | Same as QR code text / booking reference. |
| **ICS JWT / login** | **Not required** | Public endpoints only. |

**Local / staging (ICS dev):**

| Item | Value |
|------|--------|
| API base URL | `http://localhost:5275` |
| API key | Request from ICS dev team (see `appsettings.json` or admin) |

---

## How LOGICTECK uses the ICS reference (no full QR scan required)

Trucker receives a **transfer QR** from ICS after depot confirms the return. LOGICTECK can integrate in either way:

1. **Type or paste the ICS reference** — e.g. `ICS-202600018` — into your empty-return / gate screen.
2. **Scan the QR** — payload includes the same reference plus container, line, schedule, depot, trucker.

Then call ICS **lookup** to load the data before creating the booking in LOGICTECK.

At **gate**, call ICS **validate** once to mark the transfer as retrieved in ICS.

---

## Public API endpoints (LOGICTECK → ICS)

All requests use:

```http
X-Logicteck-Api-Key: {shared-secret-from-ICS}
Accept: application/json
```

### 1. Lookup by ICS reference (read-only)

```http
GET https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018
X-Logicteck-Api-Key: {your-key}
```

Lightweight summary only (no photos). Use dossier endpoint below for full data.

### 2. Full dossier with photos (recommended)

Returns pre-advice details, schedule, QR image (base64), and **container photo URLs**.

```http
GET https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018/dossier
X-Logicteck-Api-Key: {your-key}
```

**Success (200)** includes:

- All lookup fields (`isBooked`, `isRetrieved`, container, depot, schedule, …)
- `preAdvice` — reference, status, trucker, line, container size/type, remarks
- `schedule` — depot, slot, status
- `qrBooking` — ICS reference, status, `qrImageBase64` (PNG data URL)
- `documents[]` — each photo with `categoryLabel`, `url` (full URL on ICS API), `comment` for damage

**Example document entry:**

```json
{
  "category": "Front",
  "categoryLabel": "Front",
  "comment": null,
  "fileName": "photo.jpg",
  "contentType": "image/jpeg",
  "fileSize": 245000,
  "url": "https://ecms-production-42be.up.railway.app/uploads/abc123.jpg"
}
```

**Lookup-only response (section 1):**

```json
{
  "found": true,
  "bookingReference": "ICS-202600018",
  "containerNo": "TEST66C4135",
  "shippingLine": "ASEAN SEAS LINE CO., LTD.",
  "trucker": "ABC Trucking",
  "preAdviceReference": "PA-2026-00058",
  "scheduledDate": "2026-06-27",
  "scheduledTime": "08:00",
  "depot": "ESAFE",
  "isBooked": true,
  "isRetrieved": false
}
```

| Field | Meaning for LOGICTECK |
|-------|------------------------|
| `bookingReference` | ICS transfer ID — store as external link |
| `preAdviceReference` | ICS pre-advice number |
| `isBooked` | Trucker sent data to LOGICTECK from ICS (`true` after ICS transfer) |
| `isRetrieved` | Gate validated in ICS (`true` after validate call) |

**Not found (404):** invalid or unpublished reference.

**Unauthorized (401):** missing or wrong API key.

### 3. Validate at gate (one-time)

Marks QR as **Retrieved** in ICS. Call only when container passes gate.

```http
POST https://ecms-production-42be.up.railway.app/api/logicteck/validate-qr
Content-Type: application/json
X-Logicteck-Api-Key: {your-key}

{
  "qrCode": "ICS-202600018"
}
```

**First successful scan (200):**

```json
{
  "valid": true,
  "message": "Valid booking.",
  "bookingReference": "ICS-202600018",
  "containerNo": "...",
  "shippingLine": "...",
  "trucker": "...",
  "preAdviceReference": "PA-2026-00058",
  "scheduledDate": "2026-06-27",
  "scheduledTime": "08:00",
  "depot": "ESAFE"
}
```

**Already used (200, valid: false):**

```json
{
  "valid": false,
  "message": "QR already retrieved by LOGICTECK."
}
```

---

## Optional: ICS pushes data to LOGICTECK (outbound)

When trucker clicks **Send to LOGICTECK** in ICS, ICS can **POST** to a URL you provide (`Logicteck:BookUrl` on ICS server):

```json
{
  "bookingReference": "ICS-202600018",
  "containerNo": "...",
  "shippingLine": "...",
  "trucker": "...",
  "preAdviceReference": "PA-2026-00058",
  "scheduledDate": "2026-06-27",
  "scheduledTime": "08:00",
  "depot": "ESAFE"
}
```

Respond with:

```json
{ "reference": "YOUR-LOGICTECK-BOOKING-ID" }
```

**Phase 1 (current):** LOGICTECK can rely on **lookup + validate only** using the ICS reference — no inbound URL required yet.

---

## What is NOT in the public API

| Data | Lookup | Dossier |
|------|--------|---------|
| Container no, line, trucker, schedule, depot | Yes | Yes |
| Pre-advice details (remarks, size, type) | Partial | Yes |
| Container identity photos | No | **Yes** (`documents[].url`) |
| QR image | No | **Yes** (`qrBooking.qrImageBase64`) |

---

## Test without ICS login

### Standalone test page (outside ICS app)

No ICS account needed. Open in any browser:

| Environment | URL |
|-------------|-----|
| **Production** | https://deepskyblue-marten-415020.hostingersite.com/logicteck-test.html |
| **Local** | http://localhost:5173/logicteck-test.html |

Enter:

1. ICS API base URL → `https://ecms-production-42be.up.railway.app`
2. API key → (from ICS admin)
3. ICS reference → e.g. `ICS-202600018`

Click **Lookup** or **Validate gate**.

### curl (Postman)

```bash
curl -s "https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018" \
  -H "X-Logicteck-Api-Key: YOUR-KEY" \
  -H "Accept: application/json"
```

```bash
curl -s -X POST "https://ecms-production-42be.up.railway.app/api/logicteck/validate-qr" \
  -H "Content-Type: application/json" \
  -H "X-Logicteck-Api-Key: YOUR-KEY" \
  -d "{\"qrCode\":\"ICS-202600018\"}"
```

---

## ICS admin checklist (Railway)

Set in **Railway → Variables** (then redeploy):

| Variable | Example |
|----------|---------|
| `Logicteck__ApiKey` | `{shared-secret — send to LOGICTECK}` |
| `Logicteck__PublicApiBaseUrl` | `https://ecms-production-42be.up.railway.app` |
| `Logicteck__BookUrl` | *(empty until LOGICTECK provides receive URL)* |

---

## Flow summary

```
ICS (approved pre-advice) → transfer QR / reference ICS-202600018
         │
         ▼
LOGICTECK operator enters reference OR scans QR
         │
         ▼
GET /api/logicteck/booking/{reference}  →  pre-fill empty return form
         │
         ▼
LOGICTECK creates booking on YOUR system
         │
         ▼
Gate: POST /api/logicteck/validate-qr  →  ICS marks Retrieved
```

---

## Related docs

- Full ICS setup: [LOGICTECK-INTEGRATION.md](./LOGICTECK-INTEGRATION.md)
- Railway deploy: [RAILWAY-DEPLOY.md](./RAILWAY-DEPLOY.md)
