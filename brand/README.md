# Legacy — brand assets

**Purpose:** Canonical vectors and designer-facing notes for **Legacy** — capture that honors what matters in an elder’s life (photos, voice, transcripts; elder-friendly flows). This folder is **not** the web root; the Vite app serves icons from [`apps/web/public/`](../apps/web/public/).

**Master symbol:** [`symbol-master.svg`](./symbol-master.svg) — picture frame (dark molding, sage mat, cream field, heart); tuned for **16×16**. **Full lockup:** [`logo-full-color.svg`](./logo-full-color.svg) — wordmark **Legacy** plus the same icon.

**Workflow:** Edit masters here first, then copy or re-export into `apps/web/public/` (favicon, PWA, in-app chrome). Regenerate raster favicons when you add an ICO/PNG pipeline.

---

## Voice and positioning

- **What we are:** A calm, trustworthy place to **preserve moments** before letting go of objects — pictures, voice, and text working together.
- **Tone:** Plain language, warm neutral, never playful at the expense of clarity (**NFR-012**). Prefer reassurance over hype (“Saved,” “We’ll finish when you’re online”).
- **Visual bias:** Soft contrast, generous spacing, large tap targets; avoid loud gradients or fashion-palette churn on core flows.

---

## Color tokens (initial)

Use these as the default UI pairing until design ships a full palette in wireframes or hi-fi.

| Token | Hex | Role |
| --- | --- | --- |
| **Brand / primary surface** | `#2f5d50` | Symbol, key actions, focused chrome |
| **Brand wash / canvas** | `#eef4f1` | App background tints, symbol backdrop |
| **Mat (sage)** | `#d4e4dc` | Lockup mat inside dark green frame |
| **Opening / paper** | `#faf8f5` | Lockup inner field behind heart |
| **Legacy accent (warm)** | `#b86b5c` | Lockup heart |
| **Neutral text** | `#444`–`#666` | Body and secondary copy on light surfaces |

Dark mode: derive by lowering saturation of `#2f5d50` and deepening the wash; keep WCAG contrast on body text per [design-wireframe-v1.md](../docs/design-wireframe-v1.md) and TDD accessibility notes.

---

## Deliverables checklist

| Deliverable | Role | Master file |
| --- | --- | --- |
| **Symbol** | Favicon, PWA, compact UI | `symbol-master.svg` |
| **Full logo** | Marketing, sign-in hero (“Legacy” + frame mark) | `logo-full-color.svg` |
| **Monochrome** | Small sizes, print, email | *Add `logo-mono-dark.svg` / `logo-mono-light.svg` when needed* |
| **Favicon set** | Tab + touch icons | Optional `favicon-source.png`; sync [`apps/web/public/favicon.svg`](../apps/web/public/favicon.svg) with symbol |

**Constraints:** Geometry stays simple; detailed UI color rules stay aligned with [`docs/design-wireframe-v1.md`](../docs/design-wireframe-v1.md).

---

## After you change the symbol

1. Update every bundled duplicate (`apps/web/public/favicon.svg`, any inline marks, PWA sources).
2. Regenerate ICO/PNG and manifest icons if your pipeline uses rasters.
3. Confirm `apps/web/index.html` `<link rel="icon" …>` paths still resolve.

---

## Revision

| Date | Notes |
| --- | --- |
| 2026-04-30 | Imported `brand/` pattern from Ohana `cursor-template`; Legacy symbol, lockup, voice/color notes, favicon sync |
| 2026-04-30 | Unified symbol + favicon with Legacy frame + heart; product brand Legacy |
