# Full PRD template (markdown)

Paste-ready default structure for a complete PRD. Omit sections that truly do not apply; if stakeholders expect a heading, use **N/A** with one line explaining why.

---

# Workflow Process

## Creating a PRD

1. **Load Context**
   - Check for existing product brief or project documentation
   - Review project level and complexity
   - Identify stakeholders

2. **Gather Requirements**
   - Interview stakeholders about functional needs
   - Identify non-functional constraints
   - Document assumptions and dependencies

3. **Organize Requirements**
   - Categorize as FR or NFR
   - Assign unique IDs (FR-001, NFR-001)
   - Apply prioritization framework
   - Group related requirements into epics

4. **Define Acceptance Criteria**
   - Make each requirement testable
   - Use specific, measurable criteria
   - Avoid implementation details

5. **Create Traceability Matrix**
   - Link requirements to business objectives
   - Map requirements to epics
   - Document dependencies

---

# Validation Checklist

Before completing a PRD or tech spec, verify:

- [ ] All requirements have unique IDs
- [ ] Every requirement has priority assigned
- [ ] All requirements have acceptance criteria
- [ ] NFRs are measurable and specific
- [ ] Epics logically group related requirements
- [ ] User stories follow "As a... I want... so that..." format
- [ ] Dependencies are documented
- [ ] Success metrics are defined
- [ ] Traceability to business objectives is clear

---

# [Product / initiative name] — Product Requirements

## Document control
| Field | Value |
|-------|--------|
| **Author** | |
| **PM / owner** | |
| **Reviewers** | |
| **Status** | Draft / In review / Approved |
| **Version** | 0.1 |
| **Last updated** | YYYY-MM-DD |
| **Related docs** | Links to research, designs, legal, etc. |

---

## Executive summary
- **Recommendation:** [Ship / pilot / defer — one sentence]
- **What:** [What we are building/releasing, one short paragraph]
- **Why now:** [Urgency and opportunity]
- **Success (headline):** [How we will know it worked]
- **Top risks:** [2–4 bullets]

---

## Background & context
- **Company/product context:** [Where this fits]
- **Prior work:** [What exists today; links]
- **Evidence:** [Research, data, support volume, quotes—brief]

---

## Problem statement
- **Current experience:** [What happens today]
- **Pain points:** [For whom, how often, severity]
- **Why existing solutions fail:** [Competitors, workarounds, gaps]

---

## Goals & non-goals
### Goals
1. [Measurable or observable goal]
2. ...

### Non-goals
- [Explicit exclusions to prevent scope creep]

---

## Target users & segments
| Segment | Description | Priority (primary/secondary) |
|---------|-------------|------------------------------|
| | | |

### Personas or roles (if used)
- **[Name/role]:** [Goal, context, constraints]

---

## Solution overview
- **Concept:** [Plain-language description of the experience]
- **Key capabilities:** [Bullet list of major capabilities]
- **Key flows (high level):** [Numbered list; detail in User journeys]

---

## Scope & phasing
### In scope (MVP / v1)
- ...

### Out of scope
- ...

### Future / later phases
- ...

### Dependencies
- **Product / platform:** ...
- **Org / legal / compliance:** ...
- **Data / integrations:** ...

---

## User journeys & key scenarios
### Scenario 1: [Name]
- **Actor:**
- **Trigger:**
- **Happy path:**
- **Edge cases / failure modes:**

(Repeat as needed.)

---

## Functional requirements
| ID | Requirement | Priority (P0/P1/P2) | Source (goal/scenario) | Notes |
|----|-------------|---------------------|-------------------------|-------|
| R1 | The system shall ... | P0 | | |

*P0 = launch blocker; P1 = important for launch; P2 = follow-up.*

---

## User stories & acceptance criteria
### Epic: [Name]
**Story:** As a [role], I want [capability], so that [outcome].

**Acceptance criteria:**
- Given ..., when ..., then ...
- [ ] ...

(Repeat per story/epic.)

---

## Non-functional requirements
| ID | Category | Requirement | Priority | Notes |
|----|----------|-------------|----------|-------|
| NFR1 | Performance | | | |
| NFR2 | Security / privacy | | | |
| NFR3 | Accessibility | | | |
| NFR4 | Reliability | | | |

---

## Analytics & experimentation (if applicable)
- **North-star / primary metrics:**
- **Supporting metrics:**
- **Events / properties:** [If known]
- **Rollout / experiment plan:** [e.g., phased %, holdouts]

---

## Go-to-market & rollout
- **Launch definition:** [What must be true to launch]
- **Audience / comms:** [Internal, users, partners]
- **Support / ops:** [Playbooks, training]
- **Migration / backwards compatibility:** [If any]

---

## Timeline & milestones
| Milestone | Description | Target (if known) |
|-----------|-------------|-------------------|
| | | |

---

## Risks & mitigations
| Risk | Likelihood / impact | Mitigation | Owner |
|------|---------------------|------------|-------|
| | | | |

---

## Open questions
| # | Question | Owner | Due / status |
|---|----------|-------|--------------|
| 1 | | | |

---

## Appendix
### Glossary
- **Term:** Definition

### References
- [Links]
