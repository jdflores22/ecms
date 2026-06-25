# ICS Trucker Track

> Aligns MVP tasks to the **trucker end-to-end journey**  
> **Demo account:** `trucker1` / `Trucker@123`

---

## Trucker journey (happy path)

```text
Broker submits Pre-Advice
        ↓
Evaluator approves + assigns CY
        ↓
Depot assigns date/time/slot + TRUCKER  ← SCHED-003, SCHED-005
        ↓
Trucker uploads payment proof          ← PAY-003
        ↓
Depot verifies payment                 ← PAY-004
        ↓
ICS booking QR published — supplies pre-advice details to LOGICTECK  ← QR-004
        ↓
LOGICTECK integration (coming soon) via validate-qr API  ← QR-003
        ↓
Container return at yard (handled by LOGICTECK)
```

---

## Task alignment by role

| Step | Role | Route | Task IDs | Status |
|------|------|-------|----------|--------|
| 1 | Broker | `/preadvice` | PA-005, PA-002 | Done |
| 2 | Evaluator | `/evaluations` | EVAL-003–005 | Done |
| 3 | Depot | `/depot/schedules` | SCHED-003, SCHED-005 | Done |
| 4 | Trucker | `/trucker/returns` | TRK-001 | Done |
| 5 | Trucker | `/trucker/payments` | PAY-003 | Done |
| 6 | Depot | `/depot/payments` | PAY-004 | Done |
| 7 | Trucker | `/trucker/qr` | QR-004 | Done |
| 8 | LOGICTECK | `POST /api/logicteck/validate-qr` | QR-003 | API ready · integration coming soon |
| 9 | Yard operations | LOGICTECK system | Phase 3 | External |

---

## Demo walkthrough

### 1. Broker (`broker1` / `Broker@123`)
- Pre-Advice → New → Submit

### 2. Evaluator (`evaluator1` / `Evaluator@123`)
- Evaluations → Approve → select **ICTSI CY**

### 3. Depot (`depot1` / `Depot@123`)
- Schedules → Assign → pick date, slot, **ABC Trucking (trucker1)**
- After trucker uploads: Payments → Approve

### 4. Trucker (`trucker1` / `Trucker@123`)
- My Returns → see assigned schedule
- Payments → Upload Proof (image/PDF)
- QR Codes → Download booking QR (supplies pre-advice details to LOGICTECK — integration coming soon)

---

## API endpoints (trucker track)

| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/api/schedules` | Depot, Trucker |
| PUT | `/api/schedules/{id}` | Depot |
| GET | `/api/users/truckers` | Depot |
| POST | `/api/payments/upload` | Trucker |
| GET | `/api/payments/mine` | Trucker |
| GET | `/api/payments/pending` | Depot |
| POST | `/api/payments/{id}/verify` | Depot |
| GET | `/api/qr/schedule/{scheduleId}` | Trucker |
| GET | `/api/qr/download/{bookingId}` | Trucker |

---

## Remaining trucker-track gaps

| ID | Task | Priority |
|----|------|----------|
| QR-005 | Print-friendly QR page | P1 |
| SCHED-002 | Full slot capacity logic | P1 |
| SCHED-004 | Daily returns calendar view | P1 |
| QA-002 | E2E happy-path test (broker → QR) | P1 |

---

## Progress

| Sprint | Trucker-related progress |
|--------|-------------------------|
| S4 Depot Scheduling | ~85% |
| S5 Payments | ~90% |
| S6 QR | ~85% |

**Trucker track UI:** complete for MVP demo.
