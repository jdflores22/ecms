# LOGICTECK integration — setup guide

How ICS (ECMS) connects to **LOGICTECK** for empty container return bookings.

| System | Role |
|--------|------|
| **ICS** | Pre-forecast workflow, transfer QR, **data transfer only** |
| **LOGICTECK** | Empty return **booking** (created and held on their side) |

ICS pre-forecast status stays **Approved** after transfer. It does **not** become “Booked” in ICS — `isBooked` on the public API means **LOGICTECK confirmed the empty return** (`ack-booking` or legacy ICS push), not an ICS workflow state.

---

## LOGICTECK API test harness (`logicteck-test.html`)

Standalone page for the **LOGICTECK team** — exercise the same public ICS APIs your Java/Firebase backend will call. **No ICS trucker login**; only `X-Logicteck-Api-Key` and an ICS transfer reference.

| Environment | URL |
|-------------|-----|
| **Local (Vite)** | [http://localhost:5173/logicteck-test.html](http://localhost:5173/logicteck-test.html) |
| **Local with reference** | `http://localhost:5173/logicteck-test.html?qr=ICS-202600018` or `?icsRef=ICS-202600018` |
| **Production (static host)** | `https://deepskyblue-marten-415020.hostingersite.com/logicteck-test.html` |

**File in repo:** `frontend/public/logicteck-test.html` (served as static asset by the ICS frontend).

### Prerequisites (local)

1. **API:** `dotnet run` in `backend/ECMS.API` → `http://localhost:5275`
2. **Frontend:** `npm run dev` in `frontend` → port **5173**
3. On the test page, set **ICS API base URL** to `http://localhost:5275`
4. **API key:** same as `Logicteck:ApiKey` in `appsettings.Development.json` (local default: `dev-logicteck-local-key`)

### Recommended test sequence (aligned with production)

| Step | Action on test page | Maps to LOGICTECK product |
|------|---------------------|---------------------------|
| 1 | **Load transfer dossier** | Your **new-return** screen calls `GET …/dossier` server-side after reading `?icsRef=` |
| 2 | **Ack booking** (enter a fake `LT-…` reference) | After user clicks **Confirm** on [new-return](https://logicteck-cy--logicteck-cy-playground.asia-southeast1.hosted.app/dashboard/bookings/new-return), your backend calls `POST …/ack-booking` |
| 3 | Reload dossier — `isBooked: true` | ICS trucker UI shows “Booked on LOGICTECK” |
| 4 | **Simulate depot gate QR check** | `POST …/validate-qr` — once per transfer (B2B: include `containerNo`) |
| 5 | (Optional) **Status callback** | `POST …/callback` for yard lifecycle (`with_trucker`, `at_yard`, …) |

**Open LOGICTECK playground (manual):** the test page includes a link to  
`https://logicteck-cy--logicteck-cy-playground.asia-southeast1.hosted.app/dashboard/bookings/new-return?icsRef={reference}` — same deep link ICS truckers get from **Open LOGICTECK to confirm return**.

**Copy curl** buttons on the page match the examples in [LOGICTECK-API-HANDOFF.md](./LOGICTECK-API-HANDOFF.md).

---

## End-to-end flow

```mermaid
sequenceDiagram
    participant Trucker as Trucker (ICS UI)
    participant ICS as ICS API
    participant LT as LOGICTECK

    Note over ICS: Pre-forecast approved, depot confirms return
    ICS->>ICS: Publish transfer QR (e.g. ICS-202600018)

    Trucker->>ICS: Open LOGICTECK (new-return?icsRef=…)
    Trucker->>LT: Confirm empty return on LOGICTECK UI
    LT->>ICS: GET /api/logicteck/booking/{qrCode}/dossier
    ICS-->>LT: pre-forecast + photos
    LT->>ICS: POST /api/logicteck/ack-booking { reference }
    ICS->>ICS: LogicteckBookedAt set (isBooked)

    LT->>ICS: GET /api/logicteck/booking/{qrCode}
    ICS-->>LT: isBooked: true, isRetrieved: false

    Note over LT: Gate scan
    LT->>ICS: POST /api/logicteck/validate-qr
    ICS-->>LT: valid: true
    ICS->>ICS: QR marked Retrieved (IsUsed)
```

---

## Configuration

### Backend (`appsettings.json` / production)

Section: `Logicteck` in `backend/ECMS.API/appsettings.json` or `appsettings.Production.example.json`.

| Key | Required | Description |
|-----|----------|-------------|
| `ApiKey` | Recommended in production | Shared secret. When set, LOGICTECK must send header `X-Logicteck-Api-Key` on public ICS endpoints. ICS also sends this header on outbound POSTs to LOGICTECK. |
| `PublicApiBaseUrl` | Yes | Public ICS API base URL embedded in new QR payloads (e.g. `https://api.your-domain.com`). Used for validate URL in QR. |
| `NewReturnUrl` | **Recommended** | LOGICTECK page where truckers **confirm** the return (e.g. `…/dashboard/bookings/new-return`). ICS opens `{NewReturnUrl}?{IcsRefQueryParam}=ICS-…`. |
| `IcsRefQueryParam` | Optional | Query key for the ICS reference (default `icsRef`). |
| `BookUrl` | Optional (legacy push) | LOGICTECK endpoint that **receives** a POST when ICS push transfer is used. Not required for pull + ack flow. |
| `PortalUrl` | Optional | Fallback if `NewReturnUrl` is empty. |
| `EmptyReturnUrl` | Optional | LOGICTECK endpoint for full empty-return form + photos. Falls back to `BookUrl` if empty. |
| `AutoTransferOnQrPublish` | Optional | Default **`false`** — do not POST to `BookUrl` when QR is published. |

**Local development defaults** (`appsettings.json`):

```json
"Logicteck": {
  "ApiKey": "",
  "PublicApiBaseUrl": "http://localhost:5275",
  "BookUrl": "",
  "PortalUrl": "",
  "EmptyReturnUrl": ""
}
```

**Production example** (`appsettings.Production.example.json`):

```json
"Logicteck": {
  "ApiKey": "CHANGE-ME-logicteck-shared-secret",
  "PublicApiBaseUrl": "https://your-api.example.com",
  "BookUrl": "https://logicteck.example.com/api/receive-preadvice",
  "PortalUrl": "https://logicteck.example.com/portal",
  "EmptyReturnUrl": "https://logicteck.example.com/api/empty-return"
}
```

### Environment variable overrides

ASP.NET Core binds nested config with `__`:

| Variable | Maps to |
|----------|---------|
| `Logicteck__ApiKey` | `Logicteck:ApiKey` |
| `Logicteck__PublicApiBaseUrl` | `Logicteck:PublicApiBaseUrl` |
| `Logicteck__BookUrl` | `Logicteck:BookUrl` |
| `Logicteck__PortalUrl` | `Logicteck:PortalUrl` |
| `Logicteck__NewReturnUrl` | `Logicteck:NewReturnUrl` |
| `Logicteck__IcsRefQueryParam` | `Logicteck:IcsRefQueryParam` |
| `Logicteck__AutoTransferOnQrPublish` | `Logicteck:AutoTransferOnQrPublish` |
| `Logicteck__EmptyReturnUrl` | `Logicteck:EmptyReturnUrl` |

Set these in Railway, Hostinger VPS, or `backend/ECMS.API/.env.production` (see `.env.production.example` for other keys).

## ICS pages (internal)

| Route | Purpose |
|-------|---------|
| `/trucker/qr` | Transfer QR after payment verification (also from My returns) |
| `/trucker/qr/print/{id}` | Printable QR pass |
| `/preforecast/{id}?tab=qr` | Pre-forecast QR + **Open LOGICTECK to confirm return** |
| `/preforecast/{id}?tab=overview` | Full pre-forecast dossier with container photos |

**Open LOGICTECK to confirm return** opens `NewReturnUrl` with the ICS reference (`GET /api/qr/logicteck-handoff` supplies the base URL). After LOGICTECK saves the booking, call `POST /api/logicteck/ack-booking`. Legacy push: `POST /api/qr/{id}/book-logicteck` when `BookUrl` is set.

**LOGICTECK integration testing:** use [logicteck-test.html](http://localhost:5173/logicteck-test.html) (see section above). API contract details: [LOGICTECK-API-HANDOFF.md](./LOGICTECK-API-HANDOFF.md).

---

## Public APIs (LOGICTECK → ICS)

Base URL: `{PublicApiBaseUrl}`  
Controller: `LogicteckController` in `backend/ECMS.API/Controllers/QrController.cs`

Optional auth (when `Logicteck:ApiKey` is set):

```http
X-Logicteck-Api-Key: your-shared-secret
```

### 1. Lookup booking (read-only)

Does **not** mark the QR as retrieved.

```http
GET /api/logicteck/booking/{qrCode}
```

**Example:** `GET http://localhost:5275/api/logicteck/booking/ICS-202600018`

**200 OK — found:**

```json
{
  "found": true,
  "message": null,
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

**404 — not found:**

```json
{
  "found": false,
  "message": "Booking reference not found.",
  "isBooked": false,
  "isRetrieved": false
}
```

| Field | Meaning |
|-------|---------|
| `isBooked` | ICS has sent pre-forecast data to LOGICTECK (`LogicteckBookedAt` set) |
| `isRetrieved` | LOGICTECK gate validated the QR (`IsUsed` — one-time) |

### 2. Ack booking (LOGICTECK → ICS)

After the trucker confirms on LOGICTECK:

```http
POST /api/logicteck/ack-booking
Content-Type: application/json
X-Logicteck-Api-Key: {shared-secret}

{
  "qrCode": "ICS-202600018",
  "reference": "YOUR-LOGICTECK-BOOKING-ID"
}
```

Sets `isBooked` / `LogicteckBookedAt` on ICS without ICS pushing data.

### 3. Validate QR (gate scan)

Marks QR as **Retrieved** on first successful call.

```http
POST /api/logicteck/validate-qr
Content-Type: application/json

{
  "qrCode": "ICS-202600018"
}
```

**200 OK — valid (first scan):**

```json
{
  "valid": true,
  "message": "Valid booking.",
  "bookingReference": "ICS-202600018",
  "containerNo": "TEST66C4135",
  "shippingLine": "...",
  "trucker": "...",
  "preAdviceReference": "PA-2026-00058",
  "scheduledDate": "2026-06-27",
  "scheduledTime": "08:00",
  "depot": "ESAFE"
}
```

**200 OK — already retrieved:**

```json
{
  "valid": false,
  "message": "QR already retrieved by LOGICTECK."
}
```

---

## Outbound transfer (ICS → LOGICTECK)

When a trucker clicks **Send to LOGICTECK** in ICS:

```http
POST /api/qr/{bookingId}/book-logicteck
Authorization: Bearer {ICS JWT}
```

ICS then POSTs to `Logicteck:BookUrl`:

```http
POST {BookUrl}
Content-Type: application/json
X-Logicteck-Api-Key: {ApiKey}

{
  "bookingReference": "ICS-202600018",
  "containerNo": "TEST66C4135",
  "shippingLine": "ASEAN SEAS LINE CO., LTD.",
  "trucker": "ABC Trucking",
  "preAdviceReference": "PA-2026-00058",
  "scheduledDate": "2026-06-27",
  "scheduledTime": "08:00",
  "depot": "ESAFE"
}
```

**Expected LOGICTECK response (2xx):**

```json
{
  "reference": "LOGICTECK-REF-123"
}
```

ICS stores `reference` as `LogicteckExternalRef` and sets `LogicteckBookedAt`.

If `BookUrl` is empty, ICS skips the HTTP call and still marks data as sent (useful for local dev).

Implementation: `LogicteckOutboundClient` in `backend/ECMS.Infrastructure/Services/LogicteckOutboundClient.cs`.

---

## Empty return form (optional, with photos)

Authenticated ICS endpoint:

```http
POST /api/logicteck/empty-return/submit
Authorization: Bearer {ICS JWT}
Content-Type: multipart/form-data
```

Forwards a richer payload (driver, plate, damage views, base64 photos) to `EmptyReturnUrl` (or `BookUrl`). See `LogicteckEmptyReturnTransmissionPayload` in `backend/ECMS.Application/DTOs/Logicteck/LogicteckEmptyReturnDtos.cs`.

UI sample: `/logicteck/empty-return`.

---

## QR code content

When ICS generates a transfer QR after depot confirmation, the payload includes:

- ICS QR reference (`bookingReference`, e.g. `ICS-202600018`)
- Container, shipping line, depot, schedule, trucker
- `validateUrl`: `{PublicApiBaseUrl}/api/logicteck/validate-qr`

LOGICTECK can scan the QR or use the reference string with the lookup/validate APIs.

---

## Status labels (ICS UI vs public API)

| ICS UI label | Backend `logicteckStatus` | Public API |
|--------------|---------------------------|------------|
| Confirm on LOGICTECK (legacy: Book with LOGICTECK / Ready to send) | `Available` | `isBooked: false`, `isRetrieved: false` |
| Booked on LOGICTECK | `Booked` | `isBooked: true`, `isRetrieved: false` |
| Retrieved | `Retrieved` | `isRetrieved: true` |

Pre-forecast workflow status in ICS remains **Approved** — it does not change to “Booked” when LOGICTECK receives data.

---

## Local setup checklist

1. **Start API:** `cd backend/ECMS.API && dotnet run --urls "http://localhost:5275"`
2. **Start frontend:** `cd frontend && npm run dev` → `http://localhost:5173`
3. Complete flow in ICS: pre-forecast → approval → depot schedule → return confirmed → transfer QR published
4. **Trucker:** `/preforecast/{id}?tab=qr` → **Open LOGICTECK to confirm return** (deep link with `icsRef`)
5. **LOGICTECK devs:** [http://localhost:5173/logicteck-test.html?icsRef=ICS-…](http://localhost:5173/logicteck-test.html) — dossier → **Ack booking** → validate; or curl:

```bash
curl -s "http://localhost:5275/api/logicteck/booking/ICS-202600018"
```

```bash
curl -s -X POST "http://localhost:5275/api/logicteck/validate-qr" \
  -H "Content-Type: application/json" \
  -d "{\"qrCode\":\"ICS-202600018\"}"
```

With API key enabled:

```bash
curl -s "https://your-api.example.com/api/logicteck/booking/ICS-202600018" \
  -H "X-Logicteck-Api-Key: your-shared-secret"
```

---

## Production go-live checklist

### ICS team

- [ ] Set `Logicteck__PublicApiBaseUrl` to production API URL (must match QR validate URLs)
- [ ] Generate and share `Logicteck__ApiKey` with LOGICTECK
- [ ] Confirm CORS includes production frontend origin
- [ ] Run database migrations (includes `LogicteckBookedAt`, `LogicteckExternalRef` on `QRBookings`)
- [ ] Test full flow on [logicteck-test.html](http://localhost:5173/logicteck-test.html) (dossier → ack → validate)

### LOGICTECK team

- [ ] **new-return** reads `icsRef` query param; server-side `GET …/dossier` with `X-Logicteck-Api-Key`
- [ ] On booking confirm, `POST …/ack-booking` with `{ "qrCode", "reference" }` (use `transferLink.ackBookingUrl`)
- [ ] Gate: `POST …/validate-qr` (+ `containerNo` for back-to-back)
- [ ] Smoke-test with ICS [logicteck-test.html](http://localhost:5173/logicteck-test.html) before wiring your Firebase/Cloud Function
- [ ] (Optional legacy) inbound `BookUrl` push from ICS — not required for pull + ack flow
- [ ] (Optional) `EmptyReturnUrl` for multipart photo POST from ICS

---

## What LOGICTECK receives today vs not

| Data | Public lookup/validate | Outbound BookUrl POST | Empty return POST |
|------|------------------------|----------------------|-------------------|
| Container no, line, trucker | Yes | Yes | Yes |
| Pre-forecast ref, schedule, depot | Yes | Yes | Yes |
| `isBooked` / `isRetrieved` | Yes | N/A | N/A |
| Container identity photos | **No** | **No** | Yes (base64) |
| Full pre-forecast dossier | **No** | **No** | Partial |

Photos visible in ICS (`/preforecast/{id}?tab=overview`) are for internal verification unless sent via the empty-return integration.

---

## Security notes (review checklist)

| Risk | Mitigation in ICS |
|------|-------------------|
| Public LOGICTECK APIs without key | **Production:** `Logicteck:ApiKey` required — missing key returns **503** on `/api/logicteck/*`. |
| Dev/staging with empty `ApiKey` | Endpoints are open on localhost — do not expose dev API to the public internet without a key. |
| Fake `isBooked` without LOGICTECK | **Fixed:** legacy `book-logicteck` no longer sets `LogicteckBookedAt` when `BookUrl` is empty; use **ack-booking** after LOGICTECK confirm. |
| Gate validate on **no show** / unpaid schedule | **Fixed:** `validate-qr` and `ack-booking` only accept **Confirmed** or **Completed** schedules. |
| Ack with arbitrary reference | Allowed only with valid `X-Logicteck-Api-Key` — store key server-side on LOGICTECK, never in Firebase client. |

---

## Audit events

| Action | Audit code |
|--------|------------|
| Send to LOGICTECK | `LOGICTECK_BOOK` |
| Gate validate QR | `LOGICTECK_VALIDATE_QR` |

---

## Related docs

- **LOGICTECK team handoff (QR / reference + credentials):** [LOGICTECK-API-HANDOFF.md](./LOGICTECK-API-HANDOFF.md)
- Railway deploy: [RAILWAY-DEPLOY.md](./RAILWAY-DEPLOY.md)

## Related files

| Area | Path |
|------|------|
| Public API controller | `backend/ECMS.API/Controllers/QrController.cs` |
| QR / transfer logic | `backend/ECMS.Infrastructure/Services/QrCodeService.cs` |
| Outbound HTTP client | `backend/ECMS.Infrastructure/Services/LogicteckOutboundClient.cs` |
| Config model | `backend/ECMS.Application/Configuration/LogicteckOptions.cs` |
| API key filter | `backend/ECMS.API/Filters/LogicteckApiKeyFilter.cs` |
| Integration tests | `backend/ECMS.API.Tests/LogicteckIntegrationTests.cs` |
| Frontend labels | `frontend/src/config/logicteckQr.ts` |

---

## Handoff summary for LOGICTECK

Give their integration team:

1. **ICS public API base URL** (`PublicApiBaseUrl`)
2. **Shared API key** (`X-Logicteck-Api-Key`)
3. **Their receive endpoint URL** (you configure as `BookUrl`)
4. This document (or the two public endpoints + outbound payload above)
5. A **test QR reference** (e.g. `ICS-202600018`) after one successful ICS flow

**Remember:** the return booking is created and owned by **LOGICTECK**. ICS only transfers approved pre-forecast data and tracks send/retrieve status on the transfer QR.
