# Architecture decision record (ADR) — how to create this entry

Use this template for **short, durable engineering decisions** that benefit from history and alternatives, especially when a full technical design update is not warranted.

**Do not** paste decisions from another organization’s ADR log without re-writing context and consequences for **this** system.

**Storage:** keep ADR files in `docs/adr/` and update `docs/adr/README.md` as the index.

**Template used (for each ADR file):** record `docs/templates/decision-log-template.md` in the ADR’s metadata (or equivalent) per [documentation governance](../../.cursor/rules/docs-governance.mdc).

---

## Decision metadata

- **Decision ID:** `ADR-YYYYMMDD-<slug>`
- **Date:**
- **Status:** Proposed | Accepted | Superseded | Deprecated
- **Owners:**
- **Related docs / issues / PRs:**
- **ADR index:** [adr/README.md](adr/README.md)
- **Template used:** `docs/templates/decision-log-template.md`

---

## Context

Describe the problem and constraints that require a decision.

---

## Decision

State the selected option clearly and concretely.

---

## Options considered

1. Option A
2. Option B
3. Option C (optional)

---

## Trade-offs

- **Benefits:**
- **Risks:**
- **Cost or complexity impact:**

---

## Consequences

Describe what changes now, and what follow-up actions are required.

---

## Rollback / reversal plan

Describe how to revert this decision if it does not work in production.
