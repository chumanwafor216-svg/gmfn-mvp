# Render Deploy Marker

This file is intentionally kept inside `gmfn_backend` so a safe backend-root
change can trigger a Render API redeploy without changing runtime behavior.

## 2026-04-21

- Trigger reason: expose the public entry onboarding routes already present on
  the deployment branch for pilot phone testing.
- Expected live check after deploy:
  - `GET https://gmfn-api.onrender.com/health`
  - `POST https://gmfn-api.onrender.com/entry/phone/start`

