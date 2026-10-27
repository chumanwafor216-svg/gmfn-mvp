# Market Wisdom Commerce Signal Map - 2026-10-27

Status: evidence map and smallest-gap proposal; no runtime implementation yet.

## Owner outcome

Use real Shop Analytics, Spotlight, and DemandBox evidence as one input to the
existing Dashboard Market Wisdom engine. Keep Market Wisdom's frozen visual and
interaction model, route deeper work to the owning surface, and never translate
attention into sales, delivery, demand, or meaningful viewing claims.

## Confirmed current system

### Market Wisdom

- Authenticated endpoint: `GET /market-wisdom/recommendation`.
- Server owner: `gmfn_backend/app/services/daily_insight_service.py`.
- The server selects from approved persisted `market_wisdom_entries`, applies a
  seven-day per-user/per-community exposure cooldown, and records shown/opened
  exposure separately.
- The endpoint currently ranks entries from caller-supplied `context` and
  `signals` strings. It does not query Shop Analytics, Spotlight, or DemandBox.
- Dashboard currently supplies unread-notice, pending-review, trust, and
  DemandBox-presence strings. Therefore the current `signal_basis: inferred`
  means contextual matching, not a server-confirmed commerce reading.
- Dashboard already lets DemandBox counts affect the existing `Now` reading,
  but Shop Analytics and Spotlight evidence do not yet reach Market Wisdom.

### Shop Analytics

- Owner-only endpoint:
  `GET /marketplace/analytics/shops/{shop_id}/summary?days=30`.
- Permission: shop owner or platform admin. An arbitrary member cannot read
  another shop's analytics.
- Persisted source: `marketplace_attention_events`, plus current products,
  current Spotlight rows, current open DemandBox requests, followers, and
  protected trade records.
- The existing Opportunity Engine inside this endpoint already combines the
  shop, last-seven-day attention, Spotlight, DemandBox, and protected-trade
  evidence. Market Wisdom must consume a bounded result from this engine rather
  than create a second analytics engine in Dashboard.
- Its decision window is seven days even though the endpoint also returns the
  caller-requested 1-90-day period.
- Visits, product opens, Spotlight impressions, Spotlight shop clicks, and
  contact taps are attention/intent evidence only. They are not buyers, sales,
  payments, delivery, verification, or trust scores.

### Spotlight

- `spotlight_impression` is persisted only after the Public Shop Spotlight is
  at least 60% visible in an active tab for one continuous second.
- A canonical presentation must first be accepted by the server qualification
  contract. Canonical replay does not qualify or emit another attention event.
- The analytics record is stronger than campaign issuance, but it is still not
  proof of handset receipt, meaningful attention, video completion, a buyer, or
  a sale.
- Active Spotlight count is current state. Impression and click counts in the
  Opportunity Engine are last-seven-day state.

### DemandBox

- The Shop Analytics Opportunity Engine counts open, non-expired
  `marketplace_requests` in the shop's own community.
- That count is current rather than a seven-day event total.
- It is a community context count, not proof that any request matches the shop,
  represents a buyer, or will become an order.
- Zero means no qualifying open request was found for that community at read
  time. It must not be described as proof that no demand exists.

### Missing-data boundary

- A returned zero from an authorised analytics summary is an observed zero for
  the named window or current-state query.
- No owned shop, a shop outside the selected community, permission failure, or
  analytics request failure is missing/unavailable data. Those states must not
  be converted to zero or to a negative diagnosis.

## Smallest safe connection

Extend the existing authenticated `/market-wisdom/recommendation` response with
one optional server-owned `commerce_signal`. Do not add another Dashboard fetch
and do not add a second recommendation engine.

The Market Wisdom service should:

1. Locate only a shop owned by the signed-in user and scoped to the requested
   selected community.
2. Read a small canonical commerce-signal projection from the existing Shop
   Analytics/Opportunity Engine authority.
3. Add bounded commerce tags to the existing approved-entry ranking.
4. Return the observation, why it matters, one first action, its owning route,
   freshness, and explicit evidence limits.
5. Return an explicit `no_owned_shop`, `community_mismatch`, or `unavailable`
   state instead of manufacturing zero activity.

Proposed response shape:

```text
commerce_signal:
  available
  state
  observed_at
  window_days
  shop_id
  clan_id
  headline
  why_it_matters
  first_action_label
  first_action_route
  evidence_counts
  boundaries
```

The first implementation should use only these real inputs:

- active public product count
- active Spotlight count
- last-seven-day qualified Spotlight impressions
- last-seven-day shop visits, product opens, Spotlight clicks, and contact taps
- current open, non-expired community DemandBox count
- last-seven-day protected-trade count only if the existing Opportunity Engine
  projection already supplies it without widening permissions

## Dashboard integration boundary

- Keep the existing four rotating Market Wisdom readings: `Market`, `GSN`,
  `Guide`, and `Now`.
- Do not restyle, reorder, or replace the frozen Market Wisdom section.
- Let a usable commerce signal influence approved wisdom selection and the
  existing `Now` text.
- Add at most one compact contextual action beneath the existing reading. It
  must use the server-provided label and route to Shop Control analytics,
  Spotlight, DemandBox, Shop Assets, or Protected Trade.
- Do not render the action for missing/unavailable commerce data.
- Keep the existing Focus Commitments action only under its current capability
  condition.

## Recommended route ownership

- Shop setup or product clarity: `/app/shop-assets`.
- Visibility/Spotlight attention: `/app/free-spotlight`.
- Community request context: existing selected-community DemandBox route.
- Serious contact or outcome evidence: existing Protected Trade destination.
- General review or mixed/quiet evidence: `/app/shop-control#shop-control-counts`.

## Devil's-advocate risks

- Importing helpers from an API route into Market Wisdom would invert the
  backend dependency direction. Extract a small shared commerce-signal service
  instead.
- Copying the frontend `buildShopAnalyticsWisdom` rules into Python would
  create two competing diagnosis engines. The server projection must become the
  bounded authority for this connection.
- Community-wide DemandBox count can dominate a small shop unfairly. Treat it
  only as context and never as matched demand.
- A one-second Spotlight qualification is a visible-attention threshold, not a
  useful-view or comprehension threshold. Keep that limitation in every
  recommendation that mentions Spotlight.
- Adding a fifth rotating Market Wisdom signal would change the frozen model.
  Reuse `Now` instead.

## Proposed implementation files

- new bounded backend commerce-signal service under
  `gmfn_backend/app/services/`
- `gmfn_backend/app/services/daily_insight_service.py`
- the existing Marketplace analytics route/service boundary only as needed to
  share the canonical projection
- `gmfn_backend/app/api/routes/daily_insight.py` only if response typing or
  query handling needs adjustment
- `frontend/src/pages/DashboardPage.tsx` for data consumption only, without
  Market Wisdom redesign
- focused backend Market Wisdom/Marketplace analytics tests and existing
  Dashboard Market Wisdom audit cages
- `docs/SCREEN_SPECS.md` and `docs/HANDOFF_NOTES.md`

## Approval decision before runtime work

Approve or reject the single compact contextual action inside the existing
Market Wisdom section. The server-side commerce input can be added without it,
but the user would receive advice without the required direct handoff to the
owning screen.
