---
name: developer-code-quality
description: >-
  Structural and readability pass before review or merge: flattens nested
  control flow, removes duplication via shared helpers, and validates clear
  variable and method names. Use at end of a feature, before PR review, or
  when the user asks for a “clean up,” readability, DRY, or nesting pass —
  complements stack-specific review in developer-senior.
instructions: Give specific, actionable feedback; defer deep domain rewrites to the relevant skill.
---

# Developer code quality (pre-review)

## When to use

- **End of development** on a feature branch, before opening or finalizing a PR.
- **Explicit cleanup** when diffs have grown messy or review feedback calls for structure.
- **Not a substitute** for [developer-senior](../developer-senior/SKILL.md) (correctness, security, API contracts) — run this pass for *shape* and *clarity* first, then stack review.

## 1. Nested loops and control flow

**Goal:** Reduce indentation depth; make the “happy path” and exit conditions obvious.

- **Count nesting:** More than 2–3 levels of `if` / `for` / `while` in one function is a signal to simplify.
- **Invert conditionals:** Replace `if (x) { … big block … }` with `if (!x) return/continue;` (guard clauses) so the main logic stays at one indent level.
- **Early `continue` in loops:** Inside `for`/`forEach`, skip invalid items at the top of the body instead of wrapping the whole body in `if (valid)`.
- **Extract the inner loop:** If the inner loop has a clear job (e.g. “process one row”), move it to a named function: `for (const row of rows) processRow(row, ctx)`.
- **Data structures over brute nesting:** Sometimes a `Map`/`Set` or pre-indexing removes an inner scan; prefer *one* pass + lookup over nested iteration when complexity matters.
- **Unify similar branches:** If two branches differ only in small details, use a table of handlers, strategy objects, or a single path with pluggable values — not copy-pasted nested `switch`/`if` trees.

Flag for follow-up: nested loops with unrelated indices, or inner loops that could be `O(n²)` where a map would be `O(n)`.

## 2. Code duplication (DRY)

**Goal:** One behavioral definition, multiple call sites.

- **Copy-pasted blocks:** If the same 3+ lines (or the same idea with tiny edits) appear twice+, extract a **function or method** with a name that states *what* it does.
- **Shared pre/post:** Validation, logging wrappers, “build URL then fetch,” and error normalization are typical extraction candidates.
- **Parametrize, don’t clone:** Differences should become parameters or small strategy hooks, not a second near-identical function.
- **Test after extract:** Call sites should behave the same; run focused tests on touched areas.

Avoid **premature** abstraction: one-off similarity is fine; extract when duplication is real and likely to change together.

## 3. Naming (variables and methods)

**Goal:** Names that explain intent without reading the whole body.

- **Methods/functions:** Prefer **verbs** or **verb phrases** for actions (`normalizeEmail`, `fetchListById`). Booleans: `is…`, `has…`, `should…`.
- **Variables:** Nouns or short phrases; avoid `data`, `thing`, `temp`, `ret` unless scope is tiny.
- **Length vs scope:** Wider scope and longer lifetime → more descriptive names; very short names only in very small blocks (e.g. loop indices, math).
- **Same concept, same name** everywhere; **different names** for different concepts — don’t overload one vague word.
- **Module/API boundaries:** Public names are part of the contract; invest extra care there.

## 4. Quick checklist (before you ship the review)

- [ ] Deepest nesting reduced with guards, extraction, or structure change where it helped readability.
- [ ] No meaningful duplicated logic without a shared helper (or a documented reason).
- [ ] New/changed public and cross-file names read clearly to someone unfamiliar with the PR.
- [ ] Optional: one short note in the PR for non-obvious refactors (so reviewers know intent).

## Relationship to other skills

- **[developer-senior](../developer-senior/SKILL.md):** After this pass, use for correctness, security, data layer, frontend a11y/sync, and test sufficiency.
- **Stack skills** ([developer-backend](../developer-backend/SKILL.md), [developer-frontend-ui](../developer-frontend-ui/SKILL.md), etc.): Apply when the change is in that layer; this skill does not replace them.

## Suggested PR note (optional)

> Structural pass: reduced nesting, deduplicated *X*, renamed *Y* for clarity. Behavior unchanged (tests: …).
