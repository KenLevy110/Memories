# Memories — product requirements v1.1 (Dashboard launch integration)

## Document control

| Field | Value |
| --- | --- |
| **Title** | Memories v1.1 — Dashboard handoff (launch + return) |
| **Author** | Ken Levy + AI draft |
| **PM / owner** | Ben Cerezo (confirm) |
| **Status** | Draft |
| **Version** | 0.1 |
| **Edition** | **v1.1** — additive slice; does **not** replace **Approved** [product-requirements-v1.md](product-requirements-v1.md). |
| **Last updated** | 2026-05-15 |
| **Template used** | `docs/templates/product-requirements-template.md` |
| **Related docs** | [product-requirements-v1.md](product-requirements-v1.md); [technical-design-v1.md](technical-design-v1.md); [development-plan-v1.1.md](development-plan-v1.1.md); **Cross-repo contract:** [../Dashboard/docs/memories-integration-contract-v1.1.md](../Dashboard/docs/memories-integration-contract-v1.1.md); [../Dashboard/docs/product-requirements-v1.1.md](../Dashboard/docs/product-requirements-v1.1.md) |

---

## 1. Who it is for

- **Primary:** Engineering implementing **Memories** APIs and web changes so **Dashboard** (Ohana internal) can **open the Memories web app** for a **`client_id`** in **same-tab** and return via **Back to Dashboard**.
- **Secondary:** QA and security reviewers validating S2S trust, URL safety, and PHI-safe logging on the new path.

---

## 2. Executive summary

- **Problem:** Dashboard v1.1 needs a **supported** way to move an authenticated internal Guide from **Dashboard** into **Memories** for real capture work, without duplicating capture UX in Dashboard.
- **Solution (Memories):** Implement **launch session minting** (server-to-server from Dashboard) that returns a **`redirect_url`** consumable by the browser; establish **Memories web session** suitable for **multi-hour** use; expose **Back to Dashboard** using **`DASHBOARD_WEB_BASE_URL`**.
- **Contract source of truth (wire format):** **[../Dashboard/docs/memories-integration-contract-v1.1.md](../Dashboard/docs/memories-integration-contract-v1.1.md)** — this PRD states **Memories-owned acceptance**; if the contract file disagrees during implementation, **update the contract in Dashboard** and mirror the decision here in revision history.

---

## 3. Goals and non-goals

### 3.1 Goals

- **G-M1:** Memories exposes a **versioned** HTTP API for **launch minting** per contract v1.1.
- **G-M2:** **`redirect_url`** is **HTTPS** in prod, **short-lived / single-use**, and does not embed long-lived secrets.
- **G-M3:** Memories web supports **Back to Dashboard** to configured base URL.
- **G-M4:** Service-to-service authentication for mint is **fail-closed** and **secret-managed** (GCP).
- **G-M5:** Logs remain **PHI-safe** (no transcript/audio in logs; no raw launch URL secrets).

### 3.2 Non-goals

- Replacing or rewriting core **Memories v1** capture PRD scope ([product-requirements-v1.md](product-requirements-v1.md)).
- Dashboard shell, Google sign-in for Dashboard, or Notion SoR (Dashboard v1.1 PRD).
- Full **audit** table for “who launched” (deferred; see Dashboard PRD v1.1).

---

## 4. Functional requirements (Memories)

IDs use prefix **FR-MI-** (Memories integration) to avoid collision with main **FR-** table in v1.

| ID | Requirement |
| --- | --- |
| **FR-MI-01** | Given a valid **S2S** request from Dashboard, Memories **mints** a launch consumable and returns **`redirect_url`** + **`expires_at`** per contract. |
| **FR-MI-02** | Given an invalid `client_id` / `practice_id` / actor, Memories returns **`403`** without leaking internals. |
| **FR-MI-03** | Launch consumable is **one-time** or **TTL-bounded** per contract (target ≤ 10 minutes unless jointly revised). |
| **FR-MI-04** | After successful navigation, Memories web establishes session so the Guide can work **≥ 2 hours** without depending on Dashboard session (align Dashboard PRD **G6**). |
| **FR-MI-05** | Memories web shows **Back to Dashboard** and navigates to **`DASHBOARD_WEB_BASE_URL`** from environment. |
| **FR-MI-06** | Rate limit or abuse controls exist on mint endpoint (**429** acceptable). |

---

## 5. Non-functional requirements

| ID | Category | Requirement |
| --- | --- | --- |
| **NFR-MI-01** | Security | S2S credential stored in **Secret Manager**; rotation path documented. |
| **NFR-MI-02** | Privacy | No PHI payload logging on mint path; redact query tokens from logs. |
| **NFR-MI-03** | Reliability | Mint P95 within jointly agreed budget (see Dashboard **NFR-14**); timeouts return safe errors. |

---

## 6. Dependencies

- Dashboard implements **orchestration** and same-tab navigation ([../Dashboard/docs/development-plan-v1.1.md](../Dashboard/docs/development-plan-v1.1.md) **T15**, **T16**).
- Sibling repo layout: `../Dashboard` from this repo’s root (adjust links if monorepo layout differs).

---

## 7. Revision history

| Version | Date | Notes |
| --- | --- | --- |
| 0.1 | 2026-05-15 | Initial slice PRD; contract normative in Dashboard `memories-integration-contract-v1.1.md`. |
