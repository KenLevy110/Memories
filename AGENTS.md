# AGENTS.md

## Purpose

Repository-wide guidance for AI coding agents in the **Memories** monorepo: record memories with **photos**, **recorded voice**, and **transcription** (the Dashboard and other services are separate git repositories). When your layout or quality gates differ from the defaults below, update this file and the matching sections of `docs/` and CI so agents and humans see one story.

## Monorepo structure

- `apps/web`: frontend app (React/Vite, Vitest + jsdom).
- `apps/api`: backend app (Node/TypeScript, Vitest node env).
- `packages/shared`: shared types/schemas/utilities.
- `docs`: product, design, stack, and delivery documentation.

## Always-apply engineering rules

1. **Keep It Simple**: Avoid over-engineering. Implement only what is needed for the current task.
2. **No AI Metadata in Comments**: Never include AI model names, versions, tool names, generation timestamps, or any other AI-related information in code comments, docstrings, or commit messages.
3. Keep changes scoped to the correct workspace (`apps/web`, `apps/api`, or `packages/shared`); avoid unrelated refactors.
4. Prefer shared contracts in `packages/shared` for cross-app types and validation.
5. Preserve coverage policy and CI quality gates (keep numbers aligned with the repo; typical targets):
   - Repo statements/lines: `>= 80%`
   - Repo branches: `>= 70%` (policy); `apps/api` Vitest may enforce `>= 75%` branches
   - Changed non-trivial files lines: `>= 80%`
6. Do not weaken tests or quality gates without explicit waiver notes (owner + expiry).
7. Bug fixes must include a regression test that fails before and passes after, when a test is practical for the change.
8. Keep `apps/web` and `apps/api` dependencies separated unless sharing is intentional.

## Engineering quality pillars

These three themes apply to every initiative; specifics live in the rules above, `docs/` (PRD, TDD, development plan, test strategy), and `.cursor/skills/`.

1. **Automated testing and coverage** — Maintain **Vitest**-backed **unit and component** tests as the default fast-feedback layer, plus integration or E2E where the initiative requires. Keep **line and statement coverage** at the thresholds in rule 5 (typically **≥ 80%** repo-wide and on changed non-trivial files) unless an approved waiver (owner + expiry) says otherwise.
2. **Secure software** — Treat security as a delivery requirement, not an optional pass: **authN/authZ**, **input validation**, **session/cookie posture**, and **threat-appropriate** controls per the technical design and **`.cursor/skills/developer-security/SKILL.md`**.
3. **Layered review before merge** — For **non-trivial** work: complete **`.cursor/skills/developer-code-quality/SKILL.md`** (structural/readability); apply **`.cursor/skills/developer-senior/SKILL.md`** for **high-risk** areas (auth, cross-cutting contracts, data/sync invariants, and similar) and **whenever** the ticket or epic marks **Sr** as a reviewer; satisfy **`.cursor/skills/developer-quality-assurance/SKILL.md`** scope when the development plan or test strategy assigns **QA** or release/regression sign-off. Green CI remains mandatory unless waived.

## Commands and validation

- Install dependencies: `npm install` (or the package manager this repo uses).
- Run API + web locally: `npm run dev` (root); or `npm run dev:api` / `npm run dev:web` separately. For local JWT without a platform IdP, run `npm run dev:local-auth` in a second terminal (see root `README.md`).
- Run all tests: `npm run test`
- Run full CI-equivalent checks: `npm run lint`, `npm run typecheck`, and the project’s CI test scripts

Run relevant tests after changes and before marking work complete. Keep CI green and align local verification with the repo’s workflow configuration.

## Documentation alignment

If behavior, architecture, testing policy, or release gates change, update the corresponding material in `docs/`, for example:

- `docs/product-requirements-v1.md`
- `docs/technical-design-v1.md`
- `docs/design-wireframe-v1.md`
- `docs/memories-user-workflow-v1.md`
- `docs/development-plan-v1.md` (editioned plan; see also optional `docs/development-plan.md` pointer)
- `docs/tech-stack.md`

For new or substantially rewritten docs under `docs/`, read and follow the matching template in `docs/templates/` before drafting. **Filled-in references** for Memories are the editioned `docs/*-v1.md` files (PRD, TDD, wireframes, development plan, workflow)—not a separate `docs/examples/` tree.

**Development plan numbering:** **`docs/templates/development-plan-template.md`** defines **Sections 0–13** and **§12.1–12.5**; **§12.3** is “Standard test commands” and **§12.5** is the manual matrix (Session defaults tie **§8** + **§12.5**). Filled **`development-plan-v*.md`** files may add **§5.x** subsections under **§5** and **`### 12.6 Mobile automation standard`** after **§12.5**, per **`.cursor/skills/development-planner/SKILL.md`**.

**CI:** **`docs-smoke`** runs **`scripts/check-docs.sh`**; **`checks`** runs optional root **`npm`** scripts when `package.json` exists. The default **CI workflow does not run `db:migrate`** or touch PostgreSQL. **Manual migrations:** [`.github/workflows/migrate.yml`](.github/workflows/migrate.yml) (**workflow_dispatch**) once you have workspaces, `db:migrate`, and secrets—see **`docs/infrastructure.md`** (Database migrations). Optional automatic migrate on `main` is documented there but not enabled by default.

**Agent chat archive:** sync Cursor **`agent-transcripts`** into **`docs/agent-chats/`** via **`scripts/sync-agent-chats.ps1`** or **`scripts/sync-agent-chats.sh`**. Configure **`CURSOR_AGENT_TRANSCRIPTS_DIR`** or copy **`scripts/sync-agent-chats.local.env.example`** to **`scripts/sync-agent-chats.local.env`**. Prefer **`git config core.hooksPath .githooks`** so **pre-commit** (sync + stage **`docs/agent-chats`**) and **pre-push** (fails if the archive is still dirty) keep Cursor transcripts aligned with commits; see **`docs/agent-chats/README.md`**.

## Skill files (`.cursor/skills/`)

Domain rules live in `.cursor/skills/<name>/SKILL.md` (backend, frontend-ui, frontend-data-sync, database, security, unit-testing, testing, senior, code-quality, manager, etc.).

When implementing work that maps to one or more domain lanes, read those skill files before coding. When a development plan in `docs/` uses sequenced prompts with a **Skills to read first** line, read each listed skill and record which were read in the PR or commit message. Before requesting review on a non-trivial change, follow **Layered review before merge** under **Engineering quality pillars** above (structural code-quality pass; senior and QA layers per plan, risk, and reviewer columns).

## Delivery expectations

- Keep implementations incremental and test-backed.
- Favor clear, maintainable code over clever patterns.
- Call out assumptions and unresolved decisions in docs or PR notes.

## AI-first delivery model

- Default operating mode: AI agents design, implement, review, and maintain code in this repository.
- **Branching and pull requests** are **human-owned** in this template: people create branches, push, and open/update PRs on the git host. Agents work on the branch you specify and produce commit-ready changes locally; they **do not** create branches or PRs unless you explicitly change that policy in your fork.
- When estimating effort or "difficulty", assume AI-assisted execution by default; evaluate complexity mainly by risk, coupling, ambiguity, verification depth, and rollout impact.
- If a task requires materially higher human-only effort assumptions, call that out explicitly and explain why.
