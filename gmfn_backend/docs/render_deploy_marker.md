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
