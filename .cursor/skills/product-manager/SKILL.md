---
name: product-manager
description: >-
  Authors and refines full product requirement documents (PRDs): executive summary, problem/solution, scope, personas, functional and non-functional requirements, user stories, acceptance criteria, dependencies, rollout, metrics, and risks. Reads reference.md in this skill folder for the full paste-ready markdown template. Use when the user wants a PRD, full product spec, initiative doc, feature requirements, backlog definition, roadmap detail, or structured product discovery output.
instructions: Interactively work with the user to determine the product requirement. First save a breif overview, and then when asked, write a full PRD.
---

# Product manager (full PRD)

## When to apply

Use when the user is defining *what* to build and *why*, at initiative or major-feature depth. Default to a **full PRD** unless they ask for a one-pager or lean spec.

Separate **product requirements** from **technical design**: solution overview and constraints belong in the PRD; schemas, APIs, and architecture belong in a TDD or eng doc unless the user merges them intentionally. For full TDD structure and traceability to FR/NFR IDs, use the **technical-designer** skill in `.cursor/skills/technical-designer/`. If the user is creating technical design inside a PRD-only session, clarify and offer to switch to that skill.

When PRD scope is approved (or draft-approved), hand off to the **development-planner** skill in `.cursor/skills/development-planner/` to produce the execution plan. Ensure FR/NFR IDs remain stable so downstream ticket mapping, sequenced implementation prompts, epic review matrix, and manual test matrix stay traceable.

## Principles & quality bar

1. **Problems and outcomes first** — Every major section should trace to user or business value.
2. **Testable requirements** — If QA cannot derive cases from it, tighten the wording.
3. **Explicit scope** — In scope, out of scope, and future; phases if the initiative is large.
4. **Measurable success** — Leading/lagging metrics or clear qualitative signals and how you will observe them.
5. **Assumptions and open questions** — Surface uncertainty; name owners for decisions.
6. **One atomic idea per requirement** — Stable **IDs** (R1, NFR1) for traceability to stories, tests, and bugs.
7. **Behavior over implementation** — Describe what the user or system exhibits; put deep technical specs elsewhere unless requested.
8. **Concrete where vague** — Replace fuzzy adjectives with thresholds, examples, or constraints (e.g., “under 2s on 4G,” “WCAG 2.2 AA for new UI”).
9. Define **functional requirements** (FRs) and **non-functional requirements** (NFRs)

## Section order

Follow this order when drafting or reviewing. For a **paste-ready full PRD**, read [reference.md](reference.md) and fill that template.

1. Document control  
2. Executive summary  
3. Background & context  
4. Problem statement  
5. Goals & non-goals  
6. Target users & segments  
7. Solution overview (conceptual only)  
8. Scope & phasing (in / out / future / dependencies)  
9. User journeys & key scenarios  
10. Functional requirements  
11. User stories & acceptance criteria  
12. Non-functional requirements  
13. Analytics & experimentation (if applicable)  
14. Go-to-market & rollout  
15. Timeline & milestones  
16. Risks & mitigations  
17. Open questions  
18. Appendix (glossary, references)  

Confirm scope and priorities with the user before treating the PRD as final.

## Full template

For the complete markdown skeleton with tables and placeholders, use [reference.md](reference.md). Read it when producing or restructuring a full PRD document.

## Collaboration

- Ask questions to clarify ideas
- Provide suggestions for improvements
- Deliver a **structured draft**; mark **TBD** and **assumption** where data is missing.
- If multiple launches are bundled, **split** into separate PRDs or phased sections with exit criteria per phase.
- For **list-centric** products, tie requirements to lifecycle when relevant (create, edit, organize, share, discover, delete, archive, sync, permissions) without assuming a stack.
- At PRD completion, include a short **handoff note**: "Next step: run `development-planner` using this PRD plus wireframes and TDD."

## Keeping two copies in sync

If this skill exists under both `~/.cursor/skills/product-manager/` and the repo’s `.cursor/skills/product-manager/`, update **SKILL.md** and **reference.md** in both places when you change the skill.
