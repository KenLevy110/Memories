# Memories — development plan v1.1 (Dashboard launch integration)

## 0. How to use this document

**Purpose:** Executable slice for **Memories** to satisfy **[product-requirements-v1.1.md](product-requirements-v1.1.md)** and the cross-repo **[../Dashboard/docs/memories-integration-contract-v1.1.md](../Dashboard/docs/memories-integration-contract-v1.1.md)**.

This plan **does not supersede** [development-plan-v1.md](development-plan-v1.md) (Memories v1). Track cross-repo sequencing with Dashboard [development-plan-v1.1.md](../Dashboard/docs/development-plan-v1.1.md) (**T14** ↔ **MI** tickets below).

---

## 1. Document control

| Field | Value |
| --- | --- |
| **Title** | Memories v1.1 — Dashboard launch integration |
| **Version** | 0.1 |
| **Author** | Ken Levy + AI draft |
| **Date** | 2026-05-15 |
| **Status** | Draft |
| **Release** | v1.1 slice (internal pilot; ships with Dashboard v1.1) |
| **Template used** | `docs/templates/development-plan-template.md` |

---

## 2. Linked inputs

| Artifact | Location |
| --- | --- |
| **PRD (this slice)** | [product-requirements-v1.1.md](product-requirements-v1.1.md) |
| **Memories v1 PRD / TDD** | [product-requirements-v1.md](product-requirements-v1.md); [technical-design-v1.md](technical-design-v1.md) |
| **Cross-repo contract (normative wire)** | [../Dashboard/docs/memories-integration-contract-v1.1.md](../Dashboard/docs/memories-integration-contract-v1.1.md) |
| **Dashboard PRD / plan** | [../Dashboard/docs/product-requirements-v1.1.md](../Dashboard/docs/product-requirements-v1.1.md); [../Dashboard/docs/development-plan-v1.1.md](../Dashboard/docs/development-plan-v1.1.md) |
| **Tech stack** | [tech-stack.md](tech-stack.md) |
| **Implementation log** | [implementation-log.md](implementation-log.md) |
| **ADR index** | [adr/README.md](adr/README.md) |
| **Baseline plan** | [development-plan-v1.md](development-plan-v1.md) — **v1.1 slice is additive** |

---

## 3. Executive summary

- **Delivery goal:** Ship **launch mint** + **Memories web** handling of **`redirect_url`** + **Back to Dashboard**, with **S2S auth**, **PHI-safe** logging, and tests—so Dashboard can complete **T14–T16** against a real Memories environment.
- **Quality bar:** Match repo gates (`npm run lint`, `npm run typecheck`, `npm run test`); **`developer-security`** on S2S and URL/token handling; add ADR for chosen S2S mechanism.

---

## 4. Scope

| In scope | Out of scope |
| --- | --- |
| Mint API + S2S verification | Notion, Dashboard UI, Google IdP for Dashboard |
| Web route handler for consumable launch + session | Rewriting core capture stepper from v1 |
| `DASHBOARD_WEB_BASE_URL` + Back control | New Memories product tabs unrelated to launch |

---

## 5. Assumptions

- Sibling checkout: **`../Dashboard`** exists for human review of contract docs (links may 404 in CI mirror—acceptable).
- **S2S mechanism** chosen and recorded in contract v1.1 table + ADR before prod (**mTLS** vs **HMAC** vs **service JWT**).

---

## 6. Work breakdown

### 6.1 Epics

| ID | Epic | Goal | PRD refs |
| --- | --- | --- | --- |
| **E-M1** | Launch mint API | S2S mint endpoint + errors + limits | FR-MI-01–03, 06 |
| **E-M2** | Web launch + return | Consume launch; session; Back to Dashboard | FR-MI-04–05 |

### 6.2 Ticket map

| Ticket | Title | Epic | Depends on | Owner lane | Est |
| --- | --- | --- | --- | --- | --- |
| **MI1** | Add S2S-authenticated launch-mint route in `apps/api` | E-M1 | — | backend + security | M |
| **MI2** | Persist/revoke launch consumable + rate limits | E-M1 | MI1 | backend + database | S |
| **MI3** | Web: handle launch entry + establish session | E-M2 | MI1 | frontend-ui + security | M |
| **MI4** | Web: Back to Dashboard + env `DASHBOARD_WEB_BASE_URL` | E-M2 | MI3 | frontend-ui | S |
| **MI5** | Tests, smoke notes, implementation-log + ADR for S2S | E-M1, E-M2 | MI1–MI4 | unit-testing + manager | S |

---

## 7. Sequencing and milestones

| Milestone | Outcome | Tickets |
| --- | --- | --- |
| **M-M1** | Mint API testable from Dashboard stub/curl | MI1, MI2 |
| **M-M2** | End-to-end browser launch + back with Dashboard web | MI3, MI4, MI5 |

---

## 8. Testing plan

- Unit/integration: mint auth deny, TTL/one-time consumption, 429 behavior.
- Manual: same-tab from Dashboard dev env; **Back** returns to configured Dashboard URL.
- Cross-repo: run Dashboard **`smoke:connectivity`** (or agreed successor) once both sides deployed.

---

## 9. Rollback

- Feature flag mint route off in Memories API; Dashboard already has launch feature flag pattern.

---

## 10. Traceability

| PRD | Tickets |
| --- | --- |
| FR-MI-01–03, 06 | MI1, MI2, MI5 |
| FR-MI-04–05 | MI3, MI4, MI5 |

---

## 12. Sequenced prompts (AI-assisted)

### Session defaults

- Read **`AGENTS.md`** (or repo equivalent), **`developer-testing`**, **`developer-code-quality`** before review.

### 12.1 Skill-reading

Add **`developer-senior`** for **MI1** (trust boundary).

### 12.2 Per-ticket prompts

#### Prompt MI1 — Launch mint route + S2S auth

Implement the mint HTTP handler per **[../Dashboard/docs/memories-integration-contract-v1.1.md](../Dashboard/docs/memories-integration-contract-v1.1.md)**; verify S2S credential; return `redirect_url` + `expires_at`; fail closed; no secrets in logs.

**Skills to read first:** `developer-backend`, `developer-security`, `developer-unit-testing`, `developer-senior`

**Verify:** `npm run test --workspace=@memories/api` (or repo test entry) green; new tests for allow/deny.

---

#### Prompt MI2 — Launch consumable persistence + rate limits

Store consumable server-side (or signed strategy per ADR); enforce one-time/TTL; return **429** when over limit.

**Skills to read first:** `developer-backend`, `developer-database`, `developer-security`, `developer-unit-testing`

**Verify:** tests cover expiry and replay rejection.

---

#### Prompt MI3 — Web launch entry + session

Route handler for launch path established in mint URL; establishes Memories session per **FR-MI-04**.

**Skills to read first:** `developer-frontend-ui`, `developer-frontend-data-sync`, `developer-security`, `developer-unit-testing`

**Verify:** `npm run test --workspace=@memories/web` where applicable; manual launch from Dashboard.

---

#### Prompt MI4 — Back to Dashboard

Add control per **FR-MI-05**; read `DASHBOARD_WEB_BASE_URL`; safe navigation.

**Skills to read first:** `developer-frontend-ui`, `developer-security`

**Verify:** manual back navigation on staging/prod config.

---

#### Prompt MI5 — ADR + implementation log + smoke checklist

Document S2S choice in `docs/adr/`; update [implementation-log.md](implementation-log.md); add short **smoke** subsection to [infrastructure.md](infrastructure.md) or linked runbook.

**Skills to read first:** `developer-manager`, `developer-backend`, `developer-quality-assurance`

**Verify:** links from Dashboard contract to final path and env keys are accurate.

---

### 12.3 Standard test commands

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`

---

### 12.4 Epic review matrix

| Epic | Tickets | Reviewers | Done gate |
| --- | --- | --- | --- |
| E-M1 | MI1, MI2, MI5 | Sec, Sr | Mint path green in CI + contract aligned |
| E-M2 | MI3, MI4, MI5 | Sec, QA | Manual E2E with Dashboard |

---

### 12.5 Manual matrix

| Scenario | Tickets | Expected |
| --- | --- | --- |
| Valid mint | MI1 | 201 + HTTPS redirect_url in prod |
| Bad S2S | MI1 | 401 |
| Replay launch token | MI2 | second use fails closed |
| Back to Dashboard | MI4 | lands on configured Dashboard base |

---

### 12.6 Mobile automation

Mirror Dashboard v1.1 plan: manual **iPhone Safari** + **Android Chrome** for launch + back until Playwright mobile projects cover this path.

---

## 13. Revision history

| Version | Notes |
| --- | --- |
| 0.1 | Initial v1.1 slice plan for Dashboard launch integration. |
