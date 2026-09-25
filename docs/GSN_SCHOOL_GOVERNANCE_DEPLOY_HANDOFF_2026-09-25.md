# GSN School Governance Deploy Handoff

Date: 2026-09-25
Status: deployed code, documentation follow-up prepared
Owner: Chukwuma Nwafor / Global Support Network Ltd

## Deployed Commit

Commit deployed to `main`:

- `e7cb8782` - `Add school governance pilot package`

Live services verified after deploy:

- Frontend: `https://gmfn-frontend.onrender.com`
- API: `https://gmfn-api.onrender.com`
- Frontend Render deploy id: `dep-dar7pt7nh4qs73fb4jmg`
- API Render deploy id: `dep-dar7r6navr4c7383qqig`
- GitHub Actions run: `36143891020`

## Verification Completed

Before deployment:

- backend syntax check passed for `community_domains.py`;
- school-focused backend tests passed: `7 passed`;
- frontend build passed;
- community-domain product contract audit passed;
- GitHub backend test workflow passed on `main`.

After deployment:

- frontend public URL served the current build marker;
- backend/API deployment was forced with `deploy_api=true`;
- live API identity/public contract audit passed against
  `https://gmfn-api.onrender.com`.

## Important Correction

The first Render workflow run deployed the frontend but skipped the API because
manual dispatch defaults `deploy_api=false`.

That was corrected by rerunning the workflow with:

```text
deploy_api=true
```

The second workflow run deployed both frontend and API successfully.

## Handoff File Size Issue

`docs/HANDOFF_NOTES.md` had grown beyond a safe working size during repeated
prepends. It reached a size that caused GitHub to reject a push because GitHub
blocks files above 100 MB.

The deployed code commit therefore excludes the latest handoff note changes and
keeps the handoff file under the GitHub hard limit.

Going forward:

- do not keep prepending large entries into `docs/HANDOFF_NOTES.md`;
- create focused dated handoff files for large work packages;
- use the main handoff file only as a compact index or short status note.

## Documentation Follow-Up

The school governance pilot should be governed by:

- `docs/GSN_SCHOOL_GOVERNANCE_PACKAGE_PROTOCOL_2026-09-25.md`
- `docs/GSN_EXTERNAL_EMAIL_LETTERHEAD_TEMPLATE_2026-09-25.md`

These documents record two operational rules that came from the discovery call:

- the school package adapts existing GSN engines and must not become a duplicate
  school-management engine;
- external messages should use official GSN letterhead and footer links unless
  the owner explicitly says otherwise.

## Devil Truth

The deployment is live, but the pilot is not proven just because the code is
deployed. The next real validation step is to show Mr Kanu a small guided
school demo using sample records, then confirm whether his team can understand
and operate the fee, notice, and attendance workflows without extra explanation.
