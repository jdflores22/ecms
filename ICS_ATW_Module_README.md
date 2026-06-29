# Intelligent Container Solutions (ICS)

## Authority to Withdraw (ATW) Module

### Overview

Intelligent Container Solutions (ICS) is a collaboration platform that connects Shipping Lines, Container Yards (CY), Trucking Companies, Brokers, and other logistics stakeholders.

The **Authority to Withdraw (ATW)** module digitizes the process of requesting and approving the withdrawal of containers for **repositioning**. ICS facilitates communication and validation between organizations but does **not** replace each company's internal operational system.

---

## Objectives

- Digitize ATW processing.
- Reduce manual paperwork.
- Improve visibility of container movements.
- Maintain complete audit trails.
- Standardize inter-company workflows.

---

## Participants

| Participant | Responsibility |
|-------------|----------------|
| Shipping Line | Issues the Authority to Withdraw (ATW). |
| Trucker | Submits the withdrawal request. |
| Container Yard | Validates and approves/rejects the request. |
| ICS Platform | Tracks, validates, and notifies all parties. |

---

## Workflow

```text
Shipping Line
      │
      ▼
Issue ATW
      │
      ▼
ICS Platform
      │
      ▼
Notify Trucker
      │
      ▼
Submit Withdrawal Request
      │
      ▼
Container Yard Validation
      │
 ┌────┴─────┐
 │          │
Approve   Reject
 │
 ▼
Container Release
 │
 ▼
Completed
```

---

## ATW Information

- ATW Number
- Shipping Line
- Container Number(s)
- Current Container Yard
- Destination
- Authorized Trucker
- Issue Date
- Expiration Date
- Purpose (Repositioning)

---

## Validation Rules

Before approval, ICS verifies:

- Valid ATW
- ATW not expired
- Container exists
- Container available
- Container located at selected CY
- Authorized trucker matches ATW
- No duplicate request

---

## Status Flow

```text
Draft
  │
Issued
  │
Submitted
  │
Under Review
  ├──────┐
Approved Rejected
  │
Released
  │
Completed
```

---

## Notifications

- ATW Issued
- Request Submitted
- Request Approved
- Request Rejected
- Container Released
- Process Completed

---

## Audit Trail

Every action is recorded, including:

- ATW Creation
- Request Submission
- Approval / Rejection
- Container Release
- Completion

---

## Vision

ICS provides a secure, standardized collaboration platform for container logistics, enabling independent organizations to exchange requests, approvals, and movement information efficiently while preserving each company's internal operational systems.
