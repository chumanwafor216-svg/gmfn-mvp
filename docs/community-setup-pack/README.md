# GSN Community Setup Pack

Document date: 2026-09-14
Pack status: Maintained source pack for community setup and deployment-stage handover.
Authenticity mark: GSN original community setup material, source-controlled in `gmfn_mvp/docs`.

This folder is the control room for the materials used when GSN sets up a Community Domain, school, church, NGO, cooperative, market group, family association, diaspora group or similar member body.

Use this pack when a group asks:
- what GSN does in real life
- what they must set up first
- what leaders receive
- what members receive
- which stories or examples fit their type of organisation
- which documents can be sent as the client handover pack

## Source Materials

The reusable source materials live here:
- `../gsn-user-guide/GSN_SELF_SERVICE_USER_GUIDE.md`
- `../gsn-user-guide/GSN_FEATURE_INVENTORY_AUDIT.md`
- `../gsn-user-guide/GSN_FEATURE_INVENTORY.json`
- `../gsn-user-guide/GSN_FEATURE_INVENTORY.csv`
- `../gsn-user-guide/GSN_FEATURE_DEPENDENCY_AND_SETUP_MAP.md`
- `../gsn-user-guide/GSN_ROUTE_AND_RECOVERY_MAP.md`
- `../gsn-user-guide/GSN_SCREENSHOT_MANIFEST.md`
- `../gsn-user-guide/real-life-capability-bank/capabilities.jsonl`
- `../gsn-user-guide/real-life-capability-bank/GSN_IN_REAL_LIFE_MASTER_CAPABILITY_BANK.md`
- `../gsn-user-guide/real-life-capability-bank/GSN_IN_REAL_LIFE_SELECTION_MAP.json`
- `../gsn-user-guide/real-life-capability-bank/GSN_IN_REAL_LIFE_SELECTION_MAP.csv`

## Distribution Copies

The client-facing copies live beside their Markdown sources as `.docx` and `.pdf` renders. They should carry a dated title and an authenticity/footer or watermark mark before being sent outside the project.

Do not create a fresh one-off pack when a client asks for setup material. Update the source file, rebuild the distribution copy, and record the change here.

## Pack Files

- `GSN_COMMUNITY_SETUP_DEPLOYMENT_PACK_INDEX_2026-09-14.md`: master index and deployment-stage use map.
- `GSN_COMMUNITY_SETUP_CLIENT_HANDOVER_MAP_2026-09-14.md`: what to send to leaders, admins, members and external supporters.
- `GSN_COMMUNITY_SETUP_STORY_BANK_2026-09-14.md`: reusable audience stories and examples.
- `GSN_DOCUMENT_AUTHENTICITY_AND_WATERMARK_STANDARD_2026-09-14.md`: naming, title and watermark/authenticity rules.
- `pack_manifest.json`: machine-readable list of pack assets and their roles.

## Update Rule

When the product changes, update in this order:
1. Update the live-status guide or capability JSON source.
2. Regenerate the Markdown, DOCX and PDF distribution copies.
3. Apply the distribution titles and authenticity marks with `python docs/community-setup-pack/tools/build_distribution_documents.py`.
4. Update the pack index and manifest if files are added, renamed or retired.
5. Record the change in `../HANDOFF_NOTES.md`.


## QR Transfer Pack

The pack now includes phone-friendly QR transfer material:
- `GSN_COMMUNITY_SETUP_QR_DOWNLOAD_INDEX_2026-09-14.md`
- `GSN_COMMUNITY_SETUP_QR_DOWNLOAD_INDEX_2026-09-14.docx`
- `GSN_COMMUNITY_SETUP_QR_DOWNLOAD_INDEX_2026-09-14.pdf`
- `qr-codes/*.png`

Each generated self-service or real-life distribution DOCX/PDF also ends with a `Scan to download this GSN article` page. Use that page when a printed or forwarded copy needs to move quickly onto a phone.

Truth boundary: the QR codes currently point to GitHub `main` URLs. That keeps them upgradeable, but external recipients can use them only if the repository files are public or the same URLs are mirrored to a public download location. For private client distribution, replace the URLs with approved public hosting links before regenerating.

## Builder
Run this after source material changes:

```powershell
python docs\community-setup-pack\tools\build_distribution_documents.py
```

This builder applies strong dated titles, Markdown source marks, DOCX footer/watermark XML, and PDF footer/diagonal watermark treatment to the maintained distribution copies.

Visual DOCX render QA still requires the document render stack (`pdf2image`, Poppler, and LibreOffice/soffice). If that stack is unavailable, treat DOCX/PDF checks as structural only and do not claim visual page QA.

Truth boundary: this pack explains and packages GSN. It does not prove that every feature is live for every client, that every external app accepts a link, or that every member completed a real action. Always check the live setup/status guide before making public claims.
