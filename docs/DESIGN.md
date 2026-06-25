# ICS System Design

> **Last updated:** 2026-06-23  
> Companion: [PLAN.md](./PLAN.md) · [TASKS.md](./TASKS.md)

---

## 1. Architecture overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                          │
│  Login │ Dashboards │ Pre-Advice │ Evaluation │ Schedule │ QR   │
│              Redux Toolkit  +  Axios  +  MUI                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / REST (JWT Bearer)
┌────────────────────────────▼────────────────────────────────────┐
│                     ICS API (ASP.NET Core 7)                     │
│  Controllers → Application Interfaces → Infrastructure Services  │
└──────┬──────────────────────────────┬───────────────────────────┘
       │                              │
┌──────▼──────┐                ┌──────▼──────┐
│  MySQL 8    │                │  Redis 7    │
│  (EF Core)  │                │  (Phase 2)  │
└─────────────┘                └─────────────┘
       │
┌──────▼──────────────────────────────────────┐
│  LOGICTECK Gate System (Phase 3)            │
│  POST /api/logicteck/validate-qr            │
└─────────────────────────────────────────────┘
```

### Clean architecture layers

| Layer | Project | Responsibility |
|-------|---------|----------------|
| **Domain** | `ECMS.Domain` | Entities, enums, business constants |
| **Application** | `ECMS.Application` | DTOs, service contracts, use-case boundaries |
| **Infrastructure** | `ECMS.Infrastructure` | JWT, BCrypt, QR, service implementations |
| **Persistence** | `ECMS.Persistence` | DbContext, migrations, seed data |
| **API** | `ECMS.API` | HTTP endpoints, auth policies, file upload |

**Dependency rule:** API → Infrastructure + Persistence → Application → Domain. Domain has no outward dependencies.

---

## 2. Business process flow

```text
Broker                Shipping Line           Depot              Trucker
  │                        │                   │                   │
  ▼                        │                   │                   │
Create Pre-Advice          │                   │                   │
(Draft → Submitted)        │                   │                   │
  │───────────────────────►│                   │                   │
  │                   Evaluate                 │                   │
  │                   Approve + Assign CY      │                   │
  │                        │──────────────────►│                   │
  │                        │              Assign Date/Time/Slot    │
  │                        │                   │──────────────────►│
  │                        │                   │              Upload Payment
  │                        │                   │◄──────────────────│
  │                        │                   │            Verify Payment
  │                        │                   │                   │
  │                        │                   │         Generate QR Code
  │                        │                   │                   │
  │                        │                   │         Container Return
  │                        │                   │                   │
  └────────────────────────┴───────────────────┴───────────────────┘
                              LOGICTECK validates QR at gate
```

---

## 3. Status workflows

### Pre-Advice status

```text
Draft ──► Submitted ──► UnderEvaluation ──► Approved
              │              │                  │
              │              └────► Rejected    │
              └──────────────────► Cancelled     │
```

### Schedule status

```text
WaitingSchedule ──► Scheduled ──► Confirmed ──► Completed
                        │              │
                        └──── Cancelled ◄┘
```

### Payment status

```text
Pending ──► ForVerification ──► Paid
                    │
                    └────► Rejected
```

**Transition rules:**

| Event | Pre-Advice | Schedule | Payment |
|-------|------------|----------|---------|
| Broker submits | → Submitted | — | — |
| Evaluator approves | → Approved | → WaitingSchedule | — |
| Depot assigns slot | — | → Scheduled | — |
| Trucker uploads proof | — | — | → ForVerification |
| Staff verifies payment | — | → Confirmed | → Paid |
| QR generated | — | — | — (on payment verify) |
| Return completed | — | → Completed | — |

---

## 4. Data model (core entities)

```text
Role ──► User ──┬──► PreAdvice (Broker) ──► Evaluation ──► Depot
                │         │
ShippingLine ◄──┤         └──► Schedule ──┬──► Payment (Trucker)
                │                          └──► QRBooking
Container ◄─────┘
User ──► AuditLog
User ──► RefreshToken
```

### Key relationships

- One `PreAdvice` → one `Evaluation` (optional until reviewed)
- One `PreAdvice` → one `Schedule` (created on approval)
- One `Schedule` → one `Payment` (optional until trucker pays)
- One `Schedule` → one `QRBooking` (created after payment verified)

---

## 5. API design

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Issue access + refresh tokens |
| POST | `/api/auth/register` | Admin | Create user with role |
| POST | `/api/auth/refresh` | Public | Rotate tokens |
| POST | `/api/auth/logout` | Bearer | Revoke refresh token |

### Core modules

| Module | Base path | Roles |
|--------|-----------|-------|
| Pre-Advice | `/api/preadvice` | Broker (write), others (read scoped) |
| Evaluation | `/api/evaluations` | ShippingLineEvaluator |
| Schedule | `/api/schedules` | DepotPersonnel |
| Payment | `/api/payments` | Trucker (upload), Depot/Admin (verify) |
| QR | `/api/qr` | Authenticated + LOGICTECK (validate) |
| Dashboard | `/api/dashboard/{role}` | Per role |

### QR payload schema

```json
{
  "bookingId": "ICS-202600001",
  "containerNo": "TGHU1234567",
  "shippingLine": "MAERSK",
  "depot": "ICTSI CY",
  "scheduleDate": "2026-06-25",
  "scheduleTime": "08:00",
  "trucker": "ABC Trucking"
}
```

---

## 6. Frontend design

### Design tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#0B3D91` | Headers, nav, primary buttons |
| Secondary | `#00A3E0` | Accents, links |
| Background | `#F4F7FB` | Page background |
| Font | Inter | All UI text |
| Border radius | 10px | Cards, inputs |

### Layout structure

```text
┌──────────────────────────────────────────────────┐
│ AppBar — ICS title                               │
├──────────┬───────────────────────────────────────┤
│ Sidebar  │  Main content (Outlet)                │
│ - Dash   │                                       │
│ - Module │                                       │
│ - Logout │                                       │
└──────────┴───────────────────────────────────────┘
```

### Role-based navigation (planned)

| Role | Menu items |
|------|------------|
| Broker | Dashboard, Pre-Advice |
| ShippingLineEvaluator | Dashboard, Evaluations |
| DepotPersonnel | Dashboard, Schedules, Payment Verification |
| Trucker | Dashboard, My Schedules, Payments, QR Codes |
| Administrator | Dashboard, Users, Shipping Lines, Depots, Reports, Audit |

### Page inventory

| Page | Route | Status |
|------|-------|--------|
| Login | `/login` | Done |
| Dashboard | `/` | Done (generic cards) |
| Pre-Advice | `/preadvice` | Done (broker) |
| Evaluations | `/evaluations` | Planned |
| Schedules | `/schedules` | Planned |
| Payments | `/payments` | Planned |
| QR Codes | `/qr` | Planned |
| Admin Users | `/admin/users` | Planned |
| Reports | `/reports` | Planned |
| Audit Logs | `/admin/audit` | Planned |

---

## 7. Security design

| Concern | Approach |
|---------|----------|
| Authentication | JWT (60 min) + refresh token (7 days) |
| Authorization | ASP.NET `[Authorize(Roles = ...)]` per controller |
| Password storage | BCrypt hashing |
| Data scoping | Broker → own requests; Evaluator → shipping line; Depot → depot |
| File uploads | Size limit 10 MB; stored in `uploads/`; served via static files |
| CORS | Whitelist frontend origins in `appsettings.json` |
| Audit | `AuditService` logs user actions to `AuditLogs` table |

**Phase 2 additions:** Redis token blacklist, rate limiting, HTTPS-only in production.

---

## 8. Deployment design

```text
docker-compose
├── mysql:8.0        (port 3306)
├── redis:7          (port 6379)
├── api              (port 5275 → 8080)
└── frontend/nginx   (port 80)
         └── proxies /api → api:8080
```

Local dev: XAMPP MySQL + `dotnet run` + `npm run dev` with Vite proxy.

---

## 9. Integration design (LOGICTECK)

```text
Gate Scanner / LOGICTECK
        │
        │ POST /api/logicteck/validate-qr
        │ { "qrCode": "ICS-202600001" }
        ▼
   ICS API ──► QRBooking lookup
        │
        ▼
   { valid, containerNo, scheduledDate, scheduledTime, depot }
```

**Future:** API key auth, webhook on QR scan, mark `IsUsed = true`.

---

## 10. Technical debt & improvements

| Item | Priority | Notes |
|------|----------|-------|
| Rename DB tables (`DepotsSet` → `Depots`) | Low | Cosmetic; new migration |
| Align EF Core package versions | Low | Resolve 7.0.2 vs 7.0.20 warning |
| Wire Redis | Medium | Phase 2 |
| Password reset endpoint | Medium | Sprint 1 gap |
| API integration tests | High | Before production |
| Pre-Forecast entity | Low | Spec mentions; not yet modeled |

---

## 11. Folder conventions

```text
backend/
  ECMS.Domain/Entities/       # One entity per file
  ECMS.Application/DTOs/      # Grouped by module
  ECMS.Application/Interfaces/
  ECMS.Infrastructure/Services/
  ECMS.API/Controllers/       # One controller per module

frontend/src/
  pages/          # Route-level components
  layouts/        # App shell
  services/       # API client (axios)
  store/slices/   # Redux slices per domain
```
