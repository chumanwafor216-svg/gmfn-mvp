# GSN Enugu CDW Adoption Pilot Release Candidate

Date: 23 November 2026
Branch: `codex/enugu-cdw-adoption-pilot`
Status: Prepared for founder deployment decision; not pushed, merged, or deployed.

## Approved scope

- A requester can choose **Ask seller** directly from a reliable visible DemandBox match.
- The backend revalidates the demand, product, Shop, requester identity, community relationship, and Shop contact privacy before returning contact context.
- The prepared WhatsApp message carries the original request title, public request detail, area, matched product, and Shop name.
- **View Shop** remains optional.
- **Back to request** returns to the originating DemandBox request through the shared no-jump mobile reveal authority.
- Authorised responders receive three optional editable text helpers: **I can help.**, **Unavailable.**, and **I need more details.**
- Ordinary private text, voice, responder permissions, Shop contact rules, and existing DemandBox lifecycle remain unchanged.
- Contacting a seller is explicitly not represented as an agreement.

## Complete candidate inventory

The branch contains the two previously approved DemandBox matching commits plus the bounded seller-contact integration commit. Compared with `origin/main`, the complete file inventory is:

- `docs/FREEZE_POLICY.md`
- `docs/GSN_ENUGU_CDW_ADOPTION_PILOT_RELEASE_CANDIDATE_2026-11-23.md`
- `docs/HANDOFF_NOTES.md`
- `docs/SCREEN_SPECS.md`
- `frontend/src/components/DemandResponsePanel.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/DemandBoxPage.tsx`
- `frontend/tools/audit-demand-box-expand-search.mjs`
- `frontend/tools/audit-demand-box-front-package.mjs`
- `frontend/tools/smoke-demand-box-simple-phone.mjs`
- `gmfn_backend/app/api/routes/marketplace_requests.py`
- `gmfn_backend/app/schemas/marketplace_requests.py`
- `gmfn_backend/app/services/demand_supply_intelligence_service.py`
- `gmfn_backend/tests/test_demand_supply_intelligence_service.py`
- `gmfn_backend/tests/test_opportunity_relay_service.py`

No other tracked file differs from `origin/main`.

## Authority and privacy

The new read-only endpoint is:

`GET /marketplace/requests/{request_id}/supply-matches/{product_id}/seller-contact?shop_id={shop_id}`

It requires an authenticated user, reuses `resolve_demand_supply_trade_handoff()`, and permits the contact handoff only to the original requester. Same-community contact uses the existing authorised-community Shop privacy projection. A governed wider-community match receives only contact information allowed by the existing public Shop privacy projection. Responses use `Cache-Control: private, no-store` and do not expose seller/requester user IDs.

The handoff creates no DemandBox response, notification, Protected Trade record, TrustEvent, agreement, payment, delivery, or analytics record.

## Verification completed

- `tests/test_demand_supply_intelligence_service.py`: 32 passed.
- DemandBox/Shop/privacy/voice regressions: 106 passed.
- Frontend production build: passed.
- DemandBox source contract audit: passed.
- DemandBox expanded-search audit: passed.
- Marketplace front-package audit: passed.
- Public Shop button inventory audit: passed.
- Spotlight controls and presentation audits: passed.
- DemandBox mobile smoke: passed at 360x780, 390x844, and 430x932.
- Match panel measured 414px at 360/390px and 376px at 430px; the original request remains visually dominant.
- Mobile tap-stability audit: passed after replacing smooth scrolling with the shared no-jump reveal helper.
- Dashboard passport visual freeze check: passed.
- Shop Control analytics mobile visual freeze check: passed. The unchanged check still emitted existing duplicate React-key and mocked-resource console warnings, but its assertions passed.
- Trust infrastructure visual freeze check: did not complete; two attempts timed out at its existing 30-second `networkidle` navigation wait on `/app/dashboard`. No Trust contract assertion failed, and no Trust file changed.

## Migration and configuration impact

- No database migration.
- No schema change.
- No environment-variable or feature-flag change.
- No Render configuration change.
- `render.yaml` remains unchanged and still runs `alembic upgrade head` during pre-deploy.
- Candidate Alembic head: `20261121_spotlight_slice4a_completion`.
- There is no Alembic-version diff from `origin/main`, and the prohibited `20261122_taxonomy_repair` migration is absent from this candidate.

## Notification retry defect kept separate

The existing private-response route commits the response before calling `create_notification()`. Its idempotent retry path returns an existing response before notification creation. Therefore, if notification creation fails after the response commit, a client retry can return success while leaving the recipient notification missing. Existing tests confirm notification content on the ordinary success path but do not cover failure-after-commit followed by retry.

No repair is included in this candidate. A later narrow change should add a failure-injection regression proving that retry either recreates the missing notification idempotently or records a durable notification-delivery obligation without duplicating the response.

## Production smoke plan

1. Confirm the deployed revision equals the approved candidate SHA.
2. Sign in as the designated Enugu pilot requester and open one controlled DemandBox request with a reliable Shop match.
3. Confirm **Ask seller** is present only for the requester and **View Shop** remains optional.
4. Tap **Ask seller**; inspect the WhatsApp draft without sending. Confirm request, product, Shop, area, and no-agreement language are present.
5. Return to GSN and tap **Back to request**. Confirm the same request remains open.
6. Sign in as an authorised responder. Confirm the three helper replies populate editable ordinary text and do not send automatically.
7. Confirm ordinary text and voice replies still work between the two authorised participants.
8. Confirm a non-requester and an anonymous request cannot retrieve the protected handoff context.
9. Confirm generic Public Shop and Spotlight contact actions remain unchanged.
10. Review logs for 401/403/404 privacy failures and unexpected 5xx responses; stop the pilot if private request text appears outside the authorised requester handoff.

## Enugu CDW acceptance checklist

- [ ] Requester sees a reliable match and understands availability is not confirmed.
- [ ] Ask seller to WhatsApp draft requires two intentional actions including WhatsApp Send.
- [ ] Full Ask seller, Send, and Back to request journey requires three intentional actions.
- [ ] Draft retains the correct request, product, Shop, and area.
- [ ] View Shop is available but not compulsory.
- [ ] Seller quick replies remain optional and editable.
- [ ] Voice and ordinary text replies remain available.
- [ ] Contact is not presented as agreement, payment, delivery, verification, or fulfilment.
- [ ] Unauthorised and anonymous users receive no private handoff context.
- [ ] No unrelated migration, feature flag, taxonomy repair, payment, logistics, or TrustSlip change is present.

## Rollback

Before deployment, record the current production SHA. If the pilot fails, redeploy that exact prior SHA. If the candidate has been merged, revert the candidate commits rather than altering the database; no migration downgrade is required. Confirm `/app/demand-box`, Public Shop, Marketplace, Spotlight, and private voice responses after rollback.

## Current release recommendation

The scoped adoption implementation is technically coherent and its relevant tests pass. Deployment remains **NO-GO** until the founder accepts the exact final commit and either accepts the unchanged Trust visual timeout as non-blocking or obtains a clean CI rerun of that protected visual check.
