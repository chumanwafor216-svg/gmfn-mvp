# GSN DemandBox Trail And Command Centre Reporting Requirement

Date: 2026-09-17
Status: Architecture note after code inspection
Product name: GSN

## Purpose

This note records what DemandBox already does today and what is still missing for proper monthly, yearly, and Command Centre reporting.

## Current Implementation Truth

DemandBox already has a real backend table: `marketplace_requests`.

A demand request is not only a visual card. It is stored with:

- request id
- community id (`clan_id`)
- requester user id
- title
- description
- category
- urgency
- area
- contact path
- payment preference
- open/closed status
- creation time
- expiry time

The current backend supports these status values in practice:

- `open`
- `fulfilled`
- `cancelled`
- `expired`

The frontend currently loads open demand rows and shows them through lanes such as:

- All open
- Tagged
- For me
- Mine
- Ask Community
- Urgent
- Need types

When the owner marks a demand as fulfilled or cancelled, the row is no longer shown in the open queue because the page reloads `status=open`. That disappearance is expected and acceptable for the live working queue.

The backend can list closed rows through `status=closed`, which includes fulfilled, cancelled, and expired requests. However, the current DemandBox screen does not yet expose a polished history/trail panel for ordinary users or Command Centre reporting.

## What The Owner Is Asking For

The owner accepts that a handled demand can disappear from the live queue after action. The important requirement is that it must not disappear from GSN evidence.

GSN should eventually be able to answer:

- how many demands a member introduced
- how many demands a member attended to
- how many demands a community received
- how many demands were fulfilled
- how many were cancelled
- how many expired
- how many were ignored or never acted on
- how many offers or responses were made
- which communities generate repeated demand patterns
- which members or shops repeatedly respond to demand

This must become part of Command Centre and Community Domain intelligence.

## Current Gap

The current system records demand creation and owner-side closure. It does not yet record every responder action as a durable event.

For example, opening WhatsApp, copying demand paper, calling, viewing, or deciding to respond is not yet stored as a permanent `demand_attended` or `demand_response` record.

Therefore GSN can count created/open/fulfilled/cancelled/expired rows, but it cannot yet honestly report all attended-to demand activity by responder, community, month, or year.

## Required Future Data Model

A proper DemandBox trail should add a separate activity table rather than overloading the request row.

Suggested table concept: `marketplace_request_events` or `demand_events`.

Suggested event types:

| Event type | Meaning |
| --- | --- |
| `demand_created` | A member created a demand. |
| `demand_viewed` | A visible member opened or read the demand. |
| `demand_contact_opened` | A member opened WhatsApp/call/contact path. |
| `demand_paper_copied` | A member copied the request paper. |
| `demand_response_started` | A member indicated intent to respond. |
| `demand_offer_made` | A member/shop made a concrete offer. |
| `demand_fulfilled` | The owner marked the demand fulfilled. |
| `demand_cancelled` | The owner cancelled it. |
| `demand_expired` | GSN expired it automatically. |

Suggested fields:

- event id
- request id
- community id
- actor user id
- owner user id
- event type
- event timestamp
- metadata JSON
- visibility/privacy boundary

## Command Centre Reporting Outputs

Command Centre should eventually expose time-window reports such as:

| Metric | Meaning |
| --- | --- |
| Demands introduced | Requests created in the selected period. |
| Demands attended | Requests that received a recorded response, contact open, paper copy, or offer. |
| Demands fulfilled | Requests marked fulfilled. |
| Demands cancelled | Requests cancelled by owner. |
| Demands expired | Requests that timed out. |
| Repeat need categories | Categories that recur in the community. |
| Response activity | Members or shops repeatedly engaging with demand. |
| Sponsor evidence | Demand activity that proves a poor community is active and worth supporting. |

## Display Rule

The live DemandBox queue should remain simple.

It may show one highlighted demand, or a limited list, as long as the count and route to the full queue are clear. The live queue is for action. The Command Centre trail is for evidence, reporting, costing, and learning.

## Devil Truth

At the moment, DemandBox is stronger than a temporary notification because it stores requests and status. But it is not yet a full demand intelligence system. Without event records, GSN cannot honestly claim monthly or yearly attended-demand statistics. It can only report request rows and final statuses.

## Recommended Next Implementation Step

The next technical step should be a small, safe backend addition:

1. Add a demand event table.
2. Record `demand_created` when a request is created.
3. Record `demand_fulfilled` and `demand_cancelled` when status changes.
4. Add a read-only summary endpoint for counts by community, user, status, and date range.
5. Later add responder events such as view, copy paper, contact opened, and offer made.

This should be done before GSN promises Command Centre monthly/yearly DemandBox reporting to communities or sponsors.
