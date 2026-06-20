# Render Deployment Guide

This repo is prepared for a first public pilot on:

- Render Static Site for `frontend`
- Render Web Service for `gmfn_backend`
- Render Postgres for the primary database
- Cloudflare R2 for object storage

The root [render.yaml](/abs/path/C:/Users/chukwuma%20pc/gmfn_mvp/render.yaml:1) is the main provisioning file.

## 1. Before provisioning

Prepare these values:

- frontend public URL
- backend public URL
- Cloudflare R2 bucket credentials
- bank webhook secret if bank webhooks will be exposed publicly
- first admin email address

Use these templates:

- [frontend/.env.production.example](/abs/path/C:/Users/chukwuma%20pc/gmfn_mvp/frontend/.env.production.example:1)
- [gmfn_backend/.env.production.example](/abs/path/C:/Users/chukwuma%20pc/gmfn_mvp/gmfn_backend/.env.production.example:1)

## 2. Create the Render stack

1. Push the repo to GitHub.
2. In Render, create a new Blueprint deployment from this repository.
3. Render will read [render.yaml](/abs/path/C:/Users/chukwuma%20pc/gmfn_mvp/render.yaml:1) and provision:
   - `gmfn-frontend`
   - `gmfn-api`
   - `gmfn-postgres`

## 3. Fill the prompted environment variables

Render will prompt for the `sync: false` values.

### Frontend

- `VITE_API_BASE_URL`
  - set this to the public backend URL
  - example: `https://gmfn-api.onrender.com`

### Backend

- `GMFN_CORS_ORIGINS`
  - set this to the public frontend URL
  - example: `https://gmfn-frontend.onrender.com`
  - if you later add a custom domain, update it to that domain

- `GMFN_WEBHOOK_SECRET`
  - required if public bank webhook endpoints will be used

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## 4. Deploy behavior already configured

The backend service is configured to:

- install Python requirements
- run `alembic upgrade head` before deploy
- start with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- use a persistent disk mounted at `/var/data/gmfn-uploads`

The frontend service is configured to:

- run `npm ci && npm run build`
- publish `frontend/dist`
- rewrite all SPA routes to `/index.html`

## 4.1 Pilot deploy trigger rule

During the live pilot, every verified fix must be pushed to `main`.

The repo also includes `.github/workflows/render-deploy.yml` so GitHub can
trigger Render directly after a `main` push or from a manual workflow dispatch.
This workflow does not store Render credentials in code. It expects these
GitHub repository secrets:

- `RENDER_FRONTEND_DEPLOY_HOOK_URL`
  - Render deploy hook URL for `gmfn-frontend`
  - required for direct frontend deploy triggering
- `RENDER_API_KEY`
  - Render API key for the workspace
  - used as a fallback if the frontend deploy hook secret is missing
  - used for backend deploys when available so the workflow can deploy the
    exact GitHub commit SHA for `gmfn-api`, instead of relying only on a deploy
    hook tied to whatever branch/service Render has configured
  - the workflow triggers `gmfn-frontend` through Render service
    `srv-d7h4oe9f9bms739lhh9g`
- `RENDER_API_SERVICE_ID`
  - optional Render service ID for `gmfn-api`
  - if omitted and `RENDER_API_KEY` is configured, the workflow attempts to
    discover the `gmfn-api` service by name before falling back to the deploy
    hook
- `RENDER_API_DEPLOY_HOOK_URL`
  - Render deploy hook URL for `gmfn-api`
  - legacy only; do not use it for backend-impacting deploys during the pilot
    because the hook has accepted requests while `gmfn-api` continued serving
    stale backend code

The active `gmfn-frontend` Render service should track `main`. A temporary
workflow mirror to `feature/vault-shops` was used during pilot recovery when
Render was still connected to that older branch, but it has been removed after
the product owner confirmed the Render service was changed to `main`. Keep the
workflow on read-only contents permission unless a future deployment recovery
explicitly requires a branch write.

If `RENDER_FRONTEND_DEPLOY_HOOK_URL` is not set, the workflow falls back to the
Render API when `RENDER_API_KEY` is configured. If neither credential is set,
the workflow will warn and the deployment depends on Render's own auto-deploy
setting for `main`, or on a manual deploy in the Render dashboard. Do not claim
a direct Render deploy was triggered unless the workflow shows the deploy hook
or Render API deploy request was accepted, or Render auto-deploy is confirmed in
the Render dashboard.

Backend-impacting deploys also run a live API identity-contract check against
`https://gmfn-api.onrender.com/openapi.json` and a public community verification
payload check against `/verify/community/GSN-C-000001`. The check must find the
signed-in identity routes used by Trust Passport / Identity Integrity, the GB
sort-code fields used by payout details, and a trimmed public community
verification response that does not expose protected-category inventory:

- `/entry/signed-in/phone/start`
- `/entry/signed-in/phone/confirm`
- `/entry/signed-in/official-id/record`
- `/entry/signed-in/identity-photo/record`
- `/withdrawal-destinations/me`
- `WithdrawalDestinationIn.sort_code`
- `WithdrawalDestinationIn.bank_sort_code`
- no `hidden_by_design` field or protected-category terms such as full member
  lists, raw phone numbers, sponsor details, internal disputes, private relay
  contacts, or internal trust history in the public community verification
  response

If the deploy hook is accepted but this check fails, the API service is still
serving an older backend build or the wrong Render service/branch. Do not ask
the pilot phone to retest identity completion or public community QR privacy
until the live contract check passes.

Backend-impacting deploys now require the Render API path. Configure
`RENDER_API_KEY` and preferably `RENDER_API_SERVICE_ID` so the workflow sends
`commitId` with the exact GitHub SHA. A hook-accepted message is only a request
receipt; it does not prove that the live API is running the new backend code.
If those secrets are missing, deploy `gmfn-api` manually from the Render
dashboard and run `npm --prefix frontend run audit:live-api-identity-routes`
before asking for phone retesting.

## 4.2 Active pilot deploy protocol

For the active pilot, every completed verified fix follows this protocol unless
the product owner explicitly says not to publish:

1. Commit the completed fix locally.
2. Push the working branch.
3. Fast-forward `main` to the same verified commit.
4. Confirm that GitHub Actions started `Trigger Render Deploy` for the `main`
   push.
5. Confirm one of these deployment evidence points:
   - `Trigger frontend deploy hook` completed successfully;
   - `Trigger frontend deploy through Render API` completed successfully;
   - Render auto-deploy is confirmed in the Render dashboard;
   - an owner-provided Render deploy hook was triggered out of band and returned
     a deploy id.
6. Report the branch, commit SHA, GitHub Actions run, and Render deploy evidence.

Never commit Render deploy hook URLs, API keys, or other deployment credentials
to this repository. If a deploy hook is shared in chat for immediate pilot
recovery, use it only as a one-time secret trigger and record only the returned
deploy id, not the hook URL.

## 4.3 Render parity / drift check

The pilot phone should normally test Render, not the developer laptop. A local
phone URL such as `192.168.x.x:5173` can prove a UI repair works locally, but it
does not prove the public pilot has received it.

Before treating a production screenshot as a new bug, confirm whether it is one
of these states:

- **Local only**: corrected in the worktree but not committed or pushed.
- **Pushed, not deployed**: committed to GitHub but no Render deploy evidence.
- **Deploy requested**: workflow/manual deploy started, but live Render has not
  been checked yet.
- **Render confirmed**: live Render is serving the corrected build.

For every publish report, include:

- branch and commit SHA;
- whether the relevant worktree was clean or which files remained local-only;
- GitHub Actions run id or Render deploy id when available;
- whether the owner's Render screenshot is expected to match local testing yet.

If local testing shows the correction but Render does not, call it deployment
drift until the corrected commit is proven live on Render. Do not keep redesigning
or re-fixing the same screen until the deploy path is checked.

## 5. Promote the first real admin

After a real user account is created in production, promote it with:

```bash
cd gmfn_backend
python set_admin.py --email you@example.com
```

The script now uses the active configured database instead of a local SQLite path:

- [gmfn_backend/set_admin.py](/abs/path/C:/Users/chukwuma%20pc/gmfn_mvp/gmfn_backend/set_admin.py:1)

## 6. Immediate post-deploy checks

Check these first:

1. frontend loads
2. login works
3. authenticated routes reach the API
4. uploads resolve under `/uploads/...`
5. `/health` returns `ok: true`
6. admin command centre is reachable only for admin users
7. `alembic upgrade head` completed successfully in deploy logs

## 7. Important deployment assumptions

- production must run with `GMFN_DEV_MODE=0`
- the university pilot can use `GMFN_ENTRY_PHONE_DELIVERY=preview` for controlled OTP verification without paid SMS delivery
- live public SMS must remove the preview/manual OTP mode and configure a real SMS provider
- production must set `DATABASE_URL`
- production must set `GMFN_SECRET_KEY`
- uploads use the Render persistent disk through `GMFN_UPLOADS_DIR=/var/data/gmfn-uploads`
- the API blueprint keeps `GMFN_ENABLE_RECONCILIATION_LOOP=0`; move reconciliation to a worker or cron before enabling background mutation again

## 8. When to change the blueprint

Change [render.yaml](/abs/path/C:/Users/chukwuma%20pc/gmfn_mvp/render.yaml:1) if any of these happen:

- backend needs more than `starter` compute
- Postgres needs to move beyond `basic-1gb`
- you separate reconciliation into a worker or cron
- you move frontend hosting away from Render Static
