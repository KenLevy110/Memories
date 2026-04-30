# Transactional email and deliverability (Memories)

When Memories adds **magic links**, **password reset**, or other transactional email, delivery and domain reputation become release requirements. Product behavior and API env vars should stay authoritative in [technical-design-v1.md](technical-design-v1.md) and [product-requirements-v1.md](product-requirements-v1.md); this file is a **checklist** for operators.

Until an `EMAIL_PROVIDER` is chosen for this repo, you can skip implementation details below and keep this doc as a go-live reminder.

---

## Environment variables (typical API pattern)

When email is implemented, mirror the API’s `.env.example` for your provider (`resend`, `postmark`, `ses`, etc.), including at minimum:

| Variable | When |
| --- | --- |
| `EMAIL_PROVIDER` | Set for real sends; omit in dev/CI for console-only behavior if the codebase supports it |
| `EMAIL_FROM` | Required when sending — verified sender or domain in the provider |
| Provider API key / region | Per provider docs (never commit values; use secrets) |

---

## SPF, DKIM, and DMARC checklist

1. Use a **dedicated subdomain** for mail (for example `mail.example.com`) and register the sender in the chosen provider before go-live.
2. **SPF:** Publish a TXT record authorizing the provider’s outbound servers for that subdomain.
3. **DKIM:** Enable signing in the provider; publish the **DKIM** TXT records they supply.
4. **DMARC:** Start with `p=none` on a `_dmarc` TXT record for the mail subdomain, collect aggregate reports, then tighten (`quarantine` / `reject`) when bounces and spoofing risk are understood.
5. **Staging:** Send at least one real message through staging before production cutover; confirm headers, links, and bounce handling.

---

## Revision history

| Date | Notes |
| --- | --- |
| 2026-04-30 | Replaced list-app-specific content with Memories-oriented stub; operators should follow TDD/PRD when email ships. |
