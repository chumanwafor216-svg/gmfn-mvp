# AGENTS.md

## Repository boundary
Work only in this `gmfn_mvp` repository for GMFN / GSN tasks.
Do not switch to, inspect, or edit any `present-mvp` workspace unless the product owner explicitly changes this instruction.

## Read before doing any work
Before changing code, read these files in this order:
1. `README.md`
2. `docs/PROJECT_PROTOCOL.md`
3. `docs/FREEZE_POLICY.md`
4. `docs/HANDOFF_NOTES.md`
5. for UX work, also read `docs/DESIGN_SYSTEM.md`, `docs/SCREEN_REGISTRY.md`, `docs/SCREEN_SPECS.md`, and `docs/UX_ACCEPTANCE_CHECKLIST.md`
6. backend and frontend files directly related to the requested route or screen

Do not start coding from assumptions. Inspect the code first.

---

## UX implementation rule
Do not invent new UX structure. Implement the approved screen specs and reference mockups.

This project is being designed manually first. Codex is responsible for clean implementation, not product redesign.

Before implementing any screen, check `docs/reference-mockups/`.
If a matching mockup exists, copy its structure and mood.
Do not redesign it unless the product owner explicitly asks.

Use plan mode before coding substantial UX screens. First propose:
1. components needed
2. layout structure
3. style tokens needed
4. files to edit
5. acceptance checklist

Wait for approval when the UX decision is not already locked.

---

## Product identity
This repository refers to the same product using two names: **GMFM** and **GMFN**.
Until the product owner standardizes the final spelling, treat **GMFM** and **GMFN** as the same system and the same business domain.
Do not create separate concepts, services, routes, or data models based only on the naming difference.

Surface-brand rule:
- **GMFN** = the wider corporation / owner context (`Global Mutual Funds Network`)
- **GSN** = the current user-facing product brand (`Global Support Network`)
- Default all user-visible frontend copy, labels, headers, helper text, and branded UX surfaces to **GSN** unless the product owner explicitly says otherwise.
- Do not rename internal technical contracts, ids, or backend models just for branding unless the task explicitly requires it.

The app should feel:
- premium
- calm
- trusted
- simple
- secure
- spacious
- guided
- not busy

Current owner-frozen UI area:
- The `/app/dashboard` **Market Wisdom** presentation and interaction model is frozen unless the product owner explicitly asks to change it. Do not restyle, restructure, or "improve" that section on your own.

---

## Visual language
Use:
- deep navy background
- gold accents
- white / off-white cards
- large rounded corners
- generous spacing
- strong hierarchy
- minimal exposed content
- one primary action per screen

Avoid:
- clutter
- long exposed sections
- too many buttons at once
- dashboard dumping
- tiny crowded text
- exposing every block at once
- bottom navigation before login

Every screen should follow this structure:
1. Header
2. Hero / identity block
3. One primary action area
4. Compact secondary sections
5. Deeper details only after tap/open

If a page has more than 3 major content sections, collapse secondary sections into cards or rows.
Never expose everything on one surface.

---

## Authentication navigation rule
Before authentication, do not show bottom navigation.

Pre-auth screens include:
- CoverPage
- WelcomeGuidePage
- AuthGatewayPage
- SignInPage
- SignUpChoicePage
- StartCommunityPage
- JoinRequestMembershipPage

After authentication, bottom navigation may appear.

Main authenticated tabs:
- Dashboard
- Community
- Marketplace
- Shop
- Profile

---

## Screen responsibility rules
Dashboard is a command centre, not a content dump.
Use:
- Identity / Trust hero card
- Quick actions
- Spotlight live preview if active
- What Matters Now
- Compact accordion sections

Spotlight should not be fully collapsed when live.
Show one compact live billboard card.
If no active spotlight exists, collapse to a slim placeholder.

Community Home must show:
- Community identity hero
- What do you want to do next?
- Your Communities preview
- Compact rows for Owner Actions, Owner Shop Control, Grow Trusted Circle, Owner Spotlight Status

Do not expose all owner tools on Community Home.

Owner Shop Control is its own page.
It should show:
- Status summary
- Primary actions
- Tool grid
- Secondary cards

---

## Entry flow
The intended entry flow is:

CoverPage -> WelcomeGuidePage -> AuthGatewayPage -> Existing Member Sign In OR New Member Sign Up -> Create Community OR Join Request Membership -> Return to Existing Member Sign In after completion.

There are two new member paths:
1. Create Community - for starters/founders of a new community
2. Join Request Membership - for people joining an existing community by invite or approval

After either process is completed, the user returns to Existing Member Sign In.

---

## UX implementation constraints
- Use reusable components.
- Do not hardcode repeated styles in every screen.
- Use design tokens for color, spacing, radius, and typography.
- Keep screens readable on mobile.
- Use compact cards.
- Use clear empty states.
- Add comments only where helpful.
- Do not create unnamed screens. Every new screen must be added to `docs/SCREEN_REGISTRY.md` first.

Forbidden:
- fake app icon behavior
- fake notifications
- user-to-user payments
- adult-content feed
- exact public location
- cross-silo discovery
- cluttered dashboard sections
- bottom nav before login
- unrelated backend logic while working on UX

Done means:
- the screen matches the approved screen spec
- it uses design tokens
- it uses reusable components
- it is not visually crowded
- it has no bottom nav before login
- the main action is obvious
- secondary content is collapsed or grouped

---

## What this product is
GMFM/GMFN is a community-first platform with these core domains:

- inflow / onboarding / entry funnel
- community creation and community joining
- invite-based access and existing-community entry
- community home
- marketplace
- borrowing
- personal/member dashboard
- community/admin dashboard

The backend is the source of truth for business rules, permissions, and data integrity.
The frontend must represent those rules clearly and consistently.

---

## Source of truth for product behavior
The **original phone behavior** is the current reference for product intent.
If desktop/web behavior differs from the original phone behavior, assume desktop/web should move toward parity unless the project documentation explicitly says otherwise.

UI may differ by screen size.
Business logic, route purpose, state transitions, permissions, and expected outcomes should remain aligned.

---

## Non-negotiable working rules
1. Prefer minimal, reversible changes over broad rewrites.
2. Preserve existing route contracts unless the task explicitly requires changing them.
3. Do not silently merge distinct flows just because they look similar.
4. `create invite` and `join existing community` are distinct flows and must remain distinct unless project documentation explicitly changes that.
5. Respect frozen files and frozen areas.
6. Do not alter auth, permissions, schemas, environment config, or other critical infrastructure unless the task clearly requires it.
7. Do not delete code only because it seems unused until you confirm all references.
8. When uncertain, inspect backend + frontend implementations before asking questions.
9. For low-risk work in non-frozen files, proceed autonomously and then report exactly what changed.
10. After changes, explain impact by route, screen, and shared logic.
11. Default user-visible guidance, helper text, explanation layers, and layman-language translations to shared/system-level frontend logic where possible. Do not leave this kind of interpretation trapped in one page unless the product owner explicitly asks for a page-local exception and that exception is clearly recorded.
12. When a helper block, notification surface, or decision card points a user toward another screen, it should first explain in simple language what is wrong, why it matters, and the first thing to do. Do not make users open another page just to decode the problem unless the product owner explicitly accepts that behavior.

---

## Expected workflow for every task
For every coding task:
1. Read the relevant project docs.
2. Map the affected backend route(s), frontend page(s), components, shared types, and API calls.
3. Identify any desktop-vs-phone parity risk.
4. Confirm whether any frozen files are involved.
5. Make the smallest safe change.
6. Run relevant tests, checks, or build commands if available.
7. Report:
   - files changed
   - routes/screens affected
   - behavior changed
   - remaining risks or unknowns
8. Update `docs/HANDOFF_NOTES.md` after substantial work so the next session can resume without depending on chat history.
9. During active pilot testing, commit and push completed fixes unless the product owner explicitly says not to publish yet. If the worktree contains unrelated changes, stage only the files that belong to the completed fix and report the pushed branch/commit.
10. Active pilot deploy protocol:
   - after a verified fix is committed, push the working branch and promote the same commit to `main`;
   - treat `main` as the Render deployment branch;
   - verify the `Trigger Render Deploy` GitHub Actions run after the `main` push;
   - if GitHub does not have `RENDER_FRONTEND_DEPLOY_HOOK_URL` or `RENDER_API_KEY`, trigger the frontend Render deploy hook out-of-band when the product owner provides it and report the Render deploy id;
   - never commit Render deploy hook URLs, API keys, or other deployment secrets into the repository;
   - do not claim Render deployed unless the GitHub workflow accepted a deploy hook/API request, Render auto-deploy is confirmed, or Render returned a deploy id.

---

## Core route map to keep in mind
Use this mental model unless code proves otherwise:

- **Inflow** = the entry funnel for first-time or returning users
- **Create invite** = admin/community-owner controlled invite generation and invite-based entry
- **Join existing community** = a user enters a community that already exists
- **Community home** = primary landing space after membership or community selection
- **Marketplace** = listings / exchange / opportunity layer
- **Borrowing** = borrowing request and borrowing lifecycle layer
- **Member dashboard** = personal user view across activity
- **Community/admin dashboard** = management and oversight view for a community

---

## Main repo goal right now
The current priority is not random feature invention.
The current priority is to make the system understandable, stable, and aligned across backend, frontend, and desktop-vs-phone behavior.

The assistant should reduce unnecessary questions by first learning the repo's business intent from documentation and code.

---

## Damage prevention
Before any non-trivial edit, verify:
- what route this change belongs to
- who uses this route
- whether the route already exists in backend and frontend
- whether the same behavior already exists in the original phone flow
- whether a frozen file or critical shared module is touched

If a task would require changing a frozen file or a critical cross-cutting contract, stop and propose the smallest possible scoped change first.

---

## Preferred output style
When reporting work:
- be concrete
- name files
- name routes
- name assumptions
- separate confirmed facts from inferred behavior
- do not give vague summaries when exact mappings can be provided
