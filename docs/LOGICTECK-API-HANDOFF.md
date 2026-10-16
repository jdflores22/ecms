# LOGICTECK — API handoff (transfer data via ICS reference / QR)

Give this document to the **LOGICTECK team**. It explains how to pull approved pre-forecast data from ICS **without ICS login** — using the **ICS QR reference** (e.g. `ICS-202600018`) or the value encoded in the transfer QR.

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

Then call ICS **lookup** or **dossier** to load the data before creating the booking in LOGICTECK.

Every response includes a **`transferLink`** object — store it on your booking record and reuse the URLs for all future API calls. No ICS login or shared user accounts.

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

Returns pre-forecast details, schedule, QR image (base64), and **container photo URLs**.

```http
GET https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018/dossier
X-Logicteck-Api-Key: {your-key}
```

**Success (200)** includes:

- All lookup fields (`isBooked`, `isRetrieved`, container, depot, schedule, …)
- `preAdvice` — reference, status, trucker, line, container size/type, remarks, **`isBackToBack`** with companion **`backToBackCompanionContainerNo`**, **`backToBackCompanionContainerSize`**, **`backToBackCompanionContainerType`** (second 20ft to the same yard)
- `schedule` — depot, slot, status
- `qrBooking` — ICS reference, status, `qrImageBase64` (PNG data URL)
- `documents[]` — each photo with `categoryLabel`, `url` (full URL on ICS API), `comment` for damage
- **8 required views** (Flooring, sides, front/back, back door), **required `CscPlate`** (CSC plate photo), plus **optional `Others`** when the trucker uploads extra photos

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
  "isRetrieved": false,
  "transferLink": {
    "transferReference": "ICS-202600018",
    "icsTruckerId": 12,
    "icsTruckerUsername": "trucker1",
    "icsTruckerName": "ABC Trucking",
    "icsPreAdviceId": 58,
    "icsPreAdviceReference": "PA-2026-00058",
    "icsScheduleId": 18,
    "icsQrBookingId": 7,
    "lookupUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018",
    "dossierUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018/dossier",
    "validateUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/validate-qr",
    "ackBookingUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/ack-booking",
    "callbackUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/callback"
  }
}
```

| Field | Meaning for LOGICTECK |
|-------|------------------------|
| `transferLink` | **Permanent connection** — save on your booking; reuse URLs every time |
| `transferLink.transferReference` | Same as `bookingReference` — your external ICS key |
| `transferLink.icsTruckerName` | Trucker name from ICS (text only — not a LOGICTECK user ID) |
| `transferLink.lookupUrl` / `dossierUrl` / `validateUrl` / `ackBookingUrl` | Ready-made endpoints — no URL construction needed |

**Dossier responses include the same `transferLink` block.**

| Field | Meaning for LOGICTECK |
|-------|------------------------|
| `bookingReference` | ICS transfer ID — store as external link |
| `preAdviceReference` | ICS pre-forecast number |
| `isBooked` | LOGICTECK confirmed the empty return on your side (`true` after **ack-booking**, or legacy ICS push to `BookUrl`) |
| `isRetrieved` | Gate validated in ICS (`true` after validate call) |

**Not found (404):** invalid or unpublished reference.

**Unauthorized (401):** missing or wrong API key.

### 3. Acknowledge booking (after trucker confirms on LOGICTECK)

ICS does **not** create the empty-return booking. The trucker opens LOGICTECK (e.g. **new return**), ICS data is loaded via **dossier**, and the user clicks **Confirm** on LOGICTECK. Then your backend calls:

```http
POST https://ecms-production-42be.up.railway.app/api/logicteck/ack-booking
Content-Type: application/json
X-Logicteck-Api-Key: {your-key}

{
  "qrCode": "ICS-202600018",
  "reference": "YOUR-LOGICTECK-BOOKING-ID"
}
```

**Success (200):**

```json
{
  "accepted": true,
  "duplicate": false,
  "message": "Booking acknowledged on ICS.",
  "bookingReference": "ICS-202600018",
  "externalReference": "YOUR-LOGICTECK-BOOKING-ID",
  "isBooked": true
}
```

After this, lookup/dossier return `isBooked: true`. Gate flow is unchanged (**validate-qr**).

### 4. Trucker deep link (ICS UI)

ICS opens LOGICTECK with the transfer reference in the query string (config: `Logicteck:NewReturnUrl`, `Logicteck:IcsRefQueryParam`, default `icsRef`):

```text
https://logicteck-cy--logicteck-cy-playground.asia-southeast1.hosted.app/dashboard/bookings/new-return?icsRef=ICS-202600018
```

On page load, read `icsRef`, call **dossier** server-side, pre-fill the form, and let the user confirm. No ICS login on LOGICTECK is required for Phase 1.

### 5. Validate at gate (one-time)

Marks QR as **Retrieved** in ICS. Call only when container passes gate.

```http
POST https://ecms-production-42be.up.railway.app/api/logicteck/validate-qr
Content-Type: application/json
X-Logicteck-Api-Key: {your-key}

{
  "qrCode": "ICS-202600018",
  "containerNo": "ABCD1234567"
}
```

For **back-to-back** pre-forecasts (two 20 ft containers, **one** ICS transfer reference / QR image), send the **same** `qrCode` on each gate scan and set `containerNo` to the unit being checked. ICS marks the QR **retrieved** only after **both** containers validate. Use `GET .../dossier` for `isBackToBack`, companion container, and photos — not a second QR reference.

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

**Recommended:** pull-only — trucker opens LOGICTECK **new-return** with `?icsRef=…`, you load **dossier**, user confirms, then **ack-booking**. Keep `Logicteck:AutoTransferOnQrPublish` **`false`**.

**Optional legacy push:** when the transfer QR is published, ICS can POST to `Logicteck:BookUrl` if `AutoTransferOnQrPublish` is `true`. The old trucker **book-logicteck** API still pushes to `BookUrl` when configured.

```json
{
  "bookingReference": "ICS-202600018",
  "containerNo": "...",
  "shippingLine": "...",
  "trucker": "ABC Trucking",
  "truckerUsername": "trucker1",
  "icsTruckerId": 12,
  "preAdviceReference": "PA-2026-00058",
  "icsPreAdviceId": 58,
  "icsScheduleId": 18,
  "icsQrBookingId": 7,
  "scheduledDate": "2026-06-27",
  "scheduledTime": "08:00",
  "depot": "ESAFE",
  "lookupUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018",
  "dossierUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/booking/ICS-202600018/dossier",
  "validateUrl": "https://ecms-production-42be.up.railway.app/api/logicteck/validate-qr"
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
| Pre-forecast details (remarks, size, type) | Partial | Yes |
| Container identity photos | No | **Yes** (`documents[].url`) |
| QR image | No | **Yes** (`qrBooking.qrImageBase64`) |

---

## Test without ICS login

### Standalone test page (outside ICS app)

No ICS account needed. Full walkthrough (dossier → **ack-booking** → validate): **[LOGICTECK-INTEGRATION.md](./LOGICTECK-INTEGRATION.md#logicteck-api-test-harness-logicteck-testhtml)**.

| Environment | URL |
|-------------|-----|
| **Local** | [http://localhost:5173/logicteck-test.html](http://localhost:5173/logicteck-test.html) |
| **Local with ref** | `http://localhost:5173/logicteck-test.html?icsRef=ICS-202600018` |
| **Production** | https://deepskyblue-marten-415020.hostingersite.com/logicteck-test.html |

Enter:

1. ICS API base URL → `http://localhost:5275` (local) or production API URL
2. API key → (from ICS admin / `Logicteck:ApiKey`)
3. ICS reference → e.g. `ICS-202600018`

Use **Load transfer dossier**, **POST ack-booking**, then **Simulate depot gate QR check**.

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
| `Logicteck__AutoTransferOnQrPublish` | `true` (default) — POST to BookUrl when QR is published |

---

## Permanent connection pattern (recommended)

LOGICTECK should treat each ICS transfer as a **standalone link**, not a user account mapping:

1. Receive `transferReference` (from QR scan, lookup, dossier, or ICS outbound POST).
2. Store `transferLink` on your empty-return booking row.
3. For every screen refresh, gate check, or sync — call `transferLink.dossierUrl` or `lookupUrl` with `X-Logicteck-Api-Key`.
4. At gate — `POST` to `transferLink.validateUrl` with `{ "qrCode": "<transferReference>" }`.

Trucker identity is **text from ICS** (`icsTruckerName`, `icsTruckerUsername`) — display only; no JWT or shared login.

---

## Flow summary

```
ICS (payment verified) → transfer QR / reference ICS-202600018
         │
         ▼
Trucker: Open LOGICTECK (new-return?icsRef=ICS-…) from ICS QR tab
         │
         ▼
LOGICTECK server: GET /api/logicteck/booking/{ref}/dossier  →  pre-fill form
         │
         ▼
Trucker confirms booking on LOGICTECK UI
         │
         ▼
LOGICTECK server: POST /api/logicteck/ack-booking  →  ICS isBooked = true
         │
         ▼
Gate: POST /api/logicteck/validate-qr  →  ICS marks Retrieved
```

---

## Related docs

- Full ICS setup: [LOGICTECK-INTEGRATION.md](./LOGICTECK-INTEGRATION.md)
- Railway deploy: [RAILWAY-DEPLOY.md](./RAILWAY-DEPLOY.md)
