# GSN Pillar Of Hope Community Domain Setup Action Plan

Date prepared: 2026-09-13
Status: steward trial setup in progress; handover and verified release blocked until written assent/approval is captured in chat or email

## Confirmed Facts

- Pillar of Hope already has a Community Domain trial entry point in the frontend.
- `/pillar-of-hope`, `/poh`, and `/pillar-of-hope-demo` redirect to `/community-domain/purchase?demo=pillar-of-hope`.
- The trial preset uses the NGO / project network template.
- The local-community-first rule applies: create or repair the normal GSN community anchor before filling the Community Domain layer.
- A pilot intake email with setup questions was sent to the existing Felix / Pillar of Hope thread on 2026-09-11.
- No filled intake reply from Felix was found after the 2026-09-11 pilot setup email during the 2026-09-13 mail check.
- On 2026-09-13, the product owner reported that Mr Felix gave express permission to restart the Pillar of Hope trial setup. Treat this as permission to prepare the GSN steward/trial shell only, not as final institutional handover evidence until the assent/approval is captured in chat or email.

## Truth Boundary

Do not claim that Pillar of Hope has adopted, paid for, publicly endorsed, or formally authorised GSN until the responsible representative provides clear written approval.

Do not make the live Community Domain active, verified, handed over, or public-authoritative merely because a trial page or owner-reported verbal permission exists.

For demonstration, say:

```text
This is the Pillar of Hope Community Domain trial setup route. It shows how GSN prepares a charity/nonprofit workspace. Handover and verified release still wait for Pillar's responsible representative to confirm authority, public details, and privacy boundaries in writing.
```

## Demonstration Routes

Production:

```text
https://gmfn-frontend.onrender.com/pillar-of-hope
https://gmfn-frontend.onrender.com/poh
https://gmfn-frontend.onrender.com/pillar-of-hope-demo
https://gmfn-frontend.onrender.com/community-domain/purchase?demo=pillar-of-hope
```

Local dev:

```text
http://localhost:5173/pillar-of-hope
http://localhost:5173/poh
http://localhost:5173/pillar-of-hope-demo
http://localhost:5173/community-domain/purchase?demo=pillar-of-hope
```

Admin Command Centre route for steward setup, owner repair, and domain ownership repair:

```text
/app/command-center/community-ownership?community_name=Pillar%20of%20Hope&domain_name=Pillar%20of%20Hope&owner_query=Felix
```

After a real Community Domain draft exists, the owner/dashboard route is:

```text
/app/community-domain/:communityDomainId
```

## Setup Sequence

1. Use the trial route for presentation and setup preparation without claiming final handover.
2. If preparing a hidden shell, use Command Centre steward setup for `Pillar of Hope`.
3. Keep the community status as `steward_setup` until written assent/approval is captured in chat or email.
4. Once Felix/Pillar confirms authority in writing, repair/release the normal community owner to the confirmed GSN identity.
5. Create the Community Domain draft only after the owner has a normal GSN community anchor.
6. Use domain name `pillar-of-hope`, display name `Pillar of Hope`, and template `ngo_project_network`.
7. Keep the Community Domain in draft/pending setup unless owner proof, privacy rules, and public profile are confirmed.
8. Do not generate payment instructions during the pilot unless price, currency, billing cycle, and payment responsibility are separately agreed.

## Minimum Live Release Evidence

- Responsible representative name and role.
- Written authority sentence from the intake form or equivalent email approval.
- Public display name and public description.
- Public contact decision.
- Private/safeguarding information that must not be shown.
- Who can join Pillar of Hope on GSN.
- Who approves new members.
- First admin/operator list.
- Decision on official notices, Demand Box, marketplace/shop features, QR tools, verification, and pilot Spotlights.
- Logo/banner permission if any image is used.

## Devil's Advocate

The app can show and prepare the Pillar setup journey today. It cannot honestly show Pillar as handed over, a confirmed live customer, or a verified institution until the written assent/approval and papers are attached.

The right move is to demonstrate the Community Domain operating model, then use Felix's written reply or approval trail to turn the prepared shell into an authorised pilot workspace.
