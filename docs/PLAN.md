# ICS Project Plan

> **Last updated:** 2026-06-23  
> **Status:** Phase 1 MVP in progress (~45% complete)  
> **Task tracker:** [TASKS.md](./TASKS.md) · [tasks.json](./tasks.json)

---

## 1. Vision

Build a centralized platform that automates empty container returns across **Brokers → Shipping Lines → Depots → Truckers**, with QR-based gate authorization and future **LOGICTECK** integration.

### Success criteria (MVP)

| Metric | Target |
|--------|--------|
| End-to-end workflow | Broker submit → Evaluator approve → Depot schedule → Trucker pay → QR issued |
| Role isolation | Each role sees only permitted data and actions |
| API coverage | All core endpoints from spec implemented and tested |
| Deployment | Runnable via Docker on a single host |
| Audit trail | All critical actions logged |

---

## 2. Phases & timeline

```text
Phase 1 — MVP (Sprints 1–7)     ████████░░░░░░░░  ~45%   Target: 8–10 weeks
Phase 2 — Notifications         ░░░░░░░░░░░░░░░░   0%    Target: +4 weeks
Phase 3 — Integration & Mobile  ░░░░░░░░░░░░░░░░   0%    Target: +8 weeks
```

### Phase 1 — MVP (current)

| Sprint | Focus | Backend | Frontend | Status |
|--------|-------|---------|----------|--------|
| **S1** | Auth, users, roles | Done | Partial | In progress |
| **S2** | Broker / Pre-Advice | Done | Partial | In progress |
| **S3** | Shipping line evaluation | Done | Not started | API ready |
| **S4** | Depot scheduling & slots | Done | Not started | API ready |
| **S5** | Payments | Done | Not started | API ready |
| **S6** | QR generation | Done | Not started | API ready |
| **S7** | Dashboard, reports, audit | Partial | Partial | In progress |

### Phase 2 — Enhancements

- Email notifications (status changes, schedule reminders)
- SMS notifications (trucker alerts)
- Advanced reports (export CSV/PDF)
- Redis caching (sessions, dashboard stats, rate limiting)

### Phase 3 — Integration & scale

- LOGICTECK gate validation (production hardening)
- Mobile application (trucker / gate scanner)
- BI dashboard
- AI slot forecasting

---

## 3. Sprint breakdown (detailed)

### Sprint 1 — Authentication & administration

**Goal:** Secure access and admin control of users/roles.

| Deliverable | Owner layer | Priority |
|-------------|-------------|----------|
| JWT login / refresh / logout | Backend | P0 — Done |
| Role-based authorization | Backend | P0 — Done |
| User registration (admin) | Backend | P0 — Done |
| Password reset flow | Backend | P1 — Pending |
| Login page | Frontend | P0 — Done |
| Admin: user CRUD UI | Frontend | P1 — Pending |
| Admin: role assignment UI | Frontend | P1 — Pending |

**Exit criteria:** Admin can create users per role; all roles can log in securely.

---

### Sprint 2 — Broker module

**Goal:** Brokers create and track pre-forecast requests.

| Deliverable | Priority |
|-------------|----------|
| Pre-Advice CRUD API | P0 — Done |
| Submit / cancel workflow | P0 — Partial (submit done, cancel pending) |
| Document upload | P1 — Pending |
| Pre-Advice list & create UI | P0 — Done |
| Pre-Advice edit / detail view | P1 — Pending |
| Request history filters | P2 — Pending |

**Exit criteria:** Broker can create, edit (draft), submit, and view status end-to-end.

---

### Sprint 3 — Shipping line evaluation

**Goal:** Evaluators review requests and assign CY.

| Deliverable | Priority |
|-------------|----------|
| Evaluation approve/reject API | P0 — Done |
| CY assignment on approval | P0 — Done |
| Pending queue UI | P0 — Pending |
| Approve / reject dialogs | P0 — Pending |
| Evaluation history view | P1 — Pending |

**Exit criteria:** Evaluator processes queue; approved requests get depot assignment.

---

### Sprint 4 — Depot scheduling

**Goal:** Depot staff assign return slots and manage capacity.

| Deliverable | Priority |
|-------------|----------|
| Schedule CRUD API | P0 — Done |
| Slot & capacity logic | P1 — Partial |
| Schedule calendar UI | P0 — Pending |
| Daily returns view | P1 — Pending |
| Trucker assignment | P1 — Pending |

**Exit criteria:** Depot assigns date/time/slot; trucker sees assigned schedule.

---

### Sprint 5 — Payment module

**Goal:** Truckers upload proof; staff verify payment.

| Deliverable | Priority |
|-------------|----------|
| Payment upload API | P0 — Done |
| Payment verification API | P0 — Done |
| Trucker upload UI | P0 — Pending |
| Verification UI (depot/admin) | P1 — Pending |
| Payment status tracking | P1 — Pending |

**Exit criteria:** Paid + verified schedule moves to confirmed; triggers QR generation.

---

### Sprint 6 — QR module

**Goal:** Generate and distribute return authorization QR codes.

| Deliverable | Priority |
|-------------|----------|
| QR payload generation | P0 — Done |
| QR PNG download | P0 — Done |
| LOGICTECK validate endpoint | P0 — Done |
| Trucker QR view / download UI | P0 — Pending |
| Print-friendly QR page | P1 — Pending |
| Mobile-optimized QR view | P2 — Pending |

**Exit criteria:** Trucker downloads QR after payment; gate can validate via API.

---

### Sprint 7 — Dashboard, reports & audit

**Goal:** Operational visibility and compliance.

| Deliverable | Priority |
|-------------|----------|
| Role dashboards (API) | P0 — Done |
| Role dashboards (UI) | P0 — Partial |
| Daily / monthly reports API | P1 — Pending |
| Reports UI | P1 — Pending |
| Audit log API | P1 — Partial (write only) |
| Audit log viewer (admin) | P1 — Pending |

**Exit criteria:** Each role has actionable dashboard; admin can pull reports and audit trail.

---

## 4. Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| MySQL / XAMPP config variance | Dev environment breaks | Document connection string; Docker as canonical |
| Role permission gaps | Data leak across tenants | Integration tests per role; shipping-line/depot scoping |
| File upload security | Malware / path traversal | Validate MIME, size limits, store outside web root |
| LOGICTECK API contract change | Integration failure | Versioned DTOs; adapter layer |
| No automated tests yet | Regression on changes | Add API integration tests per sprint |

---

## 5. Definition of done (per task)

- [ ] Code implemented and builds without errors
- [ ] API documented in Swagger (if applicable)
- [ ] Role permissions verified
- [ ] UI matches design tokens (MUI theme)
- [ ] Task status updated in `docs/tasks.json` and `TASKS.md`
- [ ] Demo path verified manually

---

## 6. How to use this plan

1. **Pick a sprint** from the table above.
2. **Open [TASKS.md](./TASKS.md)** — find tasks tagged with that sprint.
3. **Update status** in `tasks.json` when starting or finishing work (`todo` → `in_progress` → `done`).
4. **Open the Project Tracker canvas** in Cursor (`ecms-project-tracker.canvas.tsx`) for a visual overview.
5. **Refer to [DESIGN.md](./DESIGN.md)** before implementing UI or API changes.

---

## 7. Current focus (recommended order)

**Active track:** [Trucker Track](./TRUCKER-TRACK.md) — broker → evaluator → depot → trucker → QR

1. ~~Sprint 3 UI — Evaluator queue~~ Done
2. ~~Sprint 4 UI — Depot assign trucker~~ Done
3. ~~Sprint 5 UI — Trucker payment upload~~ Done
4. ~~Sprint 6 UI — QR download~~ Done
5. Sprint 1 UI — Admin user management
6. Sprint 7 — Reports & audit viewer
7. QA-002 — E2E happy-path test (full trucker track)
