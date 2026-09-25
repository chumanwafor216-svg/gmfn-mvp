# GSN Community Domain Governance Cleanup Handoff

Date: 2026-09-25
Status: first two cleanup slices implemented locally
Owner: Chukwuma Nwafor / Global Support Network Ltd

## Purpose

Community Domain had accumulated many real governance, setup, billing, member,
record, reporting, and operating tools. The product owner asked for the
beginning of the journey to become easier: finish Step 1, then GSN directs the
owner to Step 2, and mistakes are explained in place.

## Implemented Slices

A guided setup path was added to the top of the Community Domain command
surface in `frontend/src/pages/CommunityDomainDashboardPage.tsx`.

The path now shows:

- Step 1: Identity;
- Step 2: Package;
- Step 3: People;
- Step 4: Authority;
- Step 5: Rules;
- Step 6: Launch;
- progress count such as `2/6`;
- `Done`, `Do now`, `Fix first`, and `Next` state labels;
- one primary continue/fix action;
- blocker messages when the owner tries to jump ahead too early.

The existing Community Domain engines were not duplicated. The guided path opens
existing setup, billing, people, authority, governance, and launch actions.

## Audit Protection

`frontend/tools/audit-community-domain-product-contracts.mjs` now checks that
the guided setup path, step states, primary action, and earlier-step blocker
messages stay present.

## Verification

Passed locally:

- `npm --prefix frontend run audit:community-domain-product-contracts`
- `npm --prefix frontend run build`
- `git diff --check -- frontend/src/pages/CommunityDomainDashboardPage.tsx frontend/tools/audit-community-domain-product-contracts.mjs`

## Remaining Cleanup

This is only the first slice. The deeper governance cleanup is not finished.
Next useful slices:

1. Reduce the visible `Set up the institution` stage board so it feels secondary
   to the guided setup path.
2. Apply the same step-first pattern inside Governance jobs, especially Records
   and Access requests.
3. Simplify Real-life record setup so one record type opens one staged form and
   old task surfaces close automatically.
4. Add a phone visual audit for the guided setup path to confirm the first
   viewport is calm on 390px mobile.

## Devil Truth

The page is now easier at the front door, but Community Domain governance is not
fully simplified yet. The first screen has a clear setup path; the deeper panels
still contain many powerful tools and need further lane-by-lane cleanup.