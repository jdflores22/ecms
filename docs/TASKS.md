# ECMS Task Board

> **Source of truth:** [`tasks.json`](./tasks.json) — update status there when work changes.  
> **Plan:** [PLAN.md](./PLAN.md) · **Design:** [DESIGN.md](./DESIGN.md) · **Trucker track:** [TRUCKER-TRACK.md](./TRUCKER-TRACK.md)  
> **Last updated:** 2026-06-23

---

## Progress snapshot

| Metric | Value |
|--------|------:|
| Overall MVP progress | **~82%** (plan estimate) |
| MVP tasks (S1–S7) | **50** |
| Done | **37** |
| In progress | **0** |
| Todo | **13** |
| Task completion | **74%** (37/50 done) |

### Sprint progress

| Sprint | Name | Progress |
|--------|------|----------|
| S1 | Authentication & Administration | **85%** |
| S2 | Broker / Pre-Advice | 55% |
| S3 | Shipping Line Evaluation | **100%** |
| S4 | Depot Scheduling | **90%** |
| S5 | Payment Module | **90%** |
| S6 | QR Code Generation | **100%** |
| S7 | Dashboard, Reports & Audit | **72%** |

---

## Status legend

| Status | Meaning |
|--------|---------|
| `done` | Complete and verified |
| `in_progress` | Actively being worked on |
| `todo` | Not started |
| `cancelled` | Descoped (none yet) |

---

## In progress (0)

_No tasks currently in progress._

---

## Next up (recommended)

Priority order to complete the **happy path** demo:

| # | ID | Task | Sprint | Layer |
|---|-----|------|--------|-------|
| 1 | EVAL-003 | Pending evaluations queue UI | S3 | frontend |
| 2 | EVAL-004 | Approve / reject dialog with CY picker | S3 | frontend |
| 3 | SCHED-003 | Schedule calendar UI | S4 | frontend |
| 4 | SCHED-005 | Assign trucker to schedule UI | S4 | frontend |
| 5 | PAY-003 | Trucker payment upload UI | S5 | frontend |
| 6 | PAY-004 | Payment verification UI | S5 | frontend |
| 7 | QR-004 | Trucker QR view & download UI | S6 | frontend |
| 8 | QA-002 | E2E happy-path test | S7 | frontend |

---

## Done (22)

<details open>
<summary><strong>Infrastructure & foundation</strong></summary>

| ID | Task |
|----|------|
| INFRA-001 | Scaffold .NET solution (clean architecture) |
| INFRA-002 | Scaffold React frontend (Vite + MUI + Redux) |
| INFRA-003 | Docker compose (MySQL, Redis, API, Nginx) |
| INFRA-004 | EF Core migrations + seed data |

</details>

<details open>
<summary><strong>Sprint 1 — Auth (backend)</strong></summary>

| ID | Task |
|----|------|
| AUTH-001 | JWT login endpoint |
| AUTH-002 | Refresh token flow |
| AUTH-003 | Admin user registration API |
| AUTH-005 | Login page UI |

</details>

<details open>
<summary><strong>Sprint 2 — Pre-Advice</strong></summary>

| ID | Task |
|----|------|
| PA-001 | Pre-Advice CRUD API |
| PA-002 | Submit pre-advice workflow |
| PA-005 | Pre-Advice list & create UI |

</details>

<details open>
<summary><strong>Sprint 3–6 — APIs</strong></summary>

| ID | Task |
|----|------|
| EVAL-001 | Approve / reject evaluation API |
| EVAL-002 | Evaluation list API |
| SCHED-001 | Schedule CRUD API |
| PAY-001 | Payment proof upload API |
| PAY-002 | Payment verification API |
| QR-001 | QR generation with payload JSON |
| QR-002 | QR download endpoint |
| QR-003 | LOGICTECK validate-qr endpoint |

</details>

<details open>
<summary><strong>Sprint 7 — Dashboard & audit</strong></summary>

| ID | Task |
|----|------|
| DASH-001 | Role-based dashboard APIs |
| AUDIT-001 | Audit log write service |

</details>

---

## Backlog by sprint

### S1 — Authentication & administration

| ID | Task | Status | Priority |
|----|------|--------|----------|
| AUTH-004 | Password reset flow | done | P1 |
| AUTH-006 | Admin user management UI | todo | P1 |
| AUTH-007 | Role management UI | done | P2 |

### S2 — Broker / Pre-Advice

| ID | Task | Status | Priority |
|----|------|--------|----------|
| PA-003 | Cancel pre-advice request | done | P1 |
| PA-004 | Supporting document upload | done | P1 |
| PA-006 | Pre-Advice edit & detail view | done | P1 |
| PA-007 | Request history filters | done | P2 |

### S3 — Shipping line evaluation

| ID | Task | Status | Priority |
|----|------|--------|----------|
| EVAL-003 | Pending evaluations queue UI | todo | P0 |
| EVAL-004 | Approve / reject dialog with CY picker | todo | P0 |
| EVAL-005 | Evaluation history view | todo | P1 |

### S4 — Depot scheduling

| ID | Task | Status | Priority |
|----|------|--------|----------|
| SCHED-002 | Slot capacity management logic | in_progress | P1 |
| SCHED-003 | Schedule calendar UI | todo | P0 |
| SCHED-004 | Daily returns view | done | P1 |
| SCHED-005 | Assign trucker to schedule UI | todo | P1 |

### S5 — Payment module

| ID | Task | Status | Priority |
|----|------|--------|----------|
| PAY-003 | Trucker payment upload UI | todo | P0 |
| PAY-004 | Payment verification UI | todo | P1 |

### S6 — QR module

| ID | Task | Status | Priority |
|----|------|--------|----------|
| QR-004 | Trucker QR view & download UI | todo | P0 |
| QR-005 | Print-friendly QR page | todo | P1 |

### S7 — Dashboard, reports & audit

| ID | Task | Status | Priority |
|----|------|--------|----------|
| DASH-002 | Role-based dashboard UI | in_progress | P0 |
| RPT-001 | Daily / monthly returns report API | done | P1 |
| RPT-002 | Shipping line & depot report APIs | done | P1 |
| RPT-003 | Reports UI with export | done | P1 |
| AUDIT-002 | Audit log query API | todo | P1 |
| AUDIT-003 | Admin audit log viewer UI | todo | P1 |
| ADMIN-001 | Shipping lines management API | done | P1 |
| ADMIN-002 | Depots management API | done | P1 |
| ADMIN-003 | Admin master data UI | done | P1 |
| QA-001 | API integration tests | done | P1 |
| QA-002 | E2E happy-path test | todo | P1 |

### Phase 2 & 3

| ID | Task | Phase |
|----|------|-------|
| P2-001 | Email notifications | Phase 2 |
| P2-002 | SMS notifications | Phase 2 |
| P2-003 | Redis integration | Phase 2 |
| P3-001 | LOGICTECK production integration | Phase 3 |
| P3-002 | Mobile application | Phase 3 |

---

## How to update tasks

1. Edit `docs/tasks.json` — change `status` to `todo`, `in_progress`, or `done`.
2. Optionally set `assignee` and `notes`.
3. Recalculate sprint `progress` in `meta` / `sprints` when milestones shift.
4. Sync this file's summary counts if you maintain it manually, or regenerate from JSON.
5. **Refresh the canvas tracker:** `node scripts/sync-project-tracker.mjs` (the canvas cannot read `tasks.json` at runtime).

### Example (JSON)

```json
{
  "id": "EVAL-003",
  "status": "in_progress",
  "assignee": "dev-name",
  "notes": "Started queue component"
}
```

---

## Visual tracker

Open **`ecms-project-tracker.canvas.tsx`** in Cursor (Canvases panel) for an interactive board. After editing `tasks.json`, run `node scripts/sync-project-tracker.mjs` to refresh it.
