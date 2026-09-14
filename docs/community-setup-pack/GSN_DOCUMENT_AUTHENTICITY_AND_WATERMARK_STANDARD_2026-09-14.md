# GSN Document Authenticity and Watermark Standard

Document date: 2026-09-14
Pack: GSN Community Setup Pack
Authenticity mark: GSN original community setup material, source-controlled in `gmfn_mvp/docs`.

## Purpose

GSN setup documents should look like original, maintained material, not loose drafts with weak titles. Every distributable paper should carry a strong title, date, source line and authenticity mark.

## Title Standard

Use this structure:

`GSN Community Setup Pack: [Document Purpose or Audience] ([YYYY-MM-DD])`

Examples:
- `GSN Community Setup Pack: What to Set Up, What It Does, and How to Use It (2026-09-14)`
- `GSN Community Setup Pack: GSN in Real Life Master Capability Bank (2026-09-14)`
- `GSN Community Setup Pack: Church and Faith Group Real-Life Copy (2026-09-14)`
- `GSN Community Setup Pack: Cooperative, Market and Business Network Real-Life Copy (2026-09-14)`

Avoid:
- `Copy`
- `Master`
- `Guide`
- `Final`
- `New version`
- any title that does not say GSN, purpose and date

## Authenticity Mark

Use this default text:

`GSN Original Community Setup Material | Source-controlled in gmfn_mvp/docs | Document date: 2026-09-14`

For Markdown:
- include the mark near the top of the document.

For DOCX:
- include a running footer or header authenticity line.
- use a light watermark when the document is meant for external distribution.

For PDF:
- include a faint diagonal watermark or visible footer authenticity line.

## Version Discipline

When a document is updated:
1. Update the document date.
2. Update the source Markdown/JSON/CSV.
3. Regenerate DOCX/PDF.
4. Keep old dates only when preserving an archive.
5. Record the change in `../HANDOFF_NOTES.md`.

## Truth Boundary

An authenticity mark proves source discipline. It does not prove legal ownership, prevent forwarding, replace signed contracts, or guarantee that an old copy has not been modified outside GSN.
