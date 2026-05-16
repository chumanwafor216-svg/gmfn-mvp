# GSN Instant Community Confirmation Protocol

Date: 15 May 2026  
Status: Supersedes earlier Community Confirmation Relay wording where it implied admin confirmation.

## 1. Purpose

Instant Community Confirmation is the live layer above TrustSlip and Trust Passport.

It answers one practical question:

**Can this person's community confirm them right now, for this specific decision, without exposing private member contacts?**

TrustSlip remains the static proof. Instant Community Confirmation is the real-time reassurance layer.

## 2. Core Rule

The confirmation outcome must be calculated from community member responses.

It must not say or imply that an app admin, community admin, or GSN staff member personally confirmed the person unless that person actually responded as one eligible community responder.

Community admins may manage policy and eligible contact routing. They do not become the automatic confirmation authority.

## 3. What The Reader Sees

The reader should see a controlled summary, for example:

- 5 requests sent
- 3 responses received
- 2 confirmed known and acceptable for this low-risk decision
- 1 advised reducing risk or asking for more evidence
- 0 objections raised
- 3 of 20 active community members responded
- outcome: moderate community confirmation

This is not a percentage vote. It is a factual response count against the active community context.

## 4. What Must Stay Private

Public TrustSlip, Trust Passport, and public confirmation pages must not expose:

- raw phone numbers
- raw email addresses
- full member lists
- individual voter names
- who voted yes, caution, objection, or skipped
- private responder notes

Outwardly, responses are anonymous and aggregate.

Internally, responses are attributable and auditable.

## 5. Who Can Start A Request

Two initiation paths are allowed:

1. **Member-initiated**: the member facing the merchant or outsider requests live confirmation.
2. **Verified requester initiated**: a merchant or trusted requester asks for stronger confirmation, with reason, risk band, and member consent or visible consent prompt.

A random public outsider must not be able to broadcast requests into a community without control.

## 6. Request Inputs

Every request should record:

- subject user
- community
- TrustSlip if present
- reason type
- risk band
- amount band if relevant
- requester type
- requester identity or public label
- created time
- expiry time

Common reason types:

- goods release
- service trust check
- support confirmation
- merchant review
- emergency assistance
- work or opportunity check
- other

Risk bands:

- very low
- low
- moderate
- high

## 7. Who Receives The Request

The request should go to an eligible confirmation pool, not the whole community by default.

Preferred order:

1. Direct approved references: nominated trusted contacts, selected supporters, selected sponsors, previously approved references.
2. Formal community contacts: admin, trusted circle lead, sponsor-backed members, voting members who admitted the person, approved community verifiers.
3. Wider eligible community fallback only if policy allows.

The closest people may be different from the people who originally voted the member in, so the pool should not be limited only to admission voters.

## 8. Responder Options

Responder choices should not be only yes/no.

Recommended response types:

- Yes, known and acceptable for this low-risk decision.
- Known, but reduce the risk or do not release the full amount.
- Known, but ask for more evidence.
- Cannot confirm now.
- Raise concern or send to admin review.
- Skip.

Non-response should be recorded as availability/freshness data, not automatically as bad character.

## 9. Time Window

Default live window:

- 2 minutes for instant confirmation
- optional extension to 5 minutes if not enough responses arrive

The public outcome must show freshness:

- still waiting
- response window closed
- extended
- admin review sent

## 10. Outcome Logic

The system should translate responses into plain outcome bands:

- **Strong**: enough positive responses, no objection, fresh active contacts.
- **Moderate**: required positive responses received, no serious objection, normal caution.
- **Mixed**: positive and caution signals both exist; reduce risk.
- **Weak**: too few responses; do not rely on this alone.
- **Flagged**: objection or dispute; admin review required.
- **Pending**: waiting for responses.

The required number of positive responses is a policy number, not a percentage.

Example:

If 20 people are active in the community and 5 are asked, the result should say exactly how many were asked and how many responded. It should not pretend that the whole 20 voted.

## 11. Trust Events

Every instant confirmation cycle should create trust events for:

- the member requesting confirmation
- the responders who answered or skipped
- the verified requester or merchant where applicable
- the community's response health

The record should include reason, risk band, time, response counts, outcome, and later dispute or release result if available.

## 12. If Something Goes Wrong Later

GSN does not guarantee the transaction, but the confirmation cycle creates a traceable record:

- who requested
- who was asked
- who responded internally
- what aggregate outcome was shown
- risk band
- amount band if present
- timestamp
- later release or dispute record if captured

This is stronger than undocumented phone calls.

## 13. UI Language

Use:

- Instant Community Confirmation
- Request instant community confirmation
- Ask community to confirm now
- Community response
- Responses received
- Active community members
- Use your own judgement

Avoid:

- admin confirmed
- community/admin confirmed
- guaranteed
- approved for release
- everyone voted
- percentage approval unless the full voting population actually voted

## 14. Final Design Rule

TrustSlip shows that a person belongs to a trust system.

Instant Community Confirmation shows whether that trust system is willing to stand behind the person right now, for this specific decision.

The implementation must be live, consented, anonymous outwardly, auditable internally, and based on aggregate community responses.
