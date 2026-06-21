# Amara Line Audit Runbook

Date: 2026-05-29

Purpose: preserve the existing Amara storyline while auditing the whole line for
flow, button response, focused activity, evidence visibility, and screenshot
readiness.

This is not a new story. The story remains:

Amara has trusted activity in one community and needs to make that trust
understandable, portable, and usable somewhere new.

## Audit Protocol

Every screen in this line must obey these rules:

- One activity at a time. When a user starts an action, unrelated panels should
  collapse, hide, or wait until the action resolves.
- Every action must answer. Success gets a visible response. Failure explains
  what is wrong, why it matters, and the first thing to do next.
- Popups and notices are temporary. They must not become permanent extra pages.
- Public evidence must not expose private/internal evidence. Public verification
  can show the permitted paper, validity state, limits, and public confirmation
  paths only.
- Buttons must be stable. A blocked or not-ready action should still explain
  itself unless the control is genuinely busy/in-flight.

## Screenshot Line

Capture these in order during the live pilot check.

| Shot | Route / screen | Capture purpose | Pass condition |
| --- | --- | --- | --- |
| 01 | `/cover` | Entry starts calmly. | One clear entry decision, no bottom nav before login. |
| 02 | `/login` | Existing member entry. | Sign-in path is obvious and responds to errors. |
| 03 | `/create` | Onboarding/setup lane. | After details, selfie/photo, bank/wallet, and finish, the app responds and presents the next choice. |
| 04 | `/activate` or `/activate-membership` | Activation fallback if used. | Does not silently dump the user away from community growth. If reached, the next action must be clear. |
| 05 | `/app/build-first-circle` | Community growth. | Aim, people, review, and invite are guided without exposing a busy full workspace. Invite actions respond truthfully. |
| 06 | `/app/community` | Community context. | Community identity is understandable; deeper readings do not swallow the story. |
| 07 | `/app/marketplace` | Activity/evidence context. | Marketplace supports the story but does not compete with create/join doors. |
| 08 | `/app/shop-control` | Shop/activity setup. | Shop actions respond; external handoffs report blocked popups or missing links. |
| 09 | `/app/trust` | Trust Passport. | Full private/member trust story is visible only to the signed-in user. |
| 10 | `/app/trust-slip` | Portable evidence. | Current TrustSlip can be refreshed, copied, printed, and verified with truthful success/failure notices. |
| 11 | `/app/trust-slip/verify` | Internal verification view. | Internal evidence is allowed only in app mode. |
| 12 | `/t/GSNAMARA2026` or `/trust-slips/verify/GSNAMARA2026/page` | Public verification. | Public viewer sees only the public paper and public actions; no private/internal disclosure appears. |
| 13 | `/verify/community/:communityKey` if available | Public community confirmation. | Public community record explains current evidence without private member details. |

## Auditor Findings Applied In This Pass

- Public TrustSlip Verify no longer renders the private/internal evidence block
  on public routes. Internal evidence remains available only in app mode.
- Public TrustSlip Verify no longer sends an outside verifier to the protected
  Trust Passport route. Public mode now links to explanatory guide content.
- TrustSlip, TrustSlip Verify, Community Home, and First Circle copy actions now
  await clipboard success before saying "copied." If copy fails, the user gets a
  manual-copy fallback.
- Evidence-line unavailable actions now speak instead of becoming dead disabled
  taps for the patched surfaces: TrustSlip code/link copy, community record open,
  instant confirmation request, and First Circle invite copy.
- Create setup progress now marks the actual open panel as active instead of
  leaving Details visually open while Community or Trust is the current task.
- Print actions now show a fallback notice if native browser print is not
  available.

## Remaining Truths

- Code/docs continuity is stronger, but this is not the same as proving the live
  Render database has the current Amara TrustSlip and related community data.
- Activation fallback can still be improved: if activation happens after create,
  the safer final behavior is to lead into First Circle instead of Dashboard.
- Community Home still carries more numerical evidence/finance/trust readings than
  the screen spec wants. For the Amara live line, keep the narration tight and
  move deeper readings through Trust Passport and Finance.
- Marketplace still contains a create-community door inside a selected
  marketplace link area. It should eventually move to a separate secondary
  start-door lane so Marketplace remains evidence/activity context.
- The existing automated audits pass, but the auditors correctly found that
  audits alone did not catch every disabled-action silence risk. Future audit
  hardening should add a rule for disabled stable actions that have page-level
  blocked guidance.

## Live Test Question

At each screen, ask:

Can Amara or an outside verifier understand exactly what happened, what is true,
what is not guaranteed, and what to do next without the product owner explaining
it verbally?

If the answer is no, the line is not ready enough for that screen.
