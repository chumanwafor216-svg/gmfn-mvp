# GSN Community Confirmation Relay Protocol

Status: Implementation protocol for TrustSlip, Trust Passport, merchant verification, and community-backed trust checks  
Date: 15 May 2026  
Prepared for: GSN product, trust, fintech, community finance, and risk audit review

---

## 1. Purpose

This protocol defines how GSN should let an outsider request stronger confirmation that a person is genuinely known, reachable, and recognised inside a real community.

The feature exists because a TrustSlip or Trust Passport should not only say:

**Community member: Yes**

It should also be able to answer:

**If this decision needs stronger confidence, can the community still confirm this person now?**

The correct product layer is:

**Community Confirmation Relay**

This is a controlled way for an outsider to request community confirmation without exposing private member contacts by default.

---

## 2. Core Principle

GSN should not expose raw member phone numbers, sponsor contacts, or admin contacts by default.

GSN should instead provide a controlled relay:

1. An outsider asks for stronger community confirmation.
2. GSN routes the request to eligible community contacts.
3. Contacts respond inside GSN.
4. The outsider sees a controlled outcome.
5. GSN keeps the private audit trail and Trust Events.

This turns community support into usable evidence while protecting private contact details.

---

## 3. Privacy Basis

This protocol must be implemented with privacy protection from the start.

Official UK ICO guidance supports the guardrails used here:

- Lawful basis: ICO guidance says at least one lawful basis must be identified before sharing personal data.
- Data minimisation: only the minimum necessary data should be used for a defined purpose.
- Data protection by design and by default: privacy must be considered at the start of the service design.
- Pseudonymisation: identifying details should be separated or masked where full identity is not necessary.

Source links checked:

- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/data-sharing-a-code-of-practice/lawful-basis-for-sharing-personal-data/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-by-default/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/

Policy note: this is a product and engineering protocol, not legal advice. Before production use, GSN still needs a formal data protection review, privacy notice wording, retention policy, and lawful-basis decision for each relay purpose.

---

## 4. Problem This Solves

A public TrustSlip may show:

- identity marker
- community name
- active membership
- trust band
- verification status
- visible trust history

But a merchant, employer, landlord, society leader, household client, or support provider may still ask:

- Does this community still know this person?
- Are they recognised there today?
- Is there live human support behind this record?
- If something goes wrong, is there a community route to resolve it?

Community Confirmation Relay answers that gap.

---

## 5. Two Confirmation Modes

GSN should support two related but different modes.

### Mode A: Standard Community Confirmation Relay

Use this when the outsider can wait.

Typical time window:

- 30 minutes
- 2 hours
- 24 hours

Best for:

- employment reference
- landlord check
- society membership
- higher-value merchant decision
- repeated trade relationship
- support network verification

### Mode B: Instant Community Pulse

Use this when the member is standing in front of a merchant or opportunity provider and needs a quick community signal.

Typical time window:

- 2 minutes
- 5 minutes
- 10 minutes

Best for:

- low-risk goods release
- first-look merchant trust check
- emergency transport help
- quick community support confirmation
- society officer or student support desk check

The Instant Community Pulse is not a guarantee. It is a live community signal.

---

## 6. Public TrustSlip Addition

Public TrustSlip should show a short community confirmation block.

### Section Title

Community confirmation

### Public Wording

This person is part of a verified community. If you need stronger assurance for a higher-risk decision, GSN can request response-based confirmation from eligible community members without exposing private details by default.

### Visible Public Fields

- Community status: Active, pending, inactive, suspended, or left
- Confirmation type: response-based community confirmation, vote-backed membership, sponsor-backed membership, invite accepted, or founder-added
- Active members: count or band
- Contactable references: count via GSN relay
- Sponsor signals: count
- Last community confirmation: date or not yet requested
- Relay available: yes or no

### Public Action

Request community confirmation

Optional quick action:

Start instant community pulse

---

## 7. Trust Passport Addition

Trust Passport should carry deeper community verification detail.

### Section Title

Community-backed verification

### Fields

- community name
- GSN community ID
- membership status
- joined date
- approval route
- sponsor-backed status
- vote-backed status
- admin-backed status
- confirmation route availability
- contactable approved relay count
- confirmation freshness
- recent community standing
- unresolved disputes or flags, if policy permits
- escalation path
- masked sponsor/reference signals
- public community verification link
- internal admin trail for signed-in authorised users

This belongs in the signed-in or controlled Trust Passport surface, not in the default public TrustSlip.

---

## 8. Public Community Verification Page

Add a public community verification route:

```text
/verify/community/:communityId
```

Example:

```text
/verify/community/GSN-C-000003
```

### Public Page Should Show

- community name
- community ID
- status: active, dormant, suspended, or archived
- public description
- approximate member strength or band
- relay available: yes or no
- eligible for TrustSlip confirmation: yes or no
- public verification policy
- date last publicly refreshed

### Public Page Must Not Show

- full member list
- raw phone numbers
- raw admin phone numbers
- sponsor names in full
- internal disputes by default
- individual voting records

This makes the community itself verifiable without turning the community into a public phone book.

---

## 9. Standard Relay Workflow

### Step 1: Request

An outsider clicks:

**Request community confirmation**

They must choose a reason:

- merchant trust check
- service or home-entry trust check
- support verification
- job or work opportunity
- emergency assistance
- community joining
- landlord or housing reference
- society or student support check
- other

They must also choose a risk level:

- low
- medium
- high

### Step 2: Purpose Notice

Before the request is submitted, GSN should show:

You are asking GSN to request confirmation from approved community contacts. Private contact details are not shared by default. The result will be a summary, not a guarantee.

### Step 3: Internal Routing

GSN routes the request to eligible contacts such as:

- community admin
- nominated relay contacts
- sponsors
- guarantors where relevant
- trusted circle lead
- members who voted the person in
- members nominated by the subject
- recently active members in good standing

### Step 4: Contact Response

Contacts respond inside GSN. Response options:

- Yes, this person is known here.
- Yes, this person is active here.
- Yes, good standing for this level of decision.
- Known here, but do not recommend this level of risk.
- Ask for more evidence.
- This person is inactive.
- This person is under dispute.
- This person is not known sufficiently for confirmation.

Each response may require a reason:

- personally known
- community activity seen
- trade/support history seen
- recently active
- old record only
- concern about follow-through
- concern about current dispute
- not enough knowledge

### Step 5: Controlled Outcome

The outsider sees a summary:

```text
Community response
3 confirmation requests sent
2 responses received
2 confirmed the person is known
0 raised objection
Last confirmation: 15 May 2026
Community confidence: Moderate
```

No private phone numbers need to be shown.

---

## 10. Instant Community Pulse Workflow

Instant Community Pulse is the live version for quick decisions.

### Scenario

A member shows a TrustSlip to a merchant. The TrustSlip is active, but the merchant wants to know whether the member has live human support in the community now.

### Step 1: Start Pulse

The action may be started by:

- the merchant from public TrustSlip verify
- the member from their TrustSlip page
- a signed-in GSN admin or society officer

Button:

**Start instant community pulse**

### Step 2: Request Window

The requester selects:

- reason
- risk level
- decision type
- confirmation window: 2 minutes, 5 minutes, or 10 minutes

For a pilot, default to:

```text
2 minute pulse
Low-risk merchant trust check
```

### Step 3: Community Receives Prompt

Eligible members receive a prompt:

```text
Emeka is asking for a quick community confirmation for a low-risk merchant trust check.

Do you know this person as a current member of this community?
```

### Step 4: Anonymous External Outcome, Private Internal Audit

The merchant and subject do not see who voted what.

They only see the aggregate result:

```text
Instant community pulse
7 eligible contacts reached
4 responses received
3 confirmed known
1 asked for more evidence
0 objections
Pulse confidence: Moderate
Expires in: 10 minutes
```

GSN privately stores:

- who received the request
- who responded
- response type
- response reason
- response time
- request reason
- requester identity or external token
- subject user
- community
- final outcome

### Step 5: Trust Events Are Created

The pulse should create Trust Events for both sides.

Subject member events:

- community_confirmation_requested
- instant_pulse_requested
- community_confirmation_outcome
- positive_confirmation_received
- objection_received, if applicable

Responder events:

- confirmation_response_submitted
- support_signal_given
- caution_signal_given
- objection_signal_given
- no_response_to_confirmation_request, if policy chooses to track this

Community events:

- confirmation_round_opened
- confirmation_round_closed
- confirmation_threshold_met
- confirmation_threshold_not_met

Requester events, if the requester is a GSN user:

- confirmation_request_submitted
- verification_outcome_viewed

### Step 6: Resolution Use

If something goes wrong later, GSN has an internal route to review:

- the TrustSlip shown
- the confirmation request
- the community pulse
- the members who supported or objected
- the decision context
- any follow-up dispute record

This does not mean voters become automatic guarantors. It means their confirmation becomes evidence of what they knew or supported at that moment.

---

## 11. Metrics To Track

### Membership

- membership status
- joined date
- time in community
- active or inactive state
- suspended or disputed state

### Approval

- approval route
- approval count
- objection count
- quorum met or not met
- sponsor-backed
- admin-backed
- vote-backed

### Community Density

- active member count
- active merchant count
- active support circles
- recent community activity
- dormant or live community status

### Contactable Confirmation Capacity

- approved relay contact count
- active relay contact count
- relay response rate
- average response time
- last active relay contact time

### Sponsor Quality

- sponsor verified
- sponsor active
- sponsor in good standing
- sponsor recent activity
- sponsor past confirmation reliability

### Confirmation Freshness

- never requested
- requested today
- requested this week
- older than 30 days
- expired

### Risk and Dispute

- unresolved disputes
- objection count
- repeated failed confirmations
- repeated unanswered confirmations
- abuse flags
- malicious request flags

---

## 12. Confirmation Outcome Logic

Do not reduce the relay to one magical score.

Use readable outcomes:

- Strong
- Moderate
- Limited
- Caution
- Not available

### Suggested Logic

Strong:

- 3 or more approved contacts responded positively
- no objection
- community active
- confirmation is fresh

Moderate:

- 2 positive responses
- no objection
- some evidence is limited

Limited:

- only 1 response
- low freshness
- low community density
- not enough eligible relay contacts

Caution:

- objection
- unresolved dispute
- weak standing
- mixed response
- risk level higher than community confidence

Not available:

- no eligible relay path
- no response
- community dormant
- relay disabled

---

## 13. Privacy And Safety Rules

These rules are non-negotiable.

1. No public member phone list.
2. Relay first, direct contact only by explicit policy and lawful basis.
3. Show only the minimum data needed for the selected purpose.
4. Do not show individual votes to the subject or merchant by default.
5. Keep private audit logs for authorised review.
6. Mask or pseudonymise sponsor/reference details unless full identity is necessary and permitted.
7. Give eligible contacts opt-in or opt-out control for relay participation.
8. Rate-limit confirmation requests.
9. Expire stale requests.
10. Add abuse reporting and admin review.
11. Do not let repeated requesters harass a member or community.
12. Do not present community confirmation as a bank guarantee, legal guarantee, employment guarantee, or automatic credit approval.

---

## 14. What Must Not Be Built

Do not build:

- "Here are three numbers, call them."
- "Community member means trust them."
- "Sponsor count is enough."
- "Phone verified means community standing."
- "Any admin can expose member contacts."
- "Anonymous vote means no accountability inside GSN."
- "Positive pulse means release goods at any value."

The public outcome can be anonymous.

The internal audit trail must not be anonymous to GSN.

---

## 15. UI Copy

### Public TrustSlip

Community confirmation

This person is part of a verified community. If you need stronger assurance for a higher-risk decision, GSN can request confirmation from approved community contacts without exposing private details by default.

Buttons:

- Request community confirmation
- Start instant community pulse

### Trust Passport

Community-backed verification

This member's standing may be confirmed through GSN relay using approved community contacts, according to the community's verification policy.

### Public Community Verify Page

Member confirmation available

This community can confirm eligible members through GSN relay. Private contact details are not publicly exposed.

### Instant Pulse Prompt

Do you know this person as a current member of this community?

Response options:

- Yes, I know them here.
- Yes, active here recently.
- I know them, but ask for more evidence.
- I have a concern.
- I do not know enough to confirm.

---

## 16. Backend Implementation Brief

Feature name:

```text
CommunityConfirmationRelay
```

### Core Tables

```text
community_confirmation_contacts
community_confirmation_requests
community_confirmation_responses
community_confirmation_policies
community_confirmation_outcomes
community_confirmation_audit_logs
```

### community_confirmation_contacts

- id
- user_id
- community_id
- role_type
- active
- can_receive_relay_requests
- can_receive_instant_pulse
- priority_order
- last_active_at
- standing_status
- opted_in_at
- opted_out_at

### community_confirmation_requests

- id
- external_request_token
- requester_user_id
- requester_external_label
- subject_user_id
- community_id
- trust_slip_id
- reason_type
- risk_level
- mode: standard_relay or instant_pulse
- created_at
- expires_at
- status
- visible_outcome
- outcome_summary
- abuse_flag

### community_confirmation_responses

- id
- request_id
- responder_user_id
- response_type
- response_reason
- response_note
- responded_at
- counted_in_outcome

### community_confirmation_policies

- id
- community_id
- relay_enabled
- instant_pulse_enabled
- minimum_positive_responses
- maximum_relay_contacts
- response_window_seconds
- allow_sponsor_contacts
- allow_admin_contacts
- allow_voting_member_contacts
- allow_subject_nominated_contacts
- public_confirmation_enabled

### community_confirmation_outcomes

- id
- request_id
- positive_count
- caution_count
- objection_count
- no_response_count
- eligible_contact_count
- confidence_level
- visible_summary
- closed_at

---

## 17. API Implementation Brief

### Public Or Token-Based

```text
POST /api/community-confirmations/request
GET /api/community-confirmations/public/:token
POST /api/community-confirmations/:request_id/respond
GET /verify/community/:community_id
```

### Signed-In Member/Admin

```text
GET /api/community-confirmations/inbox
GET /api/community-confirmations/history
GET /api/communities/:community_id/confirmation-policy
PUT /api/communities/:community_id/confirmation-policy
GET /api/communities/:community_id/confirmation-contacts
PUT /api/communities/:community_id/confirmation-contacts/:user_id
```

### TrustSlip Integration

TrustSlip payload should add:

```json
{
  "community_confirmation": {
    "community_status": "active",
    "approval_type": "vote_confirmed",
    "active_member_count": 24,
    "relay_available": true,
    "contactable_reference_count": 3,
    "sponsor_signal_count": 2,
    "last_confirmation_at": null,
    "instant_pulse_available": true,
    "request_confirmation_url": "/api/community-confirmations/request"
  }
}
```

---

## 18. Frontend Implementation Brief

### TrustSlip Public Verify

Add a compact block:

```text
Community confirmation
Active community member
3 contactable references through GSN relay
Last confirmation: Not yet requested
[Request community confirmation]
[Start instant pulse]
```

### Trust Passport

Add a deeper block:

```text
Community-backed verification
Membership status
Approval route
Relay contact capacity
Last confirmation
Community standing
Confirmation history
```

### Community Home/Admin

Add policy and contact management:

- relay enabled
- instant pulse enabled
- eligible contacts
- default response window
- abuse controls
- request history

### Confirmation Inbox

Eligible contacts need a simple response page:

- who is being confirmed
- community
- reason
- risk level
- time left
- response options
- optional note

---

## 19. Phase 1 Build Scope

The immediate build should be small and useful.

Phase 1:

1. Add backend models and migrations for requests, responses, contacts, policies, and outcomes.
2. Seed community admins and sponsors as default relay contacts.
3. Add TrustSlip community confirmation block with relay availability and contactable count.
4. Add request confirmation action.
5. Add confirmation inbox for eligible contacts.
6. Add standard relay response flow.
7. Add instant pulse with 2 minute expiry.
8. Add controlled outcome summary.
9. Generate Trust Events for request, response, and outcome.
10. Keep raw contacts private.

Do not build public phone exposure in Phase 1.

---

## 20. Phase 2

Add:

- public community verification page
- confirmation freshness badges
- community confidence summary
- subject-nominated relay contacts
- better response-rate metrics
- dispute handling
- admin review queue

---

## 21. Phase 3

Add:

- role-based routing
- richer confirmation policies
- institutional audit reports
- community confidence analytics
- abuse scoring
- external requester reputation
- deeper merchant integration

---

## 22. Acceptance Test

The feature is correctly designed only if:

1. An outsider can see the person belongs to a real community.
2. The outsider can ask for stronger assurance.
3. The community can respond without exposing raw member contacts by default.
4. The system produces a meaningful summary outcome.
5. The result is fresh and time-bounded.
6. Privacy is protected.
7. The public layer stays simple.
8. The full Trust Passport remains the deeper detail surface.
9. GSN records the request, response, and outcome as Trust Events.
10. A later dispute can be reviewed through an internal audit trail.

If those are not true, the feature is not done.

---

## 23. Devil's Advocate Risks

This feature is strong, but it can become dangerous if built loosely.

Risks:

- malicious outsiders may spam confirmation requests.
- community members may be pressured to confirm someone.
- anonymous public outcome may hide weak or dishonest support.
- responders may confirm someone casually without understanding the risk.
- merchants may treat a pulse as a guarantee.
- communities may become popularity contests.
- negative responses may create internal conflict.
- data protection failure could expose private networks.

Controls:

- clear purpose selection
- risk level selection
- expiry
- rate limits
- response reason
- private audit trail
- community policy
- opt-in relay contacts
- admin review
- public disclaimer
- no raw contacts by default

---

## 24. Final Design Rule

GSN should not merely say:

**This person is a community member.**

GSN should say:

**This person is known inside a real community, and stronger confirmation can be requested safely through a controlled relay.**

That is the serious, scalable, privacy-safe version of the idea.
