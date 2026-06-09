# Render Deploy Marker

This file is intentionally kept inside `gmfn_backend` so a safe backend-root
change can trigger a Render API redeploy without changing runtime behavior.

## 2026-04-21

- Trigger reason: expose the public entry onboarding routes already present on
  the deployment branch for pilot phone testing.
- Expected live check after deploy:
  - `GET https://gmfn-api.onrender.com/health`
  - `POST https://gmfn-api.onrender.com/entry/phone/start`

## 2026-04-29

- Trigger reason: force a fresh Render redeploy after the latest
  `feature/vault-shops` completion batch, including:
  - join / approval system-level hardening
  - backend clan/member route resolution fix
  - dashboard profile-image persistence
  - public entry / marketplace / trust frontend finishing cleanup
- Deployment branch head before this marker update:
  - `0367ca2`
- Expected live checks after deploy:
  - `GET https://gmfn-api.onrender.com/health`
  - `GET https://gmfn-api.onrender.com/openapi.json`
  - `GET https://gmfn-frontend.onrender.com`
  - `GET https://gmfn-frontend.onrender.com/app/community`

## 2026-06-09

- Trigger reason: force an API redeploy after adding the live identity contract
  guard and the Render API deploy path for signed-in identity evidence.
- Expected live check after deploy:
  - `GET https://gmfn-api.onrender.com/openapi.json`
  - signed-in identity evidence routes are present:
    `/entry/signed-in/phone/start`,
    `/entry/signed-in/phone/confirm`,
    `/entry/signed-in/official-id/record`,
    `/entry/signed-in/identity-photo/record`
  - `WithdrawalDestinationIn` exposes `sort_code` and `bank_sort_code`
