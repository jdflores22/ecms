# ICS Presentation — How It Works & How To (End to End)

> **Intelligent Container Solutions (ICS)**  
> Streamline empty container returns from pre-forecast to gate pass.

---

## Slide 1 — Title

# Intelligent Container Solutions (ICS)

**Container return management platform**

From pre-forecast → evaluation → scheduling → payment → QR / gate pass

---

## Slide 2 — What is ICS?

ICS connects **truckers**, **shipping-line evaluators**, and **depot teams** on one workflow.

| Without ICS | With ICS |
|-------------|----------|
| Spreadsheets & phone calls | One shared portal |
| Paper ATW & unclear status | Digitized, auditable statuses |
| Manual handoffs | Real-time notifications |
| Fragmented payment & QR | Payments + LOGICTECK QR in one place |

**ICS does not replace** each company’s internal ops system — it is the shared communication, validation, and audit layer.

---

## Slide 3 — Who uses ICS?

| Role | Who | Main job in ICS |
|------|-----|-----------------|
| **Trucker** | Trucking companies / drivers | Pre-forecast, payments, QR, withdrawals |
| **Evaluator** | Shipping line | Approve / reject pre-forecast, assign CY |
| **Depot** | Container Yard (CY) personnel | Schedule slots, verify payment, release |
| **Administrator** | Organization admin | Users, settings, oversight |
| **Broker** *(optional)* | Brokers | Submit pre-advice on behalf of truckers |

Truckers can **self-register**. Evaluator, depot, and admin accounts are provisioned by the organization.

---

## Slide 4 — How ICS works (big picture)

```text
  01 Pre-forecast          Trucker submits container + photos
           ↓
  02 Evaluate              Shipping line reviews & assigns CY
           ↓
  03 Schedule & pay        Depot assigns slot · Trucker pays
           ↓
  04 Return & QR           Booking QR · LOGICTECK · gate release
```

**One auditable path** from trucker submission to depot release — whether the container returns to a **CY** or **Port Terminal**.

---

## Slide 5 — End-to-end journey (returns)

```text
Trucker / Broker
   submits Pre-forecast
        ↓
Evaluator
   approves + assigns CY
        ↓
Depot
   assigns date / time / slot + trucker
        ↓
Trucker
   uploads payment proof
        ↓
Depot
   verifies payment
        ↓
ICS
   publishes booking QR (LOGICTECK)
        ↓
Yard / LOGICTECK
   container return at gate
```

---

## Slide 6 — How to: Trucker account setup

1. Open the ICS web portal (or ICS Trucker mobile app).
2. Tap **Create trucker account** / Sign up.
3. Enter username, email, full name, and password (min. 8 characters).
4. Sign in.
5. Complete **Profile** if needed (email, name, password change).

**Tip:** Use the mobile app for notifications, returns, payments, and QR on the road.

---

## Slide 7 — How to: Submit a pre-forecast (Trucker)

**Goal:** Request to return an empty container.

1. Go to **Pre-forecast** → **New**.
2. Enter:
   - Container number
   - Shipping line
   - Size & type
   - Remarks (optional)
3. Upload **required identity / container photos**.
4. Review **What happens next** (evaluation → schedule → return).
5. **Submit**.

| Status you may see | Meaning |
|--------------------|---------|
| Draft | Saved, not submitted |
| Submitted / Pending | Waiting for evaluator |
| Approved | CY assigned — await depot schedule |
| Rejected / Needs correction | Fix and resubmit |

---

## Slide 8 — How to: Evaluate a pre-forecast (Evaluator)

**Goal:** Approve compliance and assign the return yard.

1. Sign in as **Shipping Line Evaluator**.
2. Open **Evaluations**.
3. Open the pre-forecast dossier (container, photos, history).
4. Choose:
   - **Approve** → select **CY / Port Terminal**
   - **Reject** / request corrections with remarks
5. Save.

The trucker is notified. Approved requests move to the depot for scheduling.

---

## Slide 9 — How to: Schedule a return (Depot)

**Goal:** Give the trucker a date, time, and slot.

1. Sign in as **Depot Personnel**.
2. Open **Schedules** (or Depot schedules).
3. Find the approved pre-forecast.
4. **Assign**:
   - Date
   - Time / slot
   - Trucker (if not already set)
5. Confirm.

The trucker sees the schedule under **My Returns** / **Returns**.

---

## Slide 10 — How to: Pay & confirm (Trucker → Depot)

### Trucker

1. Open **Payments** (or open the return → Upload payment).
2. Check the **return fee** amount.
3. Upload **payment proof** (image / PDF).
4. Enter reference no. and transaction date/time if required.
5. Submit — status becomes **For verification**.

### Depot

1. Open **Payments** (pending).
2. Review proof.
3. **Approve** or **Reject** (with remarks if rejected).

After approval, the booking can proceed to QR.

---

## Slide 11 — How to: Get the booking QR (Trucker)

1. After payment is verified, open **QR Passes** / **QR Codes**.
2. Open the booking for your schedule.
3. **View / Download / Print** the booking QR.
4. Present the QR at the gate (LOGICTECK validation).

The QR carries pre-forecast / booking details for LOGICTECK integration.

---

## Slide 12 — Withdrawals (ATW) — how it works

Separate flow for **container repositioning** (Authority to Withdraw).

```text
Shipping Line issues ATW
        ↓
Trucker submits withdrawal request (+ ATW certificate)
        ↓
CY / Depot validates
        ↓
Approve → schedule pickup → release containers
   or
Reject (with remarks)
```

**ICS checks before approval:** valid ATW, not expired, container in yard, no duplicate, authorized trucker matches.

---

## Slide 13 — How to: Withdrawal request (Trucker)

1. Open **Withdrawals** → **New**.
2. Enter ATW number, shipping line, depot, destination, dates, purpose.
3. Add **container lines** (number, size, type).
4. Attach **ATW certificate**.
5. **Submit** for review.
6. After approval: check **Pickup schedule**, then proceed to release / gate pass as instructed.

On the list screen, ICS shows a **quick look** of up to 5 containers (+N more if there are more).

---

## Slide 14 — Demurrage & other actions

| Module | Who | What to do |
|--------|-----|------------|
| **Demurrage billing** | Trucker | View charges → upload payment proof if required |
| **Notifications** | All | Open alerts → tap to go to the related detail page |
| **News & updates** | Trucker | Read depot / ICS announcements |
| **Reports** | Trucker / ops | Daily / monthly returns reports |
| **Profile** | All | Update email, name, password |

---

## Slide 15 — Channels: Web vs Mobile

| Action | Web portal | ICS Trucker app |
|--------|------------|-----------------|
| Pre-forecast | ✓ | ✓ |
| Returns / schedules | ✓ | ✓ |
| Payments | ✓ | ✓ |
| QR passes | ✓ | ✓ |
| Withdrawals | ✓ | ✓ |
| Demurrage | ✓ | ✓ |
| Push notifications | — | ✓ |
| Evaluation / Depot ops | ✓ | — (role portals) |

---

## Slide 16 — Status cheat sheet (returns)

```text
Pre-forecast Draft → Submitted → Approved (CY assigned)
                              ↘ Rejected / Correction
        ↓
Schedule Assigned → Confirmed
        ↓
Payment Pending → For verification → Paid
                              ↘ Rejected (re-upload)
        ↓
QR published → Gate / LOGICTECK → Completed
```

---

## Slide 17 — Demo walkthrough (happy path)

| Step | Role | Account (demo) | Action |
|------|------|----------------|--------|
| 1 | Trucker / Broker | `trucker1` or `broker1` | Create & submit pre-forecast |
| 2 | Evaluator | `evaluator1` | Approve + assign CY |
| 3 | Depot | `depot1` | Assign date, slot, trucker |
| 4 | Trucker | `trucker1` | Upload payment proof |
| 5 | Depot | `depot1` | Verify payment |
| 6 | Trucker | `trucker1` | Download booking QR |

Default demo password pattern: `Role@123` (e.g. `Trucker@123`).

---

## Slide 18 — Key takeaways

1. **One platform** for the full empty-return chain.
2. **Clear handoffs:** Trucker → Evaluator → Depot → Trucker → Depot → QR / gate.
3. **How to remember:** Submit → Approve → Schedule → Pay → Verify → QR.
4. **ATW withdrawals** follow a parallel, digitized release path.
5. **Web + mobile** keep truckers moving; ops roles stay on the portal.

---

## Slide 19 — Thank you / Q&A

# Questions?

**Intelligent Container Solutions (ICS)**  
Pre-forecast empty containers for return to CY or Port Terminal

---

## Appendix A — Quick how-to checklist (Trucker)

- [ ] Sign up / sign in  
- [ ] New pre-forecast + photos → Submit  
- [ ] Wait for approval & schedule notification  
- [ ] Open Returns → confirm slot  
- [ ] Payments → upload proof  
- [ ] Wait for payment approval  
- [ ] QR Passes → download / show at gate  
- [ ] (If needed) Withdrawals / Demurrage  

## Appendix B — Quick how-to checklist (Ops)

**Evaluator**

- [ ] Open Evaluations  
- [ ] Review dossier & photos  
- [ ] Approve + assign CY *or* reject with remarks  

**Depot**

- [ ] Assign schedule (date / time / slot / trucker)  
- [ ] Verify payment proof  
- [ ] Support release / gate coordination  

---

*Document version: presentation transfer for ICS end-to-end overview*  
*Related: [ICS-DESCRIPTION.md](./ICS-DESCRIPTION.md) · [TRUCKER-TRACK.md](./TRUCKER-TRACK.md)*
