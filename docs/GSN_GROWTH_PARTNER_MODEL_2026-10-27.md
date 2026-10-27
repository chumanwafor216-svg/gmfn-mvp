# GSN Growth Partner and Affiliate Pilot Model - 2026-10-27

Status: strategy and implementation-readiness record. This does not activate a
commission, promise income, create payout entitlement, authorise advertising,
or change the Network Growth Attribution contract.

## Executive decision

GSN Independent Entrepreneurs cannot all be called affiliate marketers merely
because they own a shop, sell through GSN, or invite someone.

| Role | Job | GSN financial relationship |
|---|---|---|
| Independent Entrepreneur | Runs their own shop, service or trade | Earns from their own activity; no automatic GSN commission |
| GSN Growth Partner | Introduces and may help activate a suitable person or community | Attribution only unless a separate approved reward applies |
| GSN Affiliate Partner | Publishes disclosed performance advertising through an approved trackable source | May earn a defined reward from one eligible, collected and non-refunded GSN platform sale |

`Affiliate marketing` is an activity. `Affiliate Partner` applies only when a
real performance-advertising and commission contract exists. Use `GSN Growth
Partner` as the umbrella. This also avoids confusion with Community Domain
`affiliate`, which is an institutional relationship.

## Unabated truth

- A claimed or participant-confirmed introduction does not prove causation or
  create commission entitlement.
- Membership, shops, Spotlight, reactions, TrustSlips and trade records are not
  GSN revenue.
- A member-to-member sale is merchant revenue, not automatically platform
  revenue.
- No rate is responsible until module economics prove collected platform
  revenue, delivery cost, refunds, tax and payment fees.
- `Independent` does not decide employment or tax status; the real working
  relationship does.
- Pay only for eligible product value, never for recruiting another recruiter
  or building a downline.

## Confirmed existing engine

The mounted `/network-growth/attributions` routes already block self-claims,
verify exact invite/QR evidence, distinguish verified evidence from claimant
statements, let only the participant accept or challenge, preserve one accepted
introducer, supersede competing claims, bound pending claims, and derive
participant-private activation evidence from existing GSN records.

They explicitly create no reward, commission, payout, residual, employment,
territory, payment, publishing authority or advertiser authority. No frontend
Growth Partner surface currently connects them. There is also no approved
partner status, signed social-source contract, eligible-sale link, reward
ledger, reversal handling, affiliate payout approval or partner statement.
The existing Payout Details page belongs to Money Out and is not an affiliate
payout engine.

## Reuse and gap map

| Requirement | Reusable capability | Missing contract |
|---|---|---|
| Introducer identity | GSN identity | Approved partner enrolment/status |
| Introduction | Network Growth Attribution | Signed source for non-invite links |
| Consent | Participant accept/challenge | Participant-facing UI |
| Duplicate resolution | One accepted attribution | Exceptional fraud appeal |
| Activation | Bounded existing evidence | Cohort/retention definition |
| Paid value | Module payment/entitlement | Eligible product and attribution-to-sale link |
| Commission | None | Versioned offer and append-only ledger |
| Refunds | Module states may exist | Reward reversal contract |
| Payout | Another-purpose payout details | Affiliate approval, threshold and statement |
| Advertising | Social sharing | Disclosure and enforcement |

## Recommended first pilot

Use an invite-only, single-tier pilot. An approved Growth Partner accepts
written terms, chooses whether and when to share, may work for others, has no
guaranteed leads, territory or income, and must disclose commission. Avoiding
fixed hours, close supervision and exclusivity reduces misclassification risk
but does not determine legal status.

Prefer an exact invite or QR because the backend verifies it. A social link
must use a signed, expiring GSN source that cannot be reassigned later. Do not
collect a friend's contact details and send automated marketing. The partner
shares a public link through their own channel; the recipient chooses whether
to enter and confirm the relationship.

```text
Approved partner
  -> attributable invite / QR / signed source
  -> participant enters and confirms the introducer
  -> one named eligible GSN platform purchase
  -> collected payment and activated entitlement
  -> refund / chargeback cooling period
  -> fraud and duplicate review
  -> payable reward
```

Do not pay for clicks, registrations, unconfirmed claims, ordinary
membership, free activity, member-to-member trade or recruiting partners.

### Product, window and reward

No product or reward amount is approved. Paid Spotlight is a plausible first
candidate, but only after revenue-per-module work proves net platform revenue,
refund handling and delivery cost.

Recommended pilot assumptions for review:

- attributable entry within 30 days of source issue;
- participant confirmation before purchase;
- first qualifying purchase within 60 days after confirmation;
- participant choice resolves competing introductions;
- later clicks never overwrite an accepted introducer;
- one first-sale reward per participant.

These windows are hypotheses, not conversion evidence. Once economics exist,
prefer one fixed, capped first-sale reward over recurring commission. Until
then the programme is `not launched`, not `zero reward` or `amount confirmed
after joining`.

## Required reward ledger

Do not turn the attribution row into a financial ledger.

```text
observed -> participant_confirmed -> qualifying_sale_pending -> cooling
  -> earned -> payable -> paid

ineligible | disputed | reversed | void
```

Every transition needs actor, time, reason, payment/entitlement reference,
offer version and prior state. Refunds before payment void rewards. Later
reversals create offsets and never erase the original accounting trail.

## Minimum controls

- Keep self-attribution prevention and one introducer/first reward per person.
- Treat duplicate identity, household, device, payment and payout patterns as
  review signals, not automatic proof.
- Prevent self-approval and delay earning through the refund window.
- Cap partners, claims, eligible sales and total pilot liability.
- Keep manual finance approval and an appeal route.
- Expose to partners only bounded statuses such as awaiting decision,
  confirmed, no qualifying paid value, under review, earned, paid or not
  eligible.
- Never expose participant communities, activity, TrustSlip, trade, payment,
  contact or private profile detail beyond what is necessary and expected.

## Advertising, privacy, employment and tax

ASA treats affiliate links as performance advertising and recommends a clear
`Ad` label; `Aff` alone is unlikely to be understood. CMA guidance requires
business connections and incentives behind endorsements to be clear. Approved
copy should begin visibly, for example:

```text
Ad - I may receive a commission if you buy an eligible GSN service through
this link.
```

ICO guidance says encouraging refer-a-friend electronic messages can mean the
organisation instigates them, even without an incentive. Keep the first model
recipient-led, separate marketing consent from attribution, explain purpose
and retention, and assess lawful bases for attribution, reward accounting,
fraud review and marketing separately.

UK guidance says employment status follows the real relationship, not the
label. Run the engagement through HMRC CEST and obtain employment-law advice.
HMRC also says online service/content/promotion income may need reporting and
the GBP 1,000 trading allowance considers total trading income. GSN should
issue statements and never promise tax-free or self-employed status.

## Implementation gate

Do not build payout code until GSN approves: eligible product; payer, price,
tax and platform-revenue boundary; affordable reward; refund/chargeback rules;
signed source and windows; agreement and working-practice assessment;
disclosure enforcement; privacy basis and retention; proportionate identity/
KYC; finance owner and reconciliation; fraud appeal; and pilot stop-loss.

The smallest later build is an admin-controlled pilot: approved partner status
and terms, signed sources, participant confirmation UI, one purchase link,
append-only reward ledger, minimal partner status, manual finance approval,
payment statement and disclosure/link suspension controls. No downline, team
commission, click/signup reward, recurring commission, automatic external
message or broad participant analytics belongs in version one.

## Current UK reference points

- [ASA/CAP affiliate disclosure](https://www.asa.org.uk/news/get-yourself-affiliated-with-the-rules-on-affiliate-marketing.html)
- [CMA endorsement disclosure](https://www.gov.uk/government/publications/social-media-endorsements-guidance-for-content-creators)
- [ICO refer-a-friend and PECR](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-electronic-mail/how-do-we-comply-with-the-pecr-electronic-mail-marketing-rules/)
- [ICO direct-marketing planning](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/plan-direct-marketing/)
- [GOV.UK self-employed status](https://www.gov.uk/employment-status/selfemployed-contractor)
- [HMRC CEST](https://www.gov.uk/guidance/check-employment-status-for-tax)
- [HMRC online-platform income](https://www.gov.uk/guidance/check-if-you-need-to-tell-hmrc-about-your-income-from-online-platforms)
- [DMCC Act 2024 Schedule 20](https://www.legislation.gov.uk/ukpga/2024/13/schedules/enacted)

This is product/system design, not legal, tax or accounting advice. Relevant UK
specialists should review final terms and working practices before launch or
money movement.
