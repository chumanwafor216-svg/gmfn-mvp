# GSN External App Free-Ride Playbook - 2026-09-09

## Purpose

Use connected external apps only when they move GSN closer to production quality without creating hidden spend, false confidence, or repeated connector churn.

This playbook covers the current free-first use of Figma, Canva, Gamma, and similar presentation/polish tools.

## Current Rule

Use free versions and existing credits only until GSN is producing cashflow.

Do not start or keep recurring paid subscriptions for optional creative, design, presentation, or AI-media tools unless the product owner explicitly approves a revenue-backed exception.

Do not cancel or disturb infrastructure needed to keep GSN online, secure, reachable, or auditable: hosting, DNS, database, deploy, storage, email, security, and uptime services are not optional polish tools.

## Figma

Best use now:

- production-polish boards;
- mobile first-viewport review;
- Trust Document Language review;
- route-by-route visual decision records;
- handoff boards for developers, designers, partners, and reviewers.

Current artifacts:

- `GSN Frontend Polish Board - 2026-09-09`: `https://www.figma.com/design/AqjzJaSBVqa865wAidAGp1`.
- `GSN Deployed Free Ride Snapshot / 2026-09-09`, node `6:2`, complete and verified.
- `GSN Public Verification Speed Board / 2026-09-09`, node `12:2`, partial: speed contract and mobile state frames created; blocker/checklist sections still unfinished because the Figma connector began returning `INVALID_ARGUMENT`.

Use Figma again when:

- the connector accepts a tiny read-only health check;
- we need a visual board before code changes;
- we need to compare public verification, TrustSlip, Trust Passport, Shop Control, Finance, Marketplace, or entry screens against the GSN mobile/polish protocols.

Avoid Figma when:

- the connector is returning `INVALID_ARGUMENT` for small calls;
- the work needs live phone performance proof;
- the work needs backend logs, billing records, or production secrets.

Devil truth: Figma improves clarity and presentation memory. It does not deploy code, prove real mobile speed, or enforce backend trust rules.

## Canva

Best use now:

- polish an existing Canva flyer, social post, handout, pitch sheet, or invitation;
- resize existing GSN collateral for social channels;
- translate an existing design;
- run brand/design feedback against a real Canva asset.

Current blocker:

- owned/shared Canva search for `GSN` returned no designs;
- owned/shared Canva search for `Global Support Network` returned no designs;
- autofill-capable brand template search returned no templates;
- earlier blank-generation attempts failed with `INVALID_ARGUMENT`.

Use Canva again when:

- the owner supplies a Canva design URL/ID;
- a real GSN Canva design is manually created first;
- a usable brand template appears;
- a specific resize, translation, or edit is needed.

Avoid Canva when:

- the task is blank generation from chat only;
- there is no existing design/template;
- the result would duplicate what Figma or repo docs can already do for free.

Devil truth: Canva is installed, but connected is not the same as useful. Right now it needs a real design source before it can help GSN.

## Gamma

Best use now:

- create serious decks only when there is a real audience: partner, investor, council, church, market association, grant reviewer, or billing dispute;
- read existing deck structure;
- inspect analytics and comments without spending new generation credits.

Current artifact:

- `GSN Frontend Production Polish Readout`: `https://gamma.app/docs/9cojaodm5186jct`.
- Analytics on 2026-09-09: 9 cards, 0 total views, 0 unique viewers, 0 unique editors, 0 engagement on every card.

Use Gamma again when:

- someone must receive a polished narrative;
- we need a deck for a meeting or formal explanation;
- analytics or comments show where the message is failing.

Avoid Gamma when:

- there is no recipient;
- the deck would sit unseen;
- a Figma board or markdown brief is enough;
- the ask would spend credits for internal thinking only.

Devil truth: Gamma is useful for persuasion and storytelling, but it consumes credits when generating. No more generation should happen without a real destination.

## What Counts As A Worthwhile App Use

A connector call is worthwhile only if at least one is true:

- it creates a durable artifact the team will actually use;
- it checks real external engagement or comments;
- it edits a real existing design;
- it converts verified product facts into a partner/customer-facing format;
- it reduces future confusion or repeated work.

A connector call is not worthwhile if it only:

- proves the app is installed;
- retries a known failing generation path;
- creates another unused deck;
- gives a prettier story than the production system can support;
- hides unresolved billing, phone QA, backend, or secret-configuration risk.

## Next Best App Moves

1. Wait for Figma recovery, then finish node `12:2` with the blocker and reviewer-checklist sections.
2. Ask the owner to create or provide one Canva GSN source design, then use Canva for brand review, resize, translate, and public handout polish.
3. Share the Gamma deck with one real reviewer before creating another deck; use analytics and comments to improve the message.
4. Use repo-local audits and live phone tests for actual speed proof; do not let presentation tools substitute for production verification.

## Production Boundary

External apps can make GSN clearer, more credible, and easier to explain.

They cannot replace:

- frontend route implementation;
- backend route correctness;
- API/database performance work;
- Render billing clarification;
- production Web Push environment setup;
- mobile browser/device QA;
- real customer discovery feedback;
- verified revenue.