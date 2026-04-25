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

## Commands and validation

- Install dependencies: `npm install` (or the package manager this repo uses).
- Run all tests: `npm run test`
- Run full CI-equivalent checks: `npm run lint`, `npm run typecheck`, and the project’s CI test scripts

Run relevant tests after changes and before marking work complete. Keep CI green and align local verification with the repo’s workflow configuration.

## Documentation alignment

If behavior, architecture, testing policy, or release gates change, update the corresponding material in `docs/`, for example:

- `docs/product-requirements-v1.md`
- `docs/technical-design-v1.md`
- `docs/design-wireframe-v1.md`
- `docs/memories-user-workflow-v1.md`
- `docs/development-plan.md`
- `docs/tech-stack.md`

For new or substantially rewritten docs under `docs/`, read and follow the matching template in `docs/templates/` before drafting.

## Skill files (`.cursor/skills/`)

Domain rules live in `.cursor/skills/<name>/SKILL.md` (backend, frontend-ui, frontend-data-sync, database, security, unit-testing, testing, senior, code-quality, manager, etc.).

When implementing work that maps to one or more domain lanes, read those skill files before coding. When a development plan in `docs/` uses sequenced prompts with a **Skills to read first** line, read each listed skill and record which were read in the PR or commit message. Before requesting review on a non-trivial change, read `developer-code-quality` for a structural pass (nesting, duplication, naming) in addition to running tests and any senior/QA review the scope implies.

## Delivery expectations

- Keep implementations incremental and test-backed.
- Favor clear, maintainable code over clever patterns.
- Call out assumptions and unresolved decisions in docs or PR notes.

## AI-first delivery model

- Default operating mode: AI agents design, implement, review, and maintain code in this repository.
- When estimating effort or "difficulty", assume AI-assisted execution by default; evaluate complexity mainly by risk, coupling, ambiguity, verification depth, and rollout impact.
- If a task requires materially higher human-only effort assumptions, call that out explicitly and explain why.
