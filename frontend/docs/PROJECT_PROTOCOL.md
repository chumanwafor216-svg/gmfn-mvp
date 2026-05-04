# Project Protocol

## Required Reading Law

Before changing code in this frontend workspace, read the protocol files that exist for the affected lane.

At minimum, read:

1. `README.md`
2. `docs/PROJECT_PROTOCOL.md`
3. `docs/FREEZE_POLICY.md`
4. `docs/HANDOFF_NOTES.md`

For media, Shop Gallery, or Spotlight work, also read:

1. `docs/MEDIA_PREP_PROTOCOL.md`
2. `docs/CONTROL_SURFACE_PROTOCOL.md`
3. `docs/SHOP_GALLERY_FREEZE.md`
4. `docs/FREE_SPOTLIGHT_FREEZE.md`
5. `docs/VAULT_CONTROL_FREEZE.md` when the work touches Vault

If a protocol file is missing, record that truth before changing code. Do not pretend the rule was checked.

## System-Level Rule

Do not repair a repeated problem only inside one page when the product already has a shared helper, shared component, shared route contract, or frozen lane document.

Use shared/system-level logic for:

- media preparation,
- native file-picker behavior,
- video playback and audio unlock,
- button/tap-target stability,
- blocker messages,
- frozen route behavior.

Page-local fixes are allowed only when the behavior is truly unique to that page.

## Freeze Rule

Before freezing a lane, audit:

- duplicate UI surfaces,
- buttons that disappear, change size, or stop explaining blockers,
- media picker behavior,
- public display behavior,
- route aliases and deep links,
- whether backend truth still blocks a complete freeze.

The freeze file must name what is frozen and what remains a known backend or product risk.
