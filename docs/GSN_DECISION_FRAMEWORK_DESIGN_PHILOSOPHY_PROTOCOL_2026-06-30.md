# GSN Community Domain Operating System (CDOS)

## Protocol 21 - Decision Framework and Design Philosophy Protocol

**Version:** 1.0
**Status:** Architectural Decision Protocol
**Audience:** Founders, Codex Developers, Product Designers, Technical Leads

---

## Related Protocols

Protocol 23, `docs/GSN_MISSION_PROTOCOL_2026-06-30.md`, defines the enduring
mission every product, engineering, and architecture decision should ultimately
serve.

Protocol 20, `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`, defines the
first-principles constitution this decision framework applies.

Protocol 22, `docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`,
defines the permanent invariants this decision framework must protect when
product, engineering, and architecture tradeoffs are made.

Protocol 24,
`docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md`, defines the
journey-level UX decisions this framework should protect.

Protocol 25,
`docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
defines the screen-level implementation order this framework should guide.

---

## 1. Purpose

This protocol establishes the reasoning framework used when making every
product, engineering, and architectural decision inside GSN.

It exists because good software is built not only from code, but from consistent
decision making.

When multiple implementation options exist, this protocol determines which
direction GSN should take.

---

## 2. Constitutional Principle

GSN should always choose the solution that strengthens communities while
preserving Trust Infrastructure.

Convenience must never compromise trust.

Complexity must never replace clarity.

---

## 3. Decision Priority Order

Every design decision must be evaluated in this order:

1. Protect Community Governance.
2. Protect Trust Evidence.
3. Protect Community Memory.
4. Protect Simplicity.
5. Protect Performance.

If two solutions conflict, the higher priority wins.

---

## 4. Configuration Before Customization

Whenever a new requirement appears, ask:

> Can this be solved through Community Settings?

If yes:

- Configure.

Do not build another version of the platform.

---

## 5. Human Before Automation

GSN should automate:

- repetitive work;
- calculations;
- routing;
- notifications;
- reporting.

GSN should never automate:

- community judgement;
- governance;
- trust decisions;
- disciplinary decisions.

Communities remain responsible for people.

GSN remains responsible for infrastructure.

---

## 6. Evidence Before Opinion

Every significant action should create evidence.

Never rely upon assumptions when observable evidence can be preserved.

Evidence always has priority over opinion.

---

## 7. Governance Before Convenience

If a feature bypasses existing community leadership to make onboarding faster,
reject it.

If a feature strengthens delegated governance while keeping onboarding
practical, prefer it.

---

## 8. One Core Platform

There must never be:

- School Edition;
- Church Edition;
- Market Edition.

There is only:

- GSN.

configured differently through Community Settings.

---

## 9. Local Knowledge Before Central Knowledge

Whenever possible:

- The nearest responsible leader should make the decision.

Example:

```text
Member verification
-> Line Leader
```

Not:

```text
Member verification
-> GSN Administrator
```

Local knowledge is stronger than central assumptions.

---

## 10. Trust Before Scale

Growth is important.

Trust is more important.

GSN should refuse shortcuts that increase growth by reducing trust quality.

Long-term credibility is a strategic asset.

---

## 11. Community Memory Before Fresh Starts

The platform should preserve history.

Members should not repeatedly rebuild their reputation because:

- leadership changed;
- departments changed;
- technology changed.

History is an asset.

---

## 12. Backward Compatibility Before Novelty

New features should enhance existing protocols.

They should not invalidate previous Trust Events or Community Memory.

---

## 13. Opportunity Through Existing Relationships

GSN should always ask:

> Can this opportunity travel through existing trusted relationships instead of
> random broadcasting?

If yes, prefer trusted propagation.

---

## 14. The Founder Test

Before implementing any feature, ask:

> Does this help communities preserve, organise, communicate, or mobilise the
> value they already create?

If the answer is no, reconsider whether the feature belongs in GSN.

---

## 15. Coders Must Always Ask

Before writing code:

- Which protocol governs this?
- Which engine owns this?
- Which Community Setting controls this?
- Which Trust Events are created?
- Which audit records are generated?
- Which Community Memory is preserved?

If any answer is missing, implementation should pause until clarified.

---

## Constitutional Statement

The purpose of GSN is not to maximise features.

The purpose is to maximise coherent trust infrastructure.

Every engineering decision should therefore strengthen Community Governance,
preserve Trust Evidence, simplify operation, and protect Community Memory.

This protocol serves as the decision compass for every future contributor to
the GSN Community Domain Operating System.
