# Protected Button Freeze

## Purpose

This document marks the current "good enough to protect" button surfaces before
the next Marketplace stabilization work.

This is not a perfection claim. It means these surfaces have been brought close
enough for pilot testing that future Marketplace work must not disturb them by
accident.

## Protected Freeze Band

Run this command before and after major Marketplace button work:

```bash
npm --prefix frontend run audit:protected-button-freeze
```

The protected freeze band covers:

- Dashboard route action contracts and phone button geometry.
- Community Home route action contracts, compact rows, app-shell tap rescue, and
  phone button geometry.
- Action Inbox / Notifications button inventory.
- Cover, Login, Create Community, Join Entry, Join Pending, Join Approval,
  Member Activation, Profile, and My GSN and I member-entry action traceability.
- Shared mobile tap guard behavior.
- Global stable-action debug id and raw-action hygiene.
- Route fallthrough recovery away from accidental Cover / Welcome dumping.

## What This Freeze Does Not Cover

Marketplace-specific button inventory is intentionally not part of this freeze
band because Marketplace is the next page family to repair.

Marketplace must be handled lane by lane, with its own route-local audits:

- first apply `docs/GUIDED_WORK_SURFACE_PROTOCOL.md`;
- choose one lane, such as Money Pool;
- map every visible button from outside to inside;
- confirm exact target route, hash, section opening behavior, and explanation
  state;
- fix only that lane;
- run the protected freeze band to prove other stabilized pages stayed calm;
- run Marketplace-specific audits for the lane being changed;
- phone-test that lane before moving to the next one.

## Change Rule

Do not alter a protected page's button target, action count, debug id namespace,
phone geometry, or mobile shell interaction while working on Marketplace unless
the product owner explicitly reopens that protected page.

If a protected audit fails during Marketplace work, first assume the Marketplace
change disturbed a stabilized surface. Fix the disturbance or document the
intentional freeze update before continuing.

## Current Truth

The protected freeze is source-level and audit-level. It does not prove that the
physical phone experience is perfect. The product owner has judged Community
Home and Dashboard close enough for now, roughly usable enough to shield while
the team turns to the more unstable Marketplace page.
