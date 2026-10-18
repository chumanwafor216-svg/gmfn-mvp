# GSN Data Retention and Deletion Policy

Date: 2026-10-18

## Purpose

Keep GSN lean without destroying evidence. Storage reduction must target
replaceable payload and delivery machinery, not the history needed for trust,
accountability, attribution, disputes, or commercial records.

## Data classes

1. **User-owned replaceable catalog and payload data.** Hard-delete it only
   after the owner explicitly chooses `Delete permanently` and confirms the
   non-restorable action.
2. **Transient delivery machinery.** Compact placements, leases, pacing state,
   message/media URLs, and other delivery payload after effective expiry when
   the bounded maintenance policy permits it.
3. **Immutable or regulated history.** Never hard-delete it merely because it
   expired. This includes Trust Events, exposure and accounting evidence,
   completed trades, financial evidence, and governance evidence.

## Reference-aware media rule

A physical local or R2 object may be deleted only after the database transaction
commits and only when no surviving product, shop, diary entry, Spotlight version
or placement, Vault offer, or profile references the same canonical managed
object. Query strings and equivalent encodings must not bypass that reference
check. Local paths must remain inside the marketplace upload root, R2 keys must
remain inside the configured marketplace namespace and bucket, and external or
otherwise unmanaged URLs are never deleted by GSN cleanup.

Physical deletion is carried by a durable, bounded retry queue committed in the
same transaction as the payload retirement. A failed storage call remains
pending with its attempt/error record. A completed or safely retained task is
removed so the queue does not itself become permanent clutter.

## Current product behavior

Shop Gallery Tools and Vault Control offer the exact current shop owner
`Delete permanently`. Permanent deletion requires confirmation, removes the
product row and reposts, detaches the deleted catalog key from surviving
immutable evidence, clears stale frontend media state, and queues only
unreferenced GSN-managed local/R2 objects for deletion. It has no restore path.
A needed item must be uploaded again. Legacy hidden rows may be cleared
permanently but cannot be restored. Former sellers, admins, and visitors do not
inherit this irreversible owner authority.

Deleting a Vault-private product scrubs its offer media, caption, and owner
note, revokes active access links, and preserves only minimal archived/link
audit rows. A malformed link without an exact product scope fails closed.
Deleting a product linked to a live Spotlight withdraws that campaign and
compacts its delivery payload in the same database transaction so the deleted
content cannot continue rotating.

## Current Spotlight behavior

A bounded backend maintenance pass compacts only expired delivery payload:
placements, leases, pacing state, message/media URLs, and unreferenced managed
objects. It records `payload_compacted_at` for idempotency while retaining
campaign identity, fingerprints, version chronology, and exposure evidence.
Compaction changes no rotation, qualification, payment, or expiry clock. The
hourly production pass also retries pending managed-media deletion tasks and
logs both successful work and failures.

## Future-feature checklist

Every new deletion or retention feature must define:

- its data classification;
- precise owner-facing wording and confirmation behavior;
- a complete reference map for stored media;
- transactional database deletion or detachment;
- durable, bounded, reference-aware object-cleanup retries;
- an idempotent completion marker;
- a bounded maintenance worker where background cleanup is needed;
- audit-safe tests proving retained evidence and safe retries; and
- an explicit rule that expiry alone does not permit destruction of legal,
  trust, financial, governance, attribution, or commercial evidence.

## Devil's-advocate note

Deleting every expired row would reduce storage, but it would also corrupt
attribution, dispute handling, trust integrity, and commercial history. Minimal
evidence rows are tiny compared with media payload and are intentionally
retained.
