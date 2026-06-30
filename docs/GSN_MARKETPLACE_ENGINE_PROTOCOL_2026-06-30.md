# GSN Community Domain Engine

## Protocol 9 - Marketplace Engine Protocol

**Version:** 1.0
**Status:** Core Marketplace Protocol
**Audience:** Codex Developers, Product Architects, Community Administrators

---

## Related Protocols

Protocol 10, `docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md`,
defines how Community Finance consumes Merchant Release Rail records where
financial agreements involve commerce, without duplicating workflows or turning
Marketplace into a payment processor.

---

## 1. Purpose

The Marketplace Engine is the commercial layer of GSN.

Its purpose is not simply to list products.

Its purpose is to enable trusted commerce inside and across Community Domains
using the Trust Infrastructure already established by GSN.

The Marketplace Engine works together with:

- Community Domains;
- Trust Passport;
- TrustSlip;
- Merchant Verification;
- Opportunity Engine;
- Merchant Release Rail.

It must never operate independently of the Trust Infrastructure.

---

## 2. Constitutional Principle

Commerce creates Trust Events.

Trust creates better commerce.

The Marketplace exists to strengthen both.

---

## 3. Marketplace Components

The Marketplace Engine consists of:

- Public Shops;
- Vault;
- Product Catalogue;
- Categories;
- Merchant Verification;
- Shop Search;
- Shop Following;
- Merchant Profiles.

Community Settings only configure how these are used.

The engine itself remains unchanged.

---

## 4. Public Shops

Every member may own one Shop according to GSN rules.

A Shop belongs to:

- the Member.

Not the Community Domain.

However, the Shop may be visible inside one or more Community Domains.

Example:

```text
Chuma Electronics

Visible In:
- Onitsha Main Market
- ICA Aberdeen
- RCCG Parish
- Public Marketplace
```

The same Shop can serve multiple communities.

---

## 5. Community Visibility

Community Domains decide:

- Allow Public Shops;
- Community-only Shops;
- Internal Marketplace;
- Public Marketplace;
- Mixed Marketplace.

Visibility Rules are configured through Community Settings.

---

## 6. Vault

Vault is a private commercial space.

Purpose:

- allow merchants to share products only with selected people.

Examples:

- Wholesale catalogue;
- Premium stock;
- Confidential quotation;
- Business-only inventory.

Vault does not replace Shops.

It complements them.

---

## 7. Merchant Verification

Merchant Verification answers:

> Is this merchant recognized within this Community Domain?

Merchant Verification may include:

- Community recognition;
- Membership confirmation;
- Merchant history;
- Trading history;
- Verification responses.

Every verification response creates a Trust Event.

---

## 8. Product Lifecycle

Every product follows:

```text
Created
-> Published
-> Visible
-> Viewed
-> Interested
-> Negotiated
-> Completed
-> Archived
```

Completion generates Trust Events where applicable.

---

## 9. Categories

Marketplace categories remain global.

Examples:

- Electronics;
- Food;
- Building Materials;
- Fashion;
- Services;
- Agriculture;
- Healthcare.

Community Domains may choose which categories are visible.

They do not create separate marketplace engines.

---

## 10. Search

Search supports:

- Product;
- Shop;
- Merchant;
- Category;
- Community Domain;
- Trust Filters.

Example filters:

- Verified Merchant;
- Community Verified;
- Followers;
- Nearby;
- Trusted Commerce Only.

---

## 11. Merchant Profile

Merchant Profile should include:

- Shop Name;
- Community Domains;
- Merchant Verification Status;
- Trust Passport Summary;
- TrustSlip, where shared;
- Product Categories;
- Followers;
- Recent Activity.

The profile represents the merchant's commercial identity.

---

## 12. Trusted Commerce

The Marketplace Engine integrates with:

```text
Trust Passport
-> TrustSlip
-> Merchant Verification
-> Merchant Release Rail
-> Community Verification
```

This reduces uncertainty before transactions.

---

## 13. Cross-Community Commerce

Members from different Community Domains may trade.

Example:

```text
Church Member
-> Buys From
-> Market Trader
-> Verified Through
-> GSN Trust Infrastructure
```

Commerce is therefore not restricted to one Community Domain.

Trust travels with the member.

---

## 14. Marketplace Trust Events

Examples:

- Shop Created;
- Product Published;
- Merchant Verified;
- Merchant Release Completed;
- Product Delivered;
- Transaction Confirmed;
- Dispute Resolved.

These become part of the Trust Evidence layer.

---

## 15. Merchant Release Rail

The Marketplace never holds customer funds.

Merchant Release Rail records:

- Agreement;
- Release instruction;
- Completion confirmation;
- Acknowledgement.

It is evidence infrastructure, not a payment processor.

---

## 16. Community Marketplace Rules

Community Settings may configure:

- Internal trading only;
- Public trading allowed;
- Merchant verification required;
- Vault available;
- Spotlight integration;
- Demand Box integration.

Configuration must never alter the Marketplace Engine itself.

---

## 17. Marketplace Analytics

The engine records:

- Shop views;
- Product views;
- Follower growth;
- Demand matches;
- Successful completions;
- Merchant verification requests;
- Community commerce activity.

Analytics inform decisions but do not create trust.

---

## 18. Coders Must Never

Coders must never:

- build separate marketplace systems for different Community Domains;
- tie Shops permanently to one Community Domain;
- allow deletion of completed commercial history without an audit trail;
- treat transaction volume as Trust.

---

## 19. Coders Must Always

Coders must always:

- preserve provenance;
- preserve commercial history;
- preserve Community context;
- generate Trust Events from completed commercial interactions;
- integrate Marketplace with the Trust Infrastructure.

---

## Constitutional Statement

The Marketplace Engine is not an isolated e-commerce platform.

It is the commercial expression of the GSN Trust Infrastructure.

Shops create opportunity.

Trust reduces uncertainty.

Merchant Verification provides context.

Merchant Release Rail preserves evidence.

Together they enable trusted commerce across Community Domains while keeping the
core Marketplace Engine universal and configurable.
