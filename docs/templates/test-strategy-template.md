# Test strategy — how to create this document

Use this template for a **feature- or release-scoped** test strategy when you need more detail than fits in the technical design or development plan. It complements repo-wide policy in `AGENTS.md` and CI; it does not replace them.

**Do not** paste a strategy from another product wholesale. Adapt scope, risks, and commands to **this** initiative and repository.

**Template used (for derived docs):** record `docs/templates/test-strategy-template.md` in document control (or equivalent metadata) per [documentation governance](../../.cursor/rules/docs-governance.mdc).

---

## Document control

| Field | Value |
| --- | --- |
| **Feature / release** | [Name] |
| **Owners** | [Names] |
| **Date** | [YYYY-MM-DD] |
| **Related PRD / TDD / issues** | [Links or IDs] |
| **Related ADR index** | [adr/README.md](adr/README.md) |
| **Template used** | `docs/templates/test-strategy-template.md` |

---

## 1) Scope and risk

- **In scope:**
- **Out of scope:**
- **Critical user journeys:**
- **High-risk areas:**

---

## 2) Test levels and ownership

- **Unit tests:**
  - Owner:
  - Focus:
- **Integration tests:**
  - Owner:
  - Focus:
- **End-to-end tests:**
  - Owner:
  - Focus:
- **Non-functional (performance / accessibility / security):**
  - Owner:
  - Focus:

---

## 3) Security test plan

- **Threat model updated?** (Yes / No)
- **AuthN / AuthZ test scenarios:**
- **Input validation and injection test scenarios:**
- **Sensitive data handling and logging checks:**
- **Dependency vulnerability checks:**

---

## 4) Test environment matrix

| Environment | Purpose | Data setup | Notes |
| --- | --- | --- | --- |
| Local | Developer checks | | |
| CI | Merge gate | | |
| Staging | Pre-release verification | | |

---

## 5) Coverage and pass criteria

- **Required checks:**
  - [ ] Lint
  - [ ] Typecheck
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] E2E smoke
  - [ ] Security workflow
- **Coverage thresholds:** Default to **`AGENTS.md`** (typically **≥ 80%** statements/lines repo-wide and **≥ 80%** lines on changed non-trivial files, with branch targets as documented there). Record any approved exception with owner and expiry here.
- **Exit criteria for release:**

---

## 6) Regression and rollback readiness

- **Existing regression suite updated:**
- **New regression cases added:**
- **Manual smoke checklist:**
- **Rollback validation steps:**
- **Health / readiness probes:** [Staging (or production) checks that liveness/readiness responses match the technical design §6.1 contract—paths, status codes, and dependency depth—after deploy or config changes.]

---

## 7) Open issues and waivers

- **Known defects:**
- **Temporary waivers (owner + expiry):**
- **Follow-up work:**
