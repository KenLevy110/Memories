# Transactional email and deliverability

**Magic-link** sign-in, **password-reset** links, and **list-invite** messages all depend on reliable delivery when `EMAIL_PROVIDER` is set. The API sends through **Resend**, **Postmark**, or **Amazon SES** via the shared helper `apps/api/src/email/send-transactional.ts` (magic-link code paths call it from `apps/api/src/auth/mailer.ts`; invites are queued in `email_outbox` and processed by `apps/api/src/email/outbox.ts`). Production containers and CI should set `EMAIL_PROVIDER` and the matching secrets; see root `.env.example`. **Invite** behavior (outbox, retries, accept URL) is specified in [technical-design-v1.1.md](technical-design-v1.1.md) **§9A** — the **MVP PRD** did **not** require invite email; **v1.1** **FR-V11-S01** makes it product-official.

---

## Environment variables (API)

| Variable | When |
| --- | --- |
| `EMAIL_PROVIDER` | `resend`, `postmark`, or `ses` for real sends; omit in dev/CI for console-only behavior |
| `EMAIL_FROM` | Required when `EMAIL_PROVIDER` is set (verified sender or domain in the provider) |
| `EMAIL_PROVIDER_API_KEY` | Resend API key or Postmark **Server API** token |
| `EMAIL_SUBJECT` | Optional; default “Your sign-in link” |
| `INVITE_EMAIL_SUBJECT` | Optional override for **list-invite** messages ([technical-design-v1.1.md](technical-design-v1.1.md) **§9A**) |
| `EMAIL_OUTBOX_TICK_MS` | Optional; background retry cadence for **`email_outbox`** (default 30s in code — see `.env.example`) |
| `AWS_REGION` | Required for `ses`; use standard AWS credential env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or instance/task role) |

Staging should run at least one **real** delivery check (see [technical-design-v1.md](technical-design-v1.md) **§11.3** when that section exists — and email deliverability risk; operator checklist [development-plan.md](development-plan.md) §10 when present).

---

## SPF, DKIM, and DMARC checklist

Use a **dedicated subdomain** for mail (for example `mail.example.com` or `lists.example.com`) and register the sender in the chosen provider before go-live.

### SPF

- [ ] Add a **single** SPF TXT record at the subdomain or root you send from (many providers publish `include:` directives — follow their wizard exactly).
- [ ] Avoid more than one SPF TXT record for the same name; merge includes if needed.
- [ ] After deploy, verify with your provider’s DNS checker or `nslookup`/online SPF validator.

### DKIM

- [ ] Enable DKIM in the provider and add the **CNAME** (or TXT) records they give you.
- [ ] Wait for DNS propagation; confirm “pass” in the provider dashboard or a test message’s raw headers.

### DMARC

- [ ] Publish `TXT` at `_dmarc.<your-domain>` (start with `p=none` to collect reports, then tighten to `quarantine` / `reject` when confident).
- [ ] Optionally add a **recipient** for aggregate (`rua`) and forensic (`ruf`) reports when your org uses them.

### Ongoing

- [ ] **HTTPS** link domain for magic links matches `WEB_ORIGIN` and looks legitimate (**NFR-01**).
- [ ] Monitor provider dashboards for bounces and complaint spikes; suppress invalid addresses as recommended by the provider.
- [ ] Optional later: bounce/complaint **webhooks** and address suppression (not required for MVP wiring in code).

---

## Related

- [technical-design-v1.md](technical-design-v1.md) — session / transactional mail (when specified)
- [technical-design-v1.1.md](technical-design-v1.1.md) **§9A** — invite email + outbox
- [development-plan.md](development-plan.md) v1.13 §10 (rollout: Resend, DNS)
- Root `Dockerfile` (API image) and `.github/workflows/migrate.yml` (database migrations)
