# GSN WhatsApp Bridge Protocol - 2026-09-11

## Purpose

The WhatsApp Bridge lets a community keep everyday conversation in WhatsApp while
GSN keeps the structured record, decision, and action trail.

## Product Rule

WhatsApp is the conversation room. GSN is the organised action room.

The bridge must point people from WhatsApp into existing GSN engines:

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
