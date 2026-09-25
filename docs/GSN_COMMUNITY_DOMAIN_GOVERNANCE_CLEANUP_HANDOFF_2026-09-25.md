# GSN Community Domain Governance Cleanup Handoff

Date: 2026-09-25
Status: first four cleanup slices implemented locally
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

The older Community Domain setup tools drawer was made secondary:

- the old primary button now reads `More setup tools`;
- the four older stage tiles use secondary visual weight;
- the header tells the owner to follow the guided setup path first.

Governance jobs now start with a numbered work path inside
`frontend/src/pages/communityDomainDashboard/GovernanceFocusPanel.tsx`:

- Step 1: Check readiness;
- Step 2: Handle access;
- Step 3: Record evidence;
- Step 4: Review reports.

The older governance stage/job selectors remain available, but they are now
secondary behind `More governance stages` and `Change job`.

Real-life record setup now shows direct staged paths inside
`frontend/src/pages/communityDomainDashboard/RealLifeRecordPanel.tsx`:

- Activity: Person, Activity, Evidence;
- Beneficiary outcome: Person, Change, Proof.

The older `Change step` controls remain available for correction, but the normal
path is now visible before those controls.

## Audit Protection

`frontend/tools/audit-community-domain-product-contracts.mjs` now checks that
the guided setup path, step states, primary action, and earlier-step blocker
messages stay present. It also checks that Governance jobs keep the numbered
work path before exposing deeper stage/job selectors, and that Real-life record
capture shows direct staged paths before secondary step changers.

## Verification

Passed locally:

- `npm --prefix frontend run audit:community-domain-product-contracts`
- `npm --prefix frontend run build`
- `git diff --check -- frontend/src/pages/CommunityDomainDashboardPage.tsx frontend/tools/audit-community-domain-product-contracts.mjs`

## Remaining Cleanup

The first three cleanup slices are in place. The deeper governance cleanup is not finished.
Next useful slices:

1. Add a phone visual audit for the guided setup path, governance work path, and
   real-life record staged paths to confirm the first viewport is calm on 390px mobile.
2. Review Access request wording after live testing to confirm school/church
   admins understand approval vs apply-membership.
3. Continue lane-by-lane cleanup for reports and operating summaries if they
   still feel like expert consoles.
4. Consider a later split of school-specific packet sections if the pilot shows
   they still feel too dense after staged entry.

## Devil Truth

The page is now easier at the front door. Governance jobs and Real-life record capture now have clearer numbered/staged paths. The system is still not fully simplified: school packet details, access request wording, and reporting panels still contain many powerful tools and need pilot-led cleanup.
