# Summary Report — Dynamic Demurrage & Detention Settings

**ICS · TNSDS · September 2026 · Status: Implemented**

---

## Summary

Shipping lines and ICS admin can **configure demurrage and detention rates in the portal** — per line, with optional depot and container size rules. When a trucker hits **expired eDO free time**, ICS **auto-applies the matching rule** on billing create; pay → verify → submit flow unchanged.

**Fallback:** No matching rule → system default (configurable; default ₱3,500 demurrage · ₱2,500 detention).

---

## Where to manage

| Role | Path |
|------|------|
| **ICS Administrator** | `/admin/demurrage-rates` or Master data → Demurrage rates tab |
| **Shipping line evaluator** | `/evaluations/demurrage-rates` |
| **Billing (view applied rule)** | Demurrage billing detail → Applied rate rule |

---

## Rule matching

Most specific wins:

1. Line + depot + container size  
2. Line + depot  
3. Line + container size  
4. Line only  
5. **System fallback**

---

## Demo seed (fresh DB)

When no rules exist yet, startup seed adds:

- **MAERSK · ICTSI CY · 40'** — ₱4,200 demurrage / ₱2,800 detention  
- **MAERSK · all depots · all sizes** — ₱3,600 / ₱2,400  
- **MSC · all · all** — ₱3,800 / ₱2,600  

Test pre-forecast `PA-2026-DMGTEST` (expired demurrage) uses MAERSK + ICTSI + 40' when billing is created.

---

## Technical

- **API:** `GET/POST/PUT /api/demurrage-detention-rates`, `GET .../resolve`, `PUT /api/payments/settings/demurrage`  
- **Migration:** `20260903020000_AddDemurrageDetentionRates`  
- **Billing fields:** `AppliedRateId`, `AppliedRateLabel` on `DemurrageBilling`

---

*v1.0 · Implemented in ICS codebase*
