# GSN WhatsApp Bridge Protocol - 2026-09-11

## Purpose

The WhatsApp Bridge lets a community keep everyday conversation in WhatsApp while
GSN keeps the structured record, decision, and action trail.

## Product Rule

WhatsApp is the conversation room. GSN is the organised action room.

Updated owner decision: the broad bridge page is not the primary product
pattern. The safer primary pattern is a feature-specific public share link.
WhatsApp, Facebook, TikTok, email, and other channels should carry the exact GSN
action link created by the GSN feature, not a general doorway into Community
Home or internal GSN architecture.

The former broad bridge concept may remain as an optional community signpost,
but it must not be treated as the main operating surface.
2026-09-12 amendment: the broad WhatsApp Bridge should be repurposed as a public
advertising and creation doorway, not an existing-community joining doorway. It
may promote `Create your community`, Community Domain setup, and public GSN
objects such as shop links, shop QR codes, Spotlight links, notice links, and
public verification records. Existing-community membership should remain under
community QR, invite link, pre-approved list, admin approval, dues policy, and
verification policy.


## Feature-Specific Link Model

Each GSN feature should create its own public-safe link and share message:

- Community Bulletin / Notice Board notice link;
- Shop Diary / Shop Gallery link;
- Shop Spotlight link;
- Meeting response link;
- Attendance link;
- Ask Community question link, only when intentionally created;
- Demand request link, only when intentionally created;
- Community public record / verification link.

The shared link must open only the specific feature or record being shared. It
must not drop visitors into Community Home, Community Domain governance, admin
tools, dashboards, internal reports, or broad menus of private actions.

The share flow should be:

1. The owner/admin creates the real item inside GSN.
2. GSN records and shows it to GSN members through the normal in-app surfaces.
3. GSN offers Copy Link, Copy WhatsApp Message, and where supported Share.
4. The owner/admin posts the message into WhatsApp, Facebook, TikTok, email, or
   another channel.
5. The recipient opens the exact GSN item.
6. If response is enabled, the recipient answers through public-safe buttons or
   is asked to sign in/join GSN for member-level response.

## Response Boundary

Whether public link recipients can respond directly is still a product decision
to finalize after phone testing.

Two safe options are allowed:

- Public-safe quick response: the link opens one item and allows restricted
  buttons such as Yes, Maybe, No, Interested, or Not interested. GSN records the
  response without exposing private community tools.
- GSN-member response: the link shows the item but asks the person to open or
  join GSN before responding, so community identity and membership can be
  controlled.

Do not allow a public share link to behave like a general member session.

## Community Domain Governance

Community Domain governance should decide which receiving and sharing channels
are on or off for that community:

- Notice Board public sharing;
- Shop Diary public sharing;
- Shop Spotlight public sharing;
- Meeting response public sharing;
- Attendance response public sharing;
- Demand Box receiving;
- Ask Community receiving.

Demand Box and Ask Community may be active as receiving channels, but they
should not appear as public WhatsApp Bridge menu buttons. Members should send
from their own GSN Demand Box or Ask Community handle. If the target community
has turned receiving off, GSN should block delivery and explain that the
community is not receiving that kind of request right now.

## Legacy Broad Bridge Context

The original bridge page pointed people from WhatsApp into existing GSN engines:

- Community Domain;
- Notice Board;
- Demand Box;
- Ask Community;
- Meeting Response;
- Attendance;
- Shop Gallery / Shop Diaries;
- Spotlight;
- Reports.

Do not create a second notice engine, demand engine, meeting engine, shop engine,
or report engine just because the entry point is WhatsApp.

This remains true, but the safer implementation is to reuse those engines by
creating exact public links from each engine, not by exposing one large bridge
menu.

## Three Anchor Model

1. GSN Bridge Page
   - The real home of the bridge.
   - Contains the permanent GSN link and buttons into existing GSN tools.
   - Does not move when WhatsApp conversation moves.

2. WhatsApp Group Description
   - Holds the permanent bridge link as the stable signpost.
   - Best WhatsApp location for the bridge because it is not pushed down by chat.

3. Pinned WhatsApp Message
   - Holds the same bridge message at the top of the chat.
   - Must be refreshed when WhatsApp pin duration expires.

WhatsApp Status is only a reminder. It disappears after 24 hours and must not be
treated as the bridge home.

## MVP Boundary

The first implementation is link-based:

- GSN prepares/copies bridge text for the owner or admin.
- The owner/admin posts it into WhatsApp.
- Members tap the link and complete the action inside GSN.
- GSN records only what happens inside GSN.

The bridge must not:

- scrape WhatsApp messages;
- read group conversations;
- import group members without consent;
- claim WhatsApp delivery, read receipt, or vote proof;
- contact members automatically without a later consented messaging provider.

## Future Phase

A later provider-backed phase may use WhatsApp Business Platform features such as
templates, opt-in messaging, webhooks, or Flows where legally and technically
allowed. That later phase must keep consent, privacy, and governance boundaries
clear before any automatic sending is enabled.

## Devil Truth

This bridge reduces WhatsApp message drift; it does not remove it. The permanent
record belongs in GSN. WhatsApp remains the familiar conversation and reminder
channel.
