# GSN Community Domain Governance Cleanup Handoff

Date: 2026-09-25
Status: first fifteen cleanup slices implemented locally
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

Identity setup now starts with a self-service package path:

- Step 1: Domain name;
- Step 2: Category;
- Step 3: Profile;
- prepared category choices for School, Church, Charity / NGO, and Association;
- Other as the only path that shows manual type/template fields and a support link.

The raw `domain_type` and `template_key` fields are no longer exposed as the ordinary setup path.
After category selection, the setup workbench now uses package-aware titles,
notes, and examples:

- School owners see language such as campuses, classes, staff, parents, students,
  school-fee tracking, guardian contacts, and attendance support;
- Church owners see branches, ministries, leaders, members, official messages,
  offering QR, attendance QR, response QR, and church summary language;
- Charity / NGO owners see programmes, sites, team, beneficiaries, support
  evidence, outcome records, and sponsor-safe reporting language;
- Association owners see units, committees, officials, members, dues or levies,
  member support, and records language;
- Other keeps custom wording so the owner can describe the organisation.

The launch completion state now shows `Setup completed`, explains that the
setup checkpoint is done, and exposes one state-aware next task only. It points
to Community Home connection when no linked Community Home exists, Member
Invite policy when invites are blocked, or First Circle when the invite path is
ready. The old broad invite card no longer appears before setup completion.

Inside the setup workbench, GSN now recommends continuing the active setup step
first. Access is described as an exception for locked editing or trusted setup
editor authority, so the owner is not asked to choose between parallel setup
surfaces before finishing the current task.

The secondary setup overview now starts with the next setup action instead of
asking the owner to choose a setup stage first. Reference views remain available
behind closed selectors for facts and counts.

Structure focus now recommends the Structure map before readiness or rollout,
while the deeper stage and view selectors remain closed until needed.

Services focus now recommends Readiness before local rules or trust views, while
the deeper stage and view selectors remain closed until needed.

Members focus now recommends Member readiness before roster control, while the
deeper stage and view selectors remain closed until needed.

The older Community Domain setup tools drawer was made secondary:

- the old primary button now reads `More setup tools`;
- opening the drawer now restates the current guided setup step first and gives
  one action back to that step before the older stage tiles;
- the four older stage tiles use secondary visual weight;
- blocked stage actions now remain tappable and explain the blocker in place,
  including missing Community Home link, disabled Member Invites, and
  owner/admin-only community actions;
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

The school governance packet now exposes one selected work area at a time:

- Readiness;
- Notices;
- Fees;
- Contacts;
- Attendance.

The older school sections remain intact, but they are hidden unless their school
work area is selected.

Access request wording now separates governance approval from membership apply:

- approve-only records the owner/admin decision;
- approve-and-apply adds the person only when the review is ready and accepted;
- approved requests show an explicit apply membership step.

Director and sponsor reporting now start with a guided report path in
`frontend/src/pages/communityDomainDashboard/PeriodSponsorSummaryPanels.tsx`:

- Step 1: Read boundary;
- Step 2: Review facts;
- Step 3: Check delivery;
- Step 4: Prepare output.

PDF/export controls are no longer exposed at the top by default; they appear
only when the owner reaches the output step or opens the sponsor export view.

Operating summary now exposes a direct active-domain path in
`frontend/src/pages/communityDomainDashboard/OperatingSummaryPanel.tsx`:

- Step 1: Do next;
- Step 2: Check status;
- Step 3: Check allowance;
- Step 4: Review permissions.

The older Action/Reference and question selectors remain available, but they are
secondary to the path.

## Audit Protection

`frontend/tools/audit-community-domain-product-contracts.mjs` now checks that
the guided setup path, step states, primary action, and earlier-step blocker
messages stay present. It also checks that Governance jobs keep the numbered
work path before exposing deeper stage/job selectors, that Real-life record
capture shows direct staged paths before secondary step changers, that the
school governance packet keeps heavy sections behind one selected work area,
that Access requests explain approve-only vs apply-membership in the panel
itself, that report output controls stay behind the guided report path, that
Operating summary shows the active-domain path before secondary selectors, and
that identity setup keeps the domain-code check, category package chooser,
Other-only manual fields, package-aware setup wording, and support link.

## Verification

Passed locally:

- `npm --prefix frontend run audit:community-domain-product-contracts`
- `npm --prefix frontend run build`
- `git diff --check -- frontend/src/pages/CommunityDomainDashboardPage.tsx frontend/tools/audit-community-domain-product-contracts.mjs docs/SCREEN_SPECS.md docs/GSN_COMMUNITY_DOMAIN_GOVERNANCE_CLEANUP_HANDOFF_2026-09-25.md`

## Remaining Cleanup

The first ten cleanup slices are in place. The deeper governance cleanup is not finished.
Next useful slices:

1. Add a phone visual audit for the guided setup path, governance work path, and
   real-life record staged paths to confirm the first viewport is calm on 390px mobile.
2. Live-test access requests with school/church admins to confirm the approve/apply wording is understood.
3. Continue lane-by-lane cleanup for reports and operating summaries if they
   still feel like expert consoles.
4. Consider a later split of school-specific packet sections into separate lazy panels if the pilot shows the selected work-area pattern is still too dense.

## Devil Truth

The page is now easier at the front door. Identity setup, package-guided setup wording, Governance jobs, Real-life record capture, the school packet, access requests, report output, and operating summary now have clearer selected paths and action wording. The system is still not fully simplified: the wider Community Domain surface still needs phone visual checks and pilot-led cleanup.
