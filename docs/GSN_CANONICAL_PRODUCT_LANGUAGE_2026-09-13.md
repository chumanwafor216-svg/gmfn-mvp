# GSN Canonical Product Language - 2026-09-13

## Product-word rule

When a GSN product surface has become a named product, write it as one product word with its internal capital preserved. Do not split it into ordinary descriptive words in user-visible copy unless a legacy backend route, file name, API tag, or migration boundary requires the older spelling.

## Canonical spellings

- `DemandBox` - canonical user-visible spelling for the community demand and request engine. Use capital D and capital B, including inside sentences.
- `TrustSlip` - canonical user-visible spelling for the portable current-evidence trust paper.
- `TrustPassport` - canonical user-visible spelling for the fuller member/community trust story.

## Compatibility boundary

Existing internal route names, Python/TypeScript identifiers, database tables, file names, tests, and legacy docs may still contain older forms such as `Demand Box`, `Trust Passport`, or route names like `DemandBoxPage` and `marketplace_requests`. Do not rename those contracts casually. User-visible copy should move toward the canonical spellings during scoped product-language passes.

## Implementation boundary

A canonical language pass is separate from feature work. Do not mix broad product-word renaming with backend rule changes, permission changes, or UI redesign unless the owner explicitly requests that combined work.
