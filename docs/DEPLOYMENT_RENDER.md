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
  - the workflow triggers `gmfn-frontend` through Render service
    `srv-d7h4oe9f9bms739lhh9g`
- `RENDER_API_DEPLOY_HOOK_URL`
  - Render deploy hook URL for `gmfn-api`
  - optional for frontend-only changes, required when backend or `render.yaml`
    changes should trigger the API directly

If `RENDER_FRONTEND_DEPLOY_HOOK_URL` is not set, the workflow falls back to the
Render API when `RENDER_API_KEY` is configured. If neither credential is set,
the workflow will warn and the deployment depends on Render's own auto-deploy
setting for `main`, or on a manual deploy in the Render dashboard. Do not claim
a direct Render deploy was triggered unless the workflow shows the deploy hook
or Render API deploy request was accepted, or Render auto-deploy is confirmed in
the Render dashboard.

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
