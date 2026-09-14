# GSN Community Setup Pack: Deployment Pack Index (2026-09-14)

Authenticity mark: GSN Original Community Setup Material | Source-controlled in gmfn_mvp/docs | Document date: 2026-09-14
Document date: 2026-09-14
Pack: GSN Community Setup Pack
Authenticity mark: GSN original community setup material, source-controlled in `gmfn_mvp/docs`.

## Purpose

This index turns the generated GSN documents into a reusable deployment-stage pack. Use it when setting up a Community Domain or preparing handover material for a group that needs to explain GSN to leaders, managers and members.

The pack has two sides:
- **Operator side:** what GSN must configure, verify, test and hand over.
- **Client side:** what the organisation receives so it can distribute instructions and stories to members.

## Canonical Source Set

| Role | File | Use |
|---|---|---|
| Core capability set | `GSN_CORE_CAPABILITY_SET_2026-09-14.md` | Public/app-facing stable capability set selected from the deeper bank. |
| Live setup guide | `../gsn-user-guide/GSN_SELF_SERVICE_USER_GUIDE.md` | Current setup/status authority for what to set up, what it does and how to use it. |
| Word setup guide | `../gsn-user-guide/GSN_SELF_SERVICE_USER_GUIDE.docx` | Editable client handover copy. |
| PDF setup guide | `../gsn-user-guide/GSN_SELF_SERVICE_USER_GUIDE.pdf` | Send-ready read-only client copy. |
| Feature inventory | `../gsn-user-guide/GSN_FEATURE_INVENTORY_AUDIT.md` | Internal evidence-backed list of user-facing capabilities. |
| Dependency map | `../gsn-user-guide/GSN_FEATURE_DEPENDENCY_AND_SETUP_MAP.md` | Setup order and prerequisites. |
| Route/recovery map | `../gsn-user-guide/GSN_ROUTE_AND_RECOVERY_MAP.md` | Where users go when something is missing, stale or blocked. |
| Issue register | `../gsn-user-guide/GSN_DOCUMENTATION_ISSUE_REGISTER.md` | Known truth gaps before public training release. |
| Master capability bank | `../gsn-user-guide/real-life-capability-bank/GSN_IN_REAL_LIFE_MASTER_CAPABILITY_BANK.md` | Full menu of real-life GSN capabilities. Do not send whole master to every group. |
| Audience selection map | `../gsn-user-guide/real-life-capability-bank/GSN_IN_REAL_LIFE_SELECTION_MAP.json` | Machine-readable map for choosing audience-specific modules. |
| Audience pick lists | `../gsn-user-guide/real-life-capability-bank/GSN_IN_REAL_LIFE_AUDIENCE_PICK_LISTS.md` | Short first-send guide for choosing the right copy. |
| QR download index | `GSN_COMMUNITY_SETUP_QR_DOWNLOAD_INDEX_2026-09-14.pdf` | Phone-friendly scan sheet for opening key setup articles without typing links. |

## Deployment Stage Use

### Stage 1. First conversation

Send:
- one audience-specific `GSN in Real Life` copy
- the QR download index when people will receive the material by phone or paper
- the short audience pick-list if the organisation is still deciding scope
- one or two relevant stories from `GSN_COMMUNITY_SETUP_STORY_BANK_2026-09-14.md`

Do not send the full master bank unless the receiver is helping design the rollout.

### Stage 2. Setup agreement

Use internally:
- `GSN_FEATURE_DEPENDENCY_AND_SETUP_MAP.md`
- `GSN_ROUTE_AND_RECOVERY_MAP.md`
- `GSN_DOCUMENTATION_ISSUE_REGISTER.md`

Send to client leaders:
- `GSN_SELF_SERVICE_USER_GUIDE.pdf`
- a selected audience copy from the real-life capability bank

### Stage 3. Community Domain setup

Use the setup guide to walk through:
- leader/admin account
- community creation or join path
- Community Domain draft or setup route
- member entry/invite/QR path
- bulletin/notice policy
- shop/marketplace controls if the group needs economic activity
- TrustSlip/TrustPassport evidence boundaries
- analytics and Opportunity Engine only after activity exists

### Stage 4. Member distribution

Give the organisation:
- member-safe setup guide
- audience story copy
- the QR download index or the QR page inside the selected PDF/DOCX
- QR/invite instructions produced from the live app
- clear support/recovery path

Truth boundary: member distribution material must not expose internal admin routes, backend claims, private evidence, or owner-only analytics.

### Stage 5. Upgrade or change

When the product changes:
- update the source Markdown/JSON/CSV
- rebuild DOCX/PDF outputs
- update this index and `pack_manifest.json`
- record the change in `../HANDOFF_NOTES.md`

## Naming Rule

Every public-facing document title should begin with `GSN`, name the audience or purpose, and include a document date. Weak titles such as only `Master Capability Bank` or `Copy` are not enough for client distribution.

Good examples:
- `GSN Community Setup Pack: What to Set Up, What It Does, and How to Use It (2026-09-14)`
- `GSN Community Setup Pack: GSN in Real Life Master Capability Bank (2026-09-14)`
- `GSN Community Setup Pack: Church and Faith Group Real-Life Copy (2026-09-14)`

## Authenticity Rule

Every send-ready DOCX/PDF must include one of:
- a footer authenticity line
- a visible watermark
- a cover-page authenticity note

Suggested mark:

`GSN Original Community Setup Material | Source-controlled in gmfn_mvp/docs | Document date: 2026-09-14`

Devil truth: a watermark shows origin and version discipline. It does not stop screenshots, copying, forwarding, or misuse by itself.
