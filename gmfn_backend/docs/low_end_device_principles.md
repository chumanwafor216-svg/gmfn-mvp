# GMFN Low-End Device & Poor Network Principles

## Target Reality
GMFN is designed for:
- unbanked / underbanked communities
- low-cost Android devices
- intermittent 2G/3G/4G connectivity
- WhatsApp-first information sharing
- merchants who may not log in or install apps

## UI/UX Principles
1) **Text-first**
- verification must work as text and simple HTML
- QR is optional, not required

2) **No-JS core flows**
- TrustSlip verify page must work without JavaScript
- Avoid heavy single-page flows for merchants

3) **Small payloads**
- Public verify JSON is minimal (no nested blobs)
- Default limit small (e.g., last 5–10 events when needed)

4) **Offline-friendly**
- Include verified_at in public verify
- Encourage screenshot as fallback
- Provide lite page with big text

5) **WhatsApp-first**
Provide copy/paste bundles:
- verify link
- code only
- short merchant instructions

## Network & Caching
- Use `Cache-Control: no-store` for verification pages
- Avoid stale verification on shared devices

## Merchant Language
Use humane, direct status labels:
- VALID — OK TO RELEASE GOODS
- EXPIRED — DO NOT RELEASE
- REVOKED — DO NOT RELEASE
- FROZEN — CONTACT ADMIN

Avoid jargon like “credit limit” or “KYC”.

## Practical Constraints
- camera permissions may be blocked; QR must not be required
- screen glare and cracked screens; use high contrast + large font
- power cuts; flows must resume from code + screenshot