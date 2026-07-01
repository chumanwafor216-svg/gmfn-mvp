# GMFN MVP

## Session continuity

To resume work quickly after a chat reset or a new session, read
`docs/HANDOFF_NOTES.md` after the core project docs. It tracks the latest
active workstream, exact routes/screens in play, confirmed facts from code, and
the next recommended step.

For route-purpose or architecture work, also read
`docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
It is the current authoritative skeleton for how Community Home, Marketplace,
Shop Gallery, Finance, Trust Passport, TrustSlip, CCI, Dashboard, and Admin fit
together.

For mobile UI density, screenshot readiness, lane collapse, and action-surface
work, also read `docs/GSN_MOBILE_UI_PROTOCOL.md`.

For production polish, icon meaning, screenshot-quality, evidence-document
presentation, and route completion gates, also read
`docs/GSN_PRODUCTION_POLISH_STANDARD.md`.

For public verification, TrustSlip, Trust Passport, merchant verification,
evidence-pack, registry-record, or official trust-document visual work, also
read `docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md`.

For app-wide page auditing, including entry-to-dashboard checks, in-page
navigation, action response, placeholder truth, permission visibility, and
domain-by-domain cage rules, also read `docs/APP_WIDE_AUDIT_PROTOCOL.md`.

For innovation-case, investor, policy, TrustSlip, merchant-verification, or
development-finance explanation work, also read
`docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`.

For Trust Event, Trust Passport, TrustSlip, Community Domain settings,
governance, delegated authority, onboarding, identity, membership,
verification, Trust Graph, relationship intelligence, behaviour evidence,
Marketplace, trusted commerce, Community Finance, financial evidence, or future
Committee evidence-capture work, also read
`docs/GSN_MISSION_PROTOCOL_2026-06-30.md` first,
then
`docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_DECISION_FRAMEWORK_DESIGN_PHILOSOPHY_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_DOMAIN_ENGINE_PHILOSOPHY_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_SETTINGS_ENGINE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_GOVERNANCE_DELEGATED_AUTHORITY_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_ONBOARDING_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_IDENTITY_MEMBERSHIP_TRUST_VERIFICATION_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_API_DATABASE_SYSTEM_ARCHITECTURE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_EVOLUTION_RESEARCH_FUTURE_EXTENSION_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_ENGINEERING_CONSTITUTION_CHANGE_CONTROL_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_FOUNDATIONAL_DATA_MODEL_ENTITY_RELATIONSHIP_CONSTITUTION_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_ARCHITECTURAL_DECISION_REGISTER_CONFLICT_RESOLUTION_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_INTEGRATED_COMMUNITY_LIFECYCLE_PROTOCOL_2026-06-30.md`,
then
`docs/GSN_TRUST_EVENT_STANDARDIZATION_PROTOCOL_2026-06-29.md`.

Together, these Community Domain protocols define the **GSN Community Domain
Operating System (CDOS)**: the operating model for how institutions run on GSN.
Protocol 23 is numbered later but should be read first as the permanent mission
protocol explaining why GSN exists.
Protocol 20 should be read next as the first-principles engineering
constitution.
Protocol 21 should be read immediately after it as the decision compass for
product, engineering, and architecture tradeoffs.
Protocol 22 should be read next as the permanent invariant list of what future
GSN work must never break.
Protocol 24 and Protocol 25 should be read next for user journeys, screen
ownership, core navigation, and UI implementation order.
Owner implementation directive: keep the current navigation pages and route
contracts as they are. Do not use Protocol 25 to replace the existing navigation
model or force strict screen ownership unless there is an absolute documented
need.
Do not renumber supplied protocols to force a continuous sequence; missing
protocol numbers remain reserved until the product owner provides them.

## Backend

The backend is built with **FastAPI**, **SQLAlchemy**, and **Alembic**.

### Running backend tests locally

```bash
cd gmfn_backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt
python -m pytest -q tests
```
