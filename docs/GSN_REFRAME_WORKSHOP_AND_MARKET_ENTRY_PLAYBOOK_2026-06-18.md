# GSN Reframe Workshop And Market Entry Playbook

Date: 2026-06-18

Status: Strategic working document for current MVP comparison, gap analysis,
minimum adjustment planning, and market-entry storytelling.

Source truth used:

- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`
- `docs/FRONTEND_ENDPOINT_EXPOSURE_AUDIT.md`
- `docs/ONE_PAGE_ROUTE_MAP_2026-04-19.md`
- current frontend route map in `frontend/src/App.tsx`

Follow-up source truth:

- `docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md`

Unabated truth: this document does not demonstrate product-market fit. It reframes
what is already built and identifies where the MVP presentation must become
clearer before pilots, partners, investors, churches, associations, markets, or
universities can understand the system quickly.

## 1. Core Discovery

GSN is not primarily:

- a marketplace
- a ROSCA app
- a lending app
- a community app
- a verification app

Those are applications inside the system.

GSN is:

**trust infrastructure for organized communities.**

The practical meaning is:

**GSN helps organized communities make trust visible, portable, verifiable, and
usable.**

The concrete community package is:

**GSN Verified Community Domain**

That package protects a parent community identity, lets groups form freely, lets
members record witness evidence for one another, and requires parent-domain
acknowledgement before any group can claim acknowledged standing under the
protected community domain.

The old product question was:

> What features have we built?

The stronger product question is:

> Which existing trust system are we making visible, recordable, portable, and
usable?

## 2. Strategic Reframe

Old thinking:

**We built an app.**

New thinking:

**We built trust infrastructure.**

Old thinking:

**Users join GSN.**

New thinking:

**Communities adopt GSN, and members carry trust through it.**

Old thinking:

**GSN helps communities.**

New thinking:

**GSN helps organized communities make trust work beyond the room, street,
market, church, campus, or association where that trust already exists.**

This matters because GSN should not chase random users first. It should go
where trust is already organized:

- apprenticeship systems
- market associations
- cooperatives
- churches
- town unions
- social clubs
- universities
- diaspora associations

## 3. The Five Trust Layers

### Layer 1 - Personal Trust Layer

Status: mostly built.

Current MVP assets:

- Trust Passport: `/app/trust`
- TrustSlip: `/app/trust-slip`
- TrustSlip public verification: `/t/:code` and `/trust-slips/verify/:code`
- Identity and integrity: `/app/identity`
- CCI reading: `/app/cci-reading`
- trust events and evidence surfaces in admin and trust pages
- stable member identity through one global member ID
- community membership context

Purpose:

Help a person carry trust, integrity, credibility, and reputation across
environments.

Question:

Can a person avoid starting from zero when entering a new environment?

GSN answer:

Yes, when the evidence is current, consented, understandable, and verified.

Devil's advocate:

The layer is conceptually strong, but it must not sound like a magic score.
TrustSlip is evidence for a decision, not an automatic approval, bank guarantee,
or universal credit score.

### Layer 2 - Community Trust Layer

Status: partially built.

Current MVP assets:

- community creation and membership routes
- join requests and approvals
- invites
- voting and review surfaces
- community IDs
- community administration
- public community verification route: `/verify/community/:communityKey`
- community confirmation routes and policy surfaces

Needs better presentation:

- community public profile
- community verification surface
- community reputation
- community health
- community trust summary
- community public face for outsiders

Purpose:

Help communities become trusted institutions.

Question:

Can people trust the community itself?

GSN answer:

Partly yes now. The internal mechanics exist, but the outside-facing community
institution story is still weaker than the personal TrustSlip story.

Devil's advocate:

This is the biggest strategic gap. If outsiders cannot understand whether the
community itself is real, active, responsive, and governed, then member-level
trust is weaker. Personal evidence needs institutional backing.

### Layer 3 - Community Operating Layer

Status: mostly built.

Current MVP assets:

- Marketplace as the operational nucleus of one selected community:
  `/app/marketplace`
- Finance: `/app/finance`
- Loans and support: `/app/loans`
- loan readiness, suggestions, workbench, summary, repayment, guarantor inbox,
  and guarantor earnings routes
- ROSCA/contribution controls in current operational surfaces
- payment instructions, payment rails, payout details, money in, and money out
- community records, confirmations, membership, and admin review surfaces

Purpose:

Help communities operate with transparency and accountability.

Question:

Can a community manage support, contributions, money movement, requests, and
records better?

GSN answer:

Yes, but users must understand that these activities are not random modules.
They are evidence-generating community operations.

Devil's advocate:

The MVP can still feel like many pages instead of one operating layer. The
minimum fix is not new logic; it is stronger page framing and route-level
language that explains why each action creates trust evidence.

### Layer 4 - Trusted Commerce Layer

Status: mostly built.

Current MVP assets:

- Marketplace: `/app/marketplace`
- Shop Control: `/app/shop-control`
- Shop Assets: `/app/shop-assets`
- public shop face: `/shop/:gmfnId`
- Spotlight and Subscription Spotlight
- Demand Box: `/app/demand-box`
- Vault and private access links
- Trust Passport, TrustSlip, identity, and community verification support

Purpose:

Help buyers and sellers trust each other before money, goods, introductions, or
support move.

Question:

Can trust reduce friction in trade?

GSN answer:

Yes, especially when shop identity, community identity, TrustSlip, and public
verification are shown as one coherent trust package.

Devil's advocate:

Marketplace must not look like a generic classifieds page. If the first signal
is "products" rather than "trusted community commerce", the strategic
difference is hidden.

### Layer 5 - Trust Mobility Layer

Status: built but under-positioned.

Current MVP assets:

- Trust Passport
- TrustSlip
- public TrustSlip verification pages
- public community verification pages
- public shop links
- vault/private access links
- community confirmation public outcome routes
- printed/copied evidence surfaces and evidence pack direction

Purpose:

Allow trust to travel between communities, markets, cities, countries, schools,
churches, clubs, town unions, associations, and diaspora networks.

Question:

Can trust move?

GSN answer:

Yes, but the mobility story must be visible from onboarding, public pages,
community adoption materials, and the playbook.

Devil's advocate:

Trust mobility is the most powerful idea and the easiest to under-explain. If
the user sees only internal screens, they will not understand why public evidence,
community verification, shop links, and TrustSlip matter.

## 4. Current MVP Versus Strategic Vision

| Surface | Current MVP route or asset | Strongest trust layer | Current status | Main gap | Minimum adjustment |
| --- | --- | --- | --- | --- | --- |
| Dashboard | `/app/dashboard` | Reflection across layers | Built and protected in parts | Can be mistaken for the product center | Present it as a trust signal reflector and launcher, not the whole system |
| Community Home | `/app/community` | Community trust and cross-community index | Built | Needs sharper "organized community trust" framing | Make community identity, member identity, community list, and trust summary feel institutional |
| Marketplace | `/app/marketplace` | Community operating and trusted commerce | Built | Can read as commerce first, trust second | Lead with selected community trust context, then shop, demand, support, and links |
| Trust Passport | `/app/trust` | Personal trust | Built | Strong, but must stay connected to community evidence | Keep explaining it as the full trust story, not a badge |
| TrustSlip | `/app/trust-slip`, `/t/:code` | Trust mobility | Built | Strong, but risk of overclaiming | Keep limitation language and consent/currentness visible |
| Community verification | `/verify/community/:communityKey` | Community trust | Present | Not yet the strongest public face | Upgrade into a community public evidence profile over time |
| Shop/Public Shop | `/app/shop-control`, `/shop/:gmfnId` | Trusted commerce | Built | Must show commerce plus trust package | Make shop identity, community identity, and evidence links feel connected |
| Finance | `/app/finance` and payment routes | Community operating and personal evidence | Built | May look like money management only | Explain money behaviour as evidence, not wealth scoring |
| Loans and Support | `/app/loans` and loan routes | Community operating and personal evidence | Built | Can look like a lending product | Frame as support lifecycle and accountability evidence |
| ROSCA/contributions | current operational controls | Community operating | Partly surfaced | Not always positioned as trust evidence | Treat contribution discipline as one evidence stream, not the whole product |
| Demand Box | `/app/demand-box` | Trusted commerce and operating | Built | Can look like a request board only | Position as trusted community demand and opportunity signal |
| Admin/Command Center | `/app/command-center/*` | Governance and oversight | Built and role-gated | Must not mix with member UX | Keep as institutional oversight, not ordinary member activity |

## 5. Gap Analysis

What must be added?

Very little at the core logic level.

What must be improved?

- community public profile
- community verification surface
- community trust summary
- community health framing
- marketplace trust-first presentation
- community-first onboarding
- trust mobility narrative
- adoption material for specific community categories
- evidence/link packages that look like official GSN surfaces, not raw URLs

What is already strong?

- personal trust logic
- Trust Passport and TrustSlip separation
- public TrustSlip verification
- community membership and join logic
- marketplace/shop/spotlight/demand layers
- finance, support, repayment, and guarantor surfaces
- institutional evidence direction

What is strategically weak?

The MVP has many correct pieces, but the user or partner may not immediately
see the system as one trust infrastructure. The features are ahead of the
story.

## 6. Minimum Adjustment Plan

### Adjustment 1 - One sentence everywhere strategic

Use this as the top-level internal positioning:

**GSN is trust infrastructure for organized communities.**

Use this as the plain-language public positioning:

**GSN helps organized communities make trust visible, portable, verifiable, and
usable.**

Do not overuse it inside every app card. Use it in onboarding, decks, community
adoption material, public evidence pages, and investor/customer discovery
documents.

### Adjustment 2 - Reclassify features as evidence layers

Do not present ROSCA, finance, shop, marketplace, support, demand, verification,
and TrustSlip as separate inventions.

Present them as evidence streams:

- membership evidence
- contribution evidence
- support evidence
- repayment evidence
- shop and trade evidence
- community confirmation evidence
- sponsor and governance evidence
- identity and verification evidence

### Adjustment 3 - Strengthen community public evidence

Community public evidence should eventually answer:

- What is this community?
- What type of organized community is it?
- What is its GSN community ID?
- Is it active?
- Is it verified?
- Is it responsive?
- What can it verify?
- What services or support functions does it organize?
- What should an outsider do next?

Minimum no-logic version:

Improve copy, labels, and layout around the existing community verification
surface.

Future logic version:

Add community type, public health metrics, public service categories, and
controlled contact/request flows only after data ownership and privacy are
clear.

CAC/company-registration rule:

Record CAC or external company-registration references as supporting evidence
when a community supplies them. Do not sell or describe CAC as GSN verification.
CAC does not prove current community consent, current leadership, shop
ownership, line membership, or member belonging. GSN evidence must remain anchored
in Community ID, parent-domain acknowledgement, member credentials, witness
evidence, renewal, disputes, and audit trail.

### Adjustment 4 - Make Marketplace trust-first

Marketplace should not open as "here are products" alone.

It should open as:

**This is one trusted community in action. Here are the shops, requests,
support paths, links, and evidence tools available inside this community.**

Minimum no-logic version:

Adjust page hierarchy and copy where safe, respecting frozen button and mobile
contracts.

### Adjustment 5 - Make onboarding community-first

The product should imply:

- existing member signs in
- founder creates a community
- member joins an existing community
- community adopts GSN

The strongest growth path is not random signups. It is organized groups
bringing members into the system.

### Adjustment 6 - Keep guardrails visible

Trust infrastructure must not become trust theatre.

Always separate:

- confirmed capability
- pilot evidence
- measured outcome
- product vision
- future inference

Keep saying:

- TrustSlip is not a bank guarantee
- TrustSlip is not automatic approval
- community evidence must respect privacy and consent
- negative or weak evidence needs repair paths
- public evidence must not expose private records by default

## 7. Target Market Playbooks

### Tier 1 - Apprenticeship Networks

Existing trust structure:

- master/apprentice identity
- years of service
- reputation
- settlement history
- introductions
- market access

Pitch:

**Your apprenticeship network already creates trust. GSN helps that trust
travel beyond the people who personally know the apprentice.**

Evidence path:

- member identity
- community verification
- Trust Passport
- TrustSlip
- shop/public commerce
- support or settlement evidence where appropriate

### Tier 1 - Market Associations

Existing trust structure:

- trader identity
- stall or shop reputation
- introductions
- goods on credit
- market leadership
- disputes and settlement

Pitch:

**Your market already runs on trust. GSN helps buyers, sellers, and market
leaders verify that trust before money or goods move.**

Evidence path:

- community public profile
- shop public face
- TrustSlip
- merchant verification
- demand and spotlight
- support and repayment history

### Tier 1 - Cooperatives

Existing trust structure:

- membership
- dues
- savings
- loans
- repayments
- guarantors
- welfare

Pitch:

**Your cooperative already records money behaviour. GSN turns that behaviour
into clearer trust evidence for members and the institution.**

Evidence path:

- finance
- loans and support
- guarantor surfaces
- Trust Passport
- TrustSlip
- community health summary

### Tier 2 - Churches

Existing trust structure:

- belonging
- welfare
- accountability
- leadership
- introductions
- support
- reputation

Current church reality:

- a member becomes sick and people contribute
- a student needs support and people contribute
- someone needs accommodation and people ask around
- someone needs work and people ask around
- someone wants to buy something and people ask around

Everything runs on trust, but much of it is informal.

Pitch:

**What if your church trust network worked even when members were not
physically together?**

What to show:

- member identity
- community verification
- welfare or support requests
- contribution records
- trusted marketplace
- Trust Passport
- TrustSlip for outside decisions

Devil's advocate:

Church adoption requires sensitivity. The pitch must not sound like monetizing
church life or turning pastors into risk officers. Lead with welfare,
belonging, member care, and responsible support records.

### Tier 2 - Town Unions

Existing trust structure:

- dues
- meetings
- welfare
- scholarships
- community projects
- leadership
- diaspora support

Pitch:

**Keep one trusted record for the whole community.**

What to show:

- community public face
- member verification
- project/support records
- dues or contribution discipline where allowed
- public community verification
- controlled contact and confirmation paths

Devil's advocate:

Town unions can be politically sensitive. Community health must not become a
public shame board. Public evidence should show institutional readiness without
exposing private disputes or member-level finance.

### Tier 2 - Social Clubs

Existing trust structure:

- membership
- status
- introductions
- participation
- dues
- support
- professional access

Pitch:

**Your club already has trust. GSN helps organize it.**

What to show:

- identity
- membership
- participation evidence
- controlled introductions
- community verification
- TrustSlip or Trust Passport where a decision needs evidence

### Tier 3 - Universities

Existing trust structure:

- societies
- student identity
- peer support
- alumni pathway
- references
- volunteering
- marketplace/services

Pitch:

**Build a reputation that grows with you.**

What to show:

- student community membership
- contribution or service evidence
- Trust Passport
- TrustSlip
- public verification
- post-graduation trust mobility

Use case:

The Amara story remains strong: Lagos trust becomes portable evidence in
Aberdeen.

### Tier 3 - Diaspora Associations

Existing trust structure:

- hometown identity
- mutual aid
- introductions
- remittances and projects
- newcomer support
- business referrals

Pitch:

**Let trust travel between home and abroad without depending only on memory,
WhatsApp threads, or one person vouching manually.**

What to show:

- member identity
- community verification
- controlled support records
- public shop face
- TrustSlip
- community confirmation

## 8. Outside View

Someone who has never heard of the church, market, club, town union, society,
or cooperative should not see internal details first.

They should see a controlled community public face:

- community name
- community ID
- community type
- location or operating area at an appropriate privacy level
- verification status
- active or inactive status
- responsiveness
- years active where available
- services or functions offered
- public statistics where safe
- verification request option
- TrustSlip request or member confirmation path
- controlled contact option

Potential public statistics:

- members
- trust events
- years active
- completed verifications
- confirmation response status

Do not expose:

- private member finance records
- exact public location when unsafe
- private disputes
- raw admin data
- user-to-user payment controls
- hidden community tools

## 9. Page-By-Page Scoring Method

Use this score when reviewing each page:

- 0 = not present
- 1 = mentioned only
- 2 = present but weak or confusing
- 3 = usable but under-positioned
- 4 = strong and mostly aligned
- 5 = central evidence surface

| Page or domain | Personal trust | Community trust | Community operating | Trusted commerce | Trust mobility | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Dashboard | 3 | 2 | 2 | 3 | 2 | Good reflector, not the main thesis surface |
| Community Home | 3 | 4 | 3 | 2 | 3 | Strategic bridge, needs stronger community institution framing |
| Marketplace | 2 | 3 | 5 | 4 | 3 | Operationally strong, needs trust-first presentation |
| Trust Passport | 5 | 3 | 2 | 2 | 4 | Strong personal trust story |
| TrustSlip | 4 | 3 | 1 | 3 | 5 | Strong mobility evidence if limitations stay clear |
| Public community verification | 2 | 4 | 1 | 2 | 4 | Important but should become stronger public community face |
| Shop/Public Shop | 3 | 3 | 2 | 5 | 4 | Strong commerce surface if evidence package is visible |
| Finance | 4 | 3 | 5 | 2 | 3 | Money behaviour evidence room |
| Loans and Support | 4 | 3 | 5 | 1 | 2 | Support/accountability layer, not merely lending |
| Demand Box | 2 | 3 | 4 | 4 | 2 | Good opportunity signal, should be tied to trusted community demand |
| Admin/Command Center | 2 | 4 | 4 | 1 | 2 | Oversight layer, not ordinary member UX |

The first review question for every screen:

**Does this screen help a person, community, or outsider understand trust
better?**

The second review question:

**If yes, is the trust personal, community-level, operational, commercial, or
portable?**

The third review question:

**Is this already built and just hidden by presentation?**

## 10. Book Structure

Working title:

**GSN Market Entry Blueprint: Trust Infrastructure For Organized Communities**

### Chapter 1 - The Problem

Trust already exists, but it is trapped:

- in memory
- in one church
- in one market
- in one town union
- in one campus society
- in one family network
- in one WhatsApp group
- in one person who can vouch manually

When people move, trade, borrow, support, study, or join new communities, they
often start from zero.

### Chapter 2 - The Core Insight

GSN does not create communities from nothing.

GSN digitizes and strengthens communities that already organize trust.

### Chapter 3 - The Five Trust Layers

Explain:

- personal trust
- community trust
- community operating
- trusted commerce
- trust mobility

### Chapter 4 - What The MVP Already Has

Map current routes and assets:

- Dashboard
- Community Home
- Marketplace
- Shop
- Finance
- Loans and Support
- Trust Passport
- TrustSlip
- public verification
- community confirmation
- admin/oversight

### Chapter 5 - What Must Change

The main change is presentation:

- stronger community public face
- clearer trust-first marketplace
- community-first onboarding
- evidence packages that look official
- adoption materials per community type

### Chapter 6 - Market Associations

Focus:

- trader credibility
- shop identity
- goods on credit
- dispute memory
- market leadership
- TrustSlip before goods move

### Chapter 7 - Apprenticeship Networks

Focus:

- apprentice history
- master confirmation
- settlement pathway
- market entry
- portable credibility

### Chapter 8 - Cooperatives

Focus:

- membership
- savings/contributions
- support
- loans
- repayment
- guarantor behaviour

### Chapter 9 - Churches

Focus:

- welfare
- member care
- introductions
- accountability
- support beyond physical attendance

### Chapter 10 - Town Unions

Focus:

- dues
- projects
- scholarships
- welfare
- diaspora coordination
- community public record

### Chapter 11 - Social Clubs

Focus:

- participation
- credibility
- introductions
- coordination
- trusted member support

### Chapter 12 - Universities

Focus:

- student trust
- society membership
- volunteering
- campus services
- post-graduation trust mobility

### Chapter 13 - Diaspora Associations

Focus:

- home/abroad trust bridge
- newcomer support
- remittance/project accountability
- business introductions

### Chapter 14 - Pilot Strategy

Pilot one community type at a time.

Do not test "all of GSN." Test one trust decision:

- Would you verify this member?
- Would you let this person join?
- Would you buy from this shop?
- Would you support this request?
- Would you introduce this person?
- Would you accept this community as real?

### Chapter 15 - Revenue Strategy

Possible revenue lanes to test later:

- community subscription
- verification/evidence packages
- merchant verification
- spotlight and trusted commerce exposure
- vault/private access
- institutional reporting
- cooperative/community operating tools

Guardrail:

Do not build revenue claims before adoption evidence. Pricing must follow the
trust decision people actually value.

### Chapter 16 - Investor Narrative

Investor version:

GSN is building trust infrastructure for organized communities. It converts
membership, contribution, support, repayment, shop activity, and community
confirmation into consented, portable, verifiable evidence.

The wedge is not a generic marketplace or lending app.

The wedge is the community trust graph that already exists offline.

### Chapter 17 - Evidence Needed

The next evidence is not more features.

The next evidence is whether real organized communities understand and value:

- community public identity
- member verification
- portable TrustSlip
- trust-backed commerce
- support accountability
- community health summaries

### Chapter 18 - Guardrails

GSN must not:

- claim a trust score is a bank guarantee
- expose private member records publicly
- present CAC/company-registration records as GSN verification by themselves
- create unfair community profiling
- compare community types without enough data
- imply automatic lending or automatic debit
- make negative evidence permanent without repair paths
- let public evidence become raw surveillance

## 11. Immediate Working Checklist

Use this before any product or UX change:

- Reframe the target surface against the five layers.
- Confirm which route/page owns it.
- Decide whether the gap is logic, data, copy, layout, or evidence packaging.
- Prefer copy/layout/evidence packaging before new backend logic.
- Keep Dashboard as a reflector, not the command center.
- Keep Marketplace as one community's operating nucleus.
- Keep Trust Passport as the full personal trust story.
- Keep TrustSlip as portable current evidence.
- Keep Community Verification as the public community institution evidence path.
- Keep limitations and privacy visible.

## 12. Minimum MVP Adjustment Backlog

### No-code or docs-first

1. Use this document as the strategic source for market-entry conversations.
2. Build a short pitch deck from Chapters 1 to 5 and one target-market chapter.
3. Create one-page adoption briefs for churches, market associations,
   cooperatives, town unions, and universities.
4. Add this five-layer scoring method to future route/page audits.

### Low-risk product copy and presentation

1. Review onboarding copy for community adoption language.
2. Review public community verification copy for community institution evidence.
3. Review Marketplace hero and first action area for trust-first framing.
4. Review Public Shop evidence package so shop, member, community, and TrustSlip
   feel connected.
5. Review TrustSlip and Trust Passport language only to preserve clarity, not
   to inflate claims.

### Higher-risk or future data work

1. Community type classification.
2. Community health metrics.
3. Public community profile fields.
4. Controlled contact/request flows for outside verification.
5. Institutional reporting by community type.

Do not start these higher-risk items without privacy, permission, and data
ownership review.

## 13. Final Verdict

The current MVP does not need major new logic to support the strategic reframe.

It needs a better presentation spine.

The pieces already point toward trust infrastructure:

- one member identity
- one community identity
- membership and invite governance
- Trust Passport
- TrustSlip
- public verification
- marketplace/shop/demand/spotlight
- finance/support/repayment evidence
- admin and institutional evidence surfaces

The next move is to make the system understandable as one thing:

**organized community trust made visible, portable, verifiable, and usable.**
