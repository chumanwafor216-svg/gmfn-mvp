# AGENTS.md

## Read before doing any work
Before changing code, read these files in this order:
1. `README.md`
2. `docs/PROJECT_PROTOCOL.md`
3. `docs/FREEZE_POLICY.md`
4. `docs/HANDOFF_NOTES.md`
5. backend and frontend files directly related to the requested route or screen

Do not start coding from assumptions. Inspect the code first.

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

Current owner-frozen UI area:
- The `/app/dashboard` **Market Wisdom** presentation and interaction model is frozen unless the product owner explicitly asks to change it. Do not restyle, restructure, or "improve" that section on your own.

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
