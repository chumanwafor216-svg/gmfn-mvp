# GMFN Pilot Runbook (Phase 1)

## Goal
Validate the Trust Transmission Protocol in a safe, non-custodial pilot while capturing visa-grade evidence.

## Participants
- 15+ remote users (pilot cohort)
- 1–2 clans initially
- Roles: borrower(s), guarantor(s), admin observer

## Tools
- Mobile-first UI
- TrustEvent feed + explainability endpoints
- Screenshot evidence checklist (docs/screenshot_evidence_checklist.md)

---

## Pilot Flow Script (B2)

### 1) Create clan
- Admin creates clan
- Screenshot: Clan page with name + members count

### 2) Invite onboarding (3 users)
- Admin generates invite link
- Send via WhatsApp
- Users join via invite
- Screenshot: Invite card + join success

### 3) Borrower requests support (100)
- Borrower creates a support request (loan)
- Screenshot: loan created + amount + currency

### 4) Two guarantors pledge + approve
- Guarantors open inbox
- Select structured reason + optional note
- Approve (locks pledge)
- Screenshot: Incoming requests page showing approve/decline and reason selected

### 5) Generate TrustSlip
- Borrower opens TrustSlip page
- Risk disclosure modal appears (pilot)
- Acknowledge and proceed
- Screenshot: TrustSlip share block

### 6) Merchant verification (public)
- Open verify link
- Verify shows VALID / NOT VALID clearly
- Screenshot: verify page

### 7) Repayment simulation (positive)
- Post repayment via UI/admin flow
- Confirm repayment → trust increases
- Screenshot: /trust/me and /trust/me/why showing delta and reason/note

---

## Breach Simulation (B3)
Scenario: borrower does not repay on time.
Expected:
- Trust stagnates or decays per policy
- Network consequences may be logged
- Guarantors see warnings/exposure impacts
Screenshots:
- Trust “why” feed with consequence events
- Admin recent trust events feed (reason/note visible)

---

## Metrics to Capture (B4)
- Average time to coverage completion
- % loans fully covered
- % repaid
- Borrower trust growth rate
- Guarantor reliability growth rate
- Merchant verification success rate
- Dispute frequency and resolution time

---

## Safety Notes
- No custodial handling in pilot
- Explicit disclosure modal on TrustSlip page
- No auto-debit of guarantors in MVP
- All key actions logged via TrustEvent (audit trail)