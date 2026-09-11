# GSN Steward Setup And Handover Protocol

Date: 2026-09-11
Status: active operating procedure
Owner: Global Support Network Ltd / GSN

## Purpose

This protocol is for cases where GSN helps an organisation prepare its
community or marketplace workspace before the real representative has time to
complete setup personally.

The founder or GSN support may act as a temporary setup steward. The steward
must not pretend to be the organisation, claim verified ownership, or keep the
organisation under the steward's personal account after the real representative
is ready.

## When To Use

Use this procedure when:

- an organisation such as Pillar of Hope wants help preparing its GSN presence;
- the real representative is busy but can answer setup questions by phone,
  WhatsApp, email, or meeting;
- GSN needs to prepare the community, marketplace, shop, or programme surface
  from supplied answers before handover;
- the setup used real organisation details and must later be released cleanly
  to the rightful representative.

Do not use this as a shortcut for fake adoption, verified ownership, paid
approval, charity endorsement, or legal registration confirmation.

## Required Intake Questions

Send or ask these questions before setup:

- Organisation name to show on GSN.
- Short public description.
- Main representative name and role.
- Best contact channel for handover.
- Community or programme purpose.
- Who should be the first owner/admin after handover.
- Whether the organisation wants marketplace/shop features enabled now.
- What goods, services, support, notices, or community activities should appear
  first.
- Whether any public text, logo, photo, address, contact, or private member
  detail must not be shown.
- Whether the setup is for private testing, pilot review, or real public use.
- Whether the representative authorises GSN to prepare the workspace on their
  behalf before transferring control.

## Written Authority Minimum

Before recording setup as an official steward setup, keep a written reply or
recorded meeting note that says, in plain language:

```text
I authorise Global Support Network / GSN to prepare our community or marketplace
workspace from the information I have provided. I understand this is setup help
only. Ownership should be released to me or our named representative before the
workspace is treated as ours in normal use.
```

If the person gives permission verbally, record the date, person, channel, and
summary in the reviewer note. Written confirmation is still better before live
handover.

## Setup Procedure

1. Collect the answers and authority.
2. Use `Steward setup` in `/app/command-center/community-ownership`.
3. Keep the community in `steward_setup` status while GSN is preparing it.
4. Add only information the organisation supplied or approved.
5. Avoid private phone numbers, private email addresses, home addresses, bank
   details, sensitive beneficiary information, or unapproved member data in repo
   notes or public app surfaces.
6. Use `Pilot data cleanup` if old test/public details need to be cleared
   before real handover.
7. Do not publish, promote, or represent the setup as accepted until the real
   representative has accepted ownership.

## Handover Procedure

1. Ask the real representative to create or confirm their GSN account.
2. Confirm identity and authority outside the app using the available evidence.
3. Use owner repair/release to transfer the community to the representative.
4. Confirm the representative has active admin membership.
5. Remove or downgrade the steward's owner/admin role unless GSN support still
   has a clearly agreed temporary support role.
6. Tell the representative how to continue:
   - sign in with their own account;
   - check organisation details;
   - edit marketplace/shop information;
   - invite the first trusted members;
   - use Shop Analytics / Market Intelligence only as guidance, not proof of
     sales or trust.
7. Record the reviewer note with who accepted, what proof was checked, and what
   was released.

## If The Organisation Leaves GSN

If the organisation decides not to continue:

- use lifecycle close/dormant or pilot cleanup as appropriate;
- preserve the audit trail;
- do not hard-delete history merely to make the screen look clean;
- do not free the name for a new claimant unless GSN makes a separate reviewed
  policy decision.

## Truth Boundaries

Steward setup means GSN helped prepare a workspace. It does not prove:

- the organisation adopted GSN;
- the organisation paid GSN;
- the representative legally owns the organisation;
- the charity, NGO, school, church, association, or marketplace endorsed GSN;
- any sale, donation, delivery, beneficiary impact, or trust score happened.

The correct proof comes later from real owner acceptance, pilot use, member
activity, written commitment, payment/sponsor willingness, and properly recorded
evidence.