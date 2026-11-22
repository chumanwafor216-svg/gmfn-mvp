# GSN Demand-to-Outcome Journey Audit

**Date:** 2026-11-22  
**Status:** Founder-direction audit; no product behaviour changed  
**Scope:** Demand Box, Spotlight, Public Shop, Marketplace Trade Evidence and the operator campaign surface

## 1. Founder direction being tested

GSN should not try to replace WhatsApp, Facebook or telephone calls.

GSN should make one practical journey easier:

```text
Need
-> the right trusted people see it
-> somebody responds
-> suitable supply is found
-> the parties act using GSN, WhatsApp, a call or an in-person exchange
-> the outcome is confirmed
-> GSN preserves truthful evidence of what happened
```

The ordinary member should see only the next useful step. A simple response should not require several pages, several disclosures or knowledge of GSN's internal engines.

## 2. Unabated conclusion

GSN already contains most of the required engines, but the current member journey does not yet present them as one simple commercial bundle.

The primary problem is now **surface orchestration**, not missing machinery.

Confirmed existing capabilities include:

- community-visible and one-person Demand Box requests;
- text and protected voice requests;
- private text and voice responses;
- direct WhatsApp and telephone handoffs;
- same-community demand-to-supply matching;
- one-hop governed search where permitted;
- Spotlight discovery and advertiser contact;
- Public Shop products and seller contact;
- prefilled Demand Box-to-Trade Evidence handoff;
- release, receipt, issue and outcome evidence;
- lifecycle history and Trust Event foundations.

However, an ordinary responder can still face this sequence:

```text
Find the correct queue
-> View request
-> Listen & reply
-> use the reply composer
-> Send private reply
```

A requester following a suggested supply can face:

```text
Open Yours
-> View request
-> View matches
-> Open supply
-> find/contact the seller
-> later locate Trade Evidence
```

These are internally valid steps, but they are too exposed for the founder's simplicity target.

## 3. The practical GSN bundle

The four existing surfaces have different jobs and should not be merged into one giant page.

| Surface | One human job | What it must not become |
| --- | --- | --- |
| Demand Box | State a need and receive a direct response | General social chat or an admin workbench |
| Spotlight | Put relevant supply or opportunity in front of people | Proof of interest, sale or delivery |
| Public Shop | Inspect an offer and contact the seller | A cluttered owner-control panel |
| Trade Evidence | Record agreement, release, receipt and outcome | A payment processor or automatic trust verdict |

The Command Centre campaign publisher is an operator distribution tool. It supports Spotlight supply but is not part of the ordinary buyer's or responder's task path.

## 4. The small gap GSN can own

Voice notes, chat, calls, adverts and product pages are not unique by themselves.

The defensible GSN gap is:

> **GSN turns a need raised inside a real community relationship into a targeted, answerable and evidence-bearing outcome, while allowing WhatsApp, phone calls and in-person activity to remain familiar action channels.**

Facebook is strong at broad discovery and attention. WhatsApp is strong at conversation. Telephone calls are strong at immediate human contact. GSN's stronger role is to connect:

```text
community context
+ structured need
+ relevant supply
+ controlled response
+ outcome confirmation
+ portable evidence
```

GSN should not claim that it completes payment, delivery or a sale merely because a product was opened or a seller was contacted.

## 5. Current audit matrix

| Journey | Existing truth | Current friction | Target presentation |
| --- | --- | --- | --- |
| Post a need | Create form already supports category, voice, heading, area, audience and optional detail | `Post a need` and `Ask community` compete; community switching can leave the task; optional machinery is still visible through several concepts | One `Post a need` entry. Community is already selected. Required fields first; all specialist options remain closed |
| Find a need meant for me | Queues include All, For you, Yours, Tagged and direct `demand_id` support | Default phone queue is `All`; a relevant tagged/private request may not be the first card | Route intent chooses the lane. Direct notification opens the exact demand. Relevant targeted work opens `For you`; owners returning to their request open `Yours` |
| Understand the request | Open card contains title, sender, area, date, voice, details and privacy | Details and the original voice sit behind additional controls | Opening the request immediately shows the actual message or voice player, sender, community and audience boundary |
| Respond | Existing private text/voice response engine is strong and privacy-scoped | The reply composer is behind `Listen & reply`; this adds an avoidable navigation decision | Open request -> inline reply composer -> Send. Playing voice is content interaction, not another page |
| Continue discussion | Existing familiar private exchange supports separate responder conversations | Owner must open the reply disclosure and may need to choose a responder before seeing the exchange | A demand with a reply opens to the latest relevant exchange. Other responders remain a compact selector |
| Find supply | Existing demand-supply matching returns products, shops and match reasons | Possible matches are hidden behind the opened request and another `View matches` control | Show the strongest current match as `Possible answer` on the request. Keep additional matches collapsed |
| Contact seller | Public Shop and Spotlight already support WhatsApp/call handoff | Contact is separated from demand context and the Shop has many action families | Carry the demand reference into the product/shop. Lead with one `Ask seller` action; keep call/WhatsApp as compact choices |
| Record the deal | Existing prefilled Protected Trade handoff can create evidence | Trade Evidence is a deeper Marketplace lane and feels detached from the originating need | After a real agreement, offer `Record this agreement`; open the existing prefilled Trade Evidence task, not a new transaction engine |
| Confirm outcome | Demand supports fulfilled/cancelled; Trade Evidence supports release, received, not received and issue states | Demand close actions and commercial outcome evidence are separate and difficult to discover | Ask one plain question: `What happened?` Map simple demand closure to existing statuses and commercial outcomes to existing Trade Evidence events |
| Reuse evidence | Existing request history, trade events and Trust Event foundations preserve provenance | The member experiences separate records rather than one understandable journey | Show one short journey summary linking the original need, response, selected supply and confirmed outcome |

## 6. Two-interaction target

The target is not literally two taps for typing, recording or choosing a product. It is no more than two **navigation decisions** before the member can perform the task.

### Responder

```text
1. Open the exact need
2. Send text or voice response
```

The opened need should already contain the message, voice player and composer.

### Requester reviewing a reply

```text
1. Open My Need
2. Reply, contact or choose the suggested supply
```

### Buyer from Spotlight or Shop

```text
1. Open the advertised product
2. Ask seller / WhatsApp / Call
```

After the parties actually agree, `Record this agreement` may open the existing evidence task. That is a new stage of the real-world transaction, not another step required merely to ask a question.

## 7. Required route intelligence

The app does not need a new AI engine for this first correction. It needs deterministic context intelligence:

1. A direct `demand_id` opens that exact demand, not a general queue.
2. A tagged or protected recipient opens the responder state and sees the inline reply composer.
3. The request owner opens the owner state and sees current replies first.
4. A demand with a current supply match shows the strongest match without another discovery step.
5. A product opened from a demand retains the demand reference and offers the existing evidence handoff after agreement.
6. A Spotlight product opens the exact product/shop contact path, not a general Marketplace landing page.
7. Technical routing, relay, evidence and privacy controls remain available but do not lead the ordinary task.

This is presentation and state orchestration over existing authorities. It must not weaken permissions or expose private responses.

## 8. What should be removed from the first task surface

The following should not disappear from the system, but should stop competing with the immediate human task:

- multiple queue/filter concepts before a targeted recipient can respond;
- a separate `Listen & reply` disclosure after a demand has already been opened;
- request technical metadata before the message and response action;
- privacy and terms as a peer primary tab;
- match explanations before the strongest possible supply result;
- lifecycle buttons occupying equal prominence before any response exists;
- owner, verification, Vault, promotion and analytics actions on the ordinary buyer's first Shop view;
- evidence administration before a buyer and seller have actually agreed.

## 9. Preserve these boundaries

- Private one-person requests remain private to the requester and matched member.
- Community-visible requests do not expose private reply threads to other members.
- Voice remains protected and authenticated.
- WhatsApp and calls remain handoffs; GSN does not claim to read or control what happens there.
- Product open, contact tap and Spotlight impression are attention evidence, not proof of a sale.
- GSN does not hold customer money or guarantee delivery through the current Marketplace engine.
- Delivery to the home remains a seller/logistics arrangement. GSN can preserve agreement and receipt evidence, but the current code does not provide a complete logistics service.
- TrustSlip remains a presentation of supported evidence, not GSN deciding whether a person is universally trustworthy.

## 10. Recommended implementation order

### Slice A - Respond in place

- Make direct/targeted route intent choose the correct demand automatically.
- On an opened phone demand, render the original voice/message and inline reply composer together.
- Remove the intermediate `Listen & reply` decision on phone while preserving the same response APIs and privacy boundaries.
- Keep technical details and privacy terms behind one secondary disclosure.

### Slice B - Owner continuation

- Open the owner's demand to the latest relevant reply when one exists.
- Surface the strongest supply match as one compact `Possible answer` card.
- Keep `Fulfilled` and `Cancel` secondary until the owner is ready to close the need.

### Slice C - Demand to Shop

- Preserve demand attribution when opening matched supply.
- Give each ordinary product one obvious buyer action: `Ask seller`.
- Keep WhatsApp and Call as the familiar handoff choices.
- Offer the existing prefilled Trade Evidence flow only after a real agreement begins.

### Slice D - Outcome and evidence

- Present one plain `What happened?` decision.
- Reuse existing demand status and Protected Trade event authorities.
- Show a compact linked journey summary; do not create another evidence ledger.

## 11. Acceptance checks

1. A member opening a targeted demand can send a text or voice reply without visiting another page and without opening an additional reply disclosure.
2. A direct notification never lands on an unrelated first queue card.
3. A request owner can see the latest response and answer from the same demand surface.
4. The strongest supply match is visible without a separate match-list decision.
5. Additional matches, advanced filters, relay settings and technical evidence remain available but collapsed.
6. Private reply and voice boundaries remain unchanged.
7. A product or Spotlight open does not create a false sale, payment, delivery or TrustSlip claim.
8. A real agreement can enter the existing Trade Evidence flow with demand and product context already filled.
9. A completed outcome remains traceable to the need, participants and evidence events.
10. The phone route shows one obvious primary action at each stage.

## 12. Measurements for the pilot

GSN should measure whether simplification improves action, not merely page views:

- median navigation decisions from notification to reply composer;
- demand open-to-response rate;
- time to first response;
- response send failures and abandoned recordings;
- demand-to-product open rate;
- product-to-seller-contact rate;
- proportion of demands closed as fulfilled or cancelled;
- proportion of agreed commerce journeys with a recorded release/receipt outcome;
- support requests caused by navigation confusion.

These metrics show usefulness. They do not prove revenue, sales, delivery quality or trustworthiness by themselves.

## 13. Verification evidence used for this audit

Focused repository checks on 2026-11-22:

- `npm.cmd run audit:demand-box-front-package` - passed.
- `npm.cmd run audit:marketplace-front-package` - passed.
- `npm.cmd run audit:shop-gallery-button-inventory` - passed; it reports 41 whole-route Public Shop action-template families.
- `npm.cmd run audit:spotlight-system-feed` - passed.
- `npm.cmd run smoke:demand-box-simple-phone` - passed at 390x844 and 360x780.

The passing checks confirm the current implementation matches its existing contracts. They do not invalidate this audit. Some current complexity, including the closed `Listen & reply` disclosure, is deliberately required by the present Screen Spec and smoke test. Implementing Slice A therefore requires an explicit, scoped founder-approved Screen Spec amendment before changing code.
