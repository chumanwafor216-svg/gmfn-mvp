# GSN School Governance Package Protocol

Date opened: 2026-09-25
Status: active product protocol for school-facing pilot design
Owner: Chukwuma Nwafor / Global Support Network Ltd

## Purpose

The School Governance Package adapts existing GSN engines to school operations
without creating a separate school-management product or duplicating platform
engines.

This protocol exists because customer discovery with Great Big Thinkers Group
of Schools identified repeatable school needs:

- parent notice acknowledgement;
- school-fee follow-up;
- staff/admin-scanned student attendance;
- parent notification;
- school marketplace/shop visibility for books, uniforms, supplies, and parent
  services.

## Non-Duplication Rule

Do not build a separate school engine when an existing GSN engine can be adapted.

Before adding a new school feature, map it to the existing engine first:

- School/institution: Community Domain.
- Campus, class, arm, department, or unit: Community Domain node.
- Circular, announcement, school-fee notice, meeting notice: Notice/Bulletin.
- Parent acknowledgement: Notice acknowledgement roll call.
- School fee instruction: Community Domain collection/payment instruction.
- Payment slip/proof: existing expected-payment/payment-proof/finance-review
  pattern where suitable.
- Fee status and bursar confirmation: school package surface over finance
  review and activity/evidence records.
- Student attendance: adapted Community Domain attendance engine, but
  staff/admin-scanned for minors.
- Parent arrival/departure notification: notification bridge/log over the
  attendance record.
- Books, uniforms, supplies, parent businesses, and services: marketplace/shop
  lanes governed by the school/community domain.

If the existing engine is almost right, extend or configure it. Do not fork it.
Only create a new backend entity or route when the existing engine cannot safely
represent the school workflow, privacy boundary, or authority model.

## School Package Principle

The package is a surface and governance configuration over GSN, not a new
platform.

```text
GSN core engines stay shared.
School package adapts language, roles, screens, and workflow.
```

The same package should be reusable by other schools at a similar operational
level, not custom-coded only for one school.

## Student Attendance Rule

For primary and secondary school pupils, do not design the default flow around
student phones.

The correct default model is:

1. Student has a printed school ID with an opaque GSN QR/code.
2. Authorized school staff signs into GSN.
3. Staff scans the student's code for arrival or dismissal.
4. GSN records the staff actor, student reference, campus/class context, time,
   and session type.
5. Parent notification is prepared or sent through the chosen channel.

The student QR/code must not expose private student details publicly. It should
only resolve inside an authorized school staff flow.

Do not rotate printed student QR codes weekly or monthly by default. Use a
durable student code that can be revoked and reissued if a card is lost,
compromised, or replaced.

## School Fee Tracking Rule

School fee tracking should begin as a governed status and evidence workflow, not
as a bank or payment processor claim.

The first version should support:

- student;
- parent/guardian;
- campus;
- class/level;
- term/session;
- expected fee;
- amount paid;
- balance;
- status: unpaid, part-paid, paid, credit/overpaid, disputed;
- payment channel: bank transfer, cash, POS, office/manual;
- payment slip/proof received;
- receipt issued;
- bursar/admin confirmation;
- follow-up owner and note.

GSN must not claim a school fee is bank-confirmed unless a bank/provider match,
receipt, or authorized bursar/finance review exists.

## WhatsApp Bridge Adoption Rule

WhatsApp is a bridge, not the product.

The WhatsApp Bridge may be used because it is familiar and cheaper than SMS in
many Nigerian school contexts. However, it must not make GSN invisible.

Use WhatsApp to:

- notify parents that something exists in GSN;
- carry a short school-approved message;
- invite parents to acknowledge in GSN;
- bring parents into the school community space;
- point parents to official records, attendance notices, fee notices, school
  shop items, and marketplace/service visibility.

Do not let WhatsApp become the only destination for value.

Every WhatsApp Bridge message should, where appropriate, include a GSN link or
next step so the parent returns to GSN for the structured action:

- acknowledge a notice;
- view a child's attendance notification;
- check a fee notice/status;
- view school shop items such as books or uniforms;
- access parent/community marketplace or service visibility;
- update contact preference.

## Mandatory Adoption Balance

Avoid two bad extremes:

1. **WhatsApp-only convenience:** the school gets value while parents never join
   GSN, making GSN just a hidden helper.
2. **GSN-only rigidity:** the school must force every parent onto a new platform
   before seeing value, causing slow adoption.

The correct bridge is:

```text
WhatsApp carries the prompt.
GSN carries the record, acknowledgement, marketplace, attendance, fee status,
and community value.
```

## Parent Value Rule

Parents must see value beyond school administration. Otherwise school management
may use GSN internally while parents remain passive.

School-facing GSN should make these parent benefits visible:

- official school announcements without noisy group chat;
- child arrival and dismissal records where enabled;
- school-fee notice and follow-up clarity;
- school shop access for books, uniforms, forms, and supplies;
- parent marketplace/service visibility where school governance allows it;
- trusted community demand/support paths without turning the school notice board
  into a chaotic chat group.

The school should be able to say:

```text
Official school notices, attendance records, fee notices, school shop items, and
approved parent services live in GSN. WhatsApp may alert you, but GSN is where
the structured record and action are kept.
```

## Notice Board Boundary

Do not recreate a noisy WhatsApp group inside the school notice board.

The school needs an official announcement surface where:

- school admins post structured notices;
- parents acknowledge or respond through controlled actions;
- officers see acknowledgement roll calls;
- ordinary parent chat does not bury official messages.

Marketplace, parent services, school shop, and demand/support lanes may exist,
but they must be governed as separate lanes rather than mixed into the official
notice board.

## Devil Truth

The WhatsApp Bridge solves adoption friction, but if it is too generous it can
reduce the pressure to join GSN. The bridge must therefore be designed as an
entry ramp into GSN, not a replacement for it.

The school package is promising because it turns GSN into visible operational
infrastructure for schools. It becomes dangerous if it forks the platform,
overclaims payment proof, exposes student data, or turns school governance into
another noisy chat feed.
