# Product requirements — how to create this document

Use this file as the **shape and checklist** for `docs/product-requirements.md` (or an initiative-specific PRD under `docs/`). Replace all placeholders; delete sections that do not apply.

**Do not** paste a full requirements document from another product or repository into this template. Carry over only ideas after rewriting them for the current initiative.

**Template used (for derived docs):** record `docs/templates/product-requirements-template.md` in document control per [documentation governance](../../.cursor/rules/docs-governance.mdc).

**Longer paste-ready PRD skeleton:** when you need a full section-by-section markdown draft to fill, use `.cursor/skills/product-manager/reference.md` and the **product-manager** skill instructions.

---

## Document control

| Field | Value |
| --- | --- |
| **Title** | [Initiative or product name] |
| **Version** | [0.1] |
| **Author** | [Name] |
| **Date** | [YYYY-MM-DD] |
| **Status** | Draft \| In review \| Approved |
| **Related docs** | [Links to technical design, wireframes, tech stack — with version or date] |
| **Template used** | `docs/templates/product-requirements-template.md` |

---

## 1. Who it is for

- **Primary users:** [Personas or roles; what they are trying to do.]
- **Context:** [Where/when they use the product; constraints that matter for scope.]

---

## 2. Executive summary

Write **one short section** a busy reader can skim:

- **Problem:** [What hurts today.]
- **Solution (product):** [What you will ship in plain language.]
- **Differentiators / locks:** [Non-negotiables already decided.]
- **Success (high level):** [How you will know it worked — tie to §10.]

---

## 3. Goals and non-goals

### 3.1 Goals

- [Bullet list of outcomes the product must achieve.]

### 3.2 Non-goals (explicit exclusions)

- [What you are not building in this phase; prevents scope creep.]

---

## 4. Scope

### 4.1 In scope

- [Capabilities, platforms, integrations included in this document’s release or phase.]

### 4.2 Out of scope / deferred

- [Items explicitly postponed; link to roadmap doc if one exists.]

### 4.3 Assumptions and dependencies

- [Technical, legal, partner, or data assumptions; external dependencies.]

---

## 5. User-facing requirements (functional)

**How to use this section**

- Assign stable IDs (**FR-01**, **FR-02**, … or your own scheme) for traceability to design and tests.
- Each requirement should be **testable**: reader can tell what “done” means.
- Prefer tables for dense rules; use subsections when one theme needs prose (e.g. sharing rules).

| ID | Requirement |
| --- | --- |
| **FR-01** | [Clear behavior; include edge cases in footnotes or follow-on bullets if needed.] |
| **FR-02** | […] |

Add subsections (e.g. **5.1 Identity**, **5.2 Core objects**) when it improves navigation.

---

## 6. Non-functional requirements

| ID | Category | Requirement |
| --- | --- | --- |
| **NFR-01** | Security / privacy | [e.g. transport, auth model, data handling.] |
| **NFR-02** | Accessibility | [Target standard and core flows in scope.] |
| **NFR-03** | Performance / reliability | [Qualitative or quantitative bars if known.] |

**Probe and deployment alignment (optional):** If availability, incident response, or SLOs depend on load balancer or orchestrator behavior, ensure the technical design spells out health/readiness semantics and dependency checks (see `docs/templates/technical-design-template.md` §6.1). User-facing wireframes do not replace that operations detail.

---

## 7. User journeys and acceptance (optional for short PRDs)

For a **short** baseline doc you may defer detail to a “full PRD” pass. When present:

- **Journeys:** [Name each; steps; happy path and key failure paths.]
- **Acceptance criteria:** [Per FR or per journey; Given/When/Then or checklist style.]

---

## 8. Metrics and rollout

- **Metrics:** [Adoption, quality, business — what you will measure and when.]
- **Rollout:** [Phases, flags, pilot cohorts — or “TBD” with owner.]

---

## 9. Risks and open questions

| Risk or question | Impact | Mitigation / next step | Owner |
| --- | --- | --- | --- |
| […] | […] | […] | […] |

---

## 10. Locked decisions (optional)

- [Decisions already approved that engineering and design must not reopen without a formal change.]

---

## 11. Revision history

| Version | Date | Notes |
| --- | --- | --- |
| 0.1 | [YYYY-MM-DD] | Initial draft from template. |
