---
name: developer-testing
description: >-
  Executes, monitors, and triages automated test suites and coverage runs for
  this repo, including background execution, polling, hang detection, and
  failure diagnosis. Use when the user asks to run tests, check coverage,
  investigate flaky/failing tests, or verify changes before commit/PR.
instructions: Focus testing the recently updated code based on highest user and data integrity risks first.
---

# Developer Testing

## Scope

Use for **executing** test suites, monitoring their output, diagnosing failures, and validating coverage. For *writing* tests see `developer-unit-testing`; for *E2E/release* validation see `developer-quality-assurance`.

This skill owns test-runner mechanics and failure triage. It does not own risk-based release sign-off decisions.
Out of scope: authoring or refactoring test files (use `developer-unit-testing`).

## Test commands by workspace

| Scope | Command | Working directory |
|-------|---------|-------------------|
| All workspaces | `npm run test` | repo root |
| Web only | `npm test` | `apps/web` |
| API only | `npm test` | `apps/api` |
| Web + coverage | `npm run test:coverage` | `apps/web` |
| API + coverage | `npm run test:coverage` | `apps/api` |
| Full CI suite | `npm run ci:test:full` | repo root |
| Single file | `npx vitest run path/to/file.test.ts` | workspace root |
| Name pattern | `npx vitest run -t "pattern"` | workspace root |

## Execution protocol

### Preferred: redirect to temp file (reliable on all platforms)

Redirect stdout+stderr to a workspace temp file, set `block_until_ms` high enough for the expected run, then read the file with the Read tool.

```
npx vitest run --reporter=verbose 2>&1 > test-output.txt
```

| Suite scope | Suggested `block_until_ms` |
|---|---|
| Single test file | 30 000 |
| One workspace (`apps/web` or `apps/api`) | 90 000 |
| Full CI (`ci:test:full`) | 120 000 |

After the command completes, use the **Read** tool (not `cat`/`head`/`tail`) on the temp file. Read from the end (`offset: -50`) first to see the summary/coverage table, then read specific line ranges to inspect failures. **Delete the temp file** when done.

Why this works better than terminal-file polling:
- The Read tool handles Windows encoding cleanly and provides numbered lines.
- No polling loop or exponential backoff needed; the shell blocks until done.
- `offset` and `limit` let you jump straight to failures or coverage tables.

### Fallback: background with terminal polling

Use when the expected runtime exceeds 2 minutes or you need to monitor progress in real time.

1. **Launch**: call Shell with the test command and `block_until_ms: 0`.
2. **Poll**: read the terminal file to check progress. Start with a 3 s sleep, then exponential backoff (3 s → 6 s → 12 s → …, cap at 30 s).
3. **Detect completion**: look for the `exit_code` footer in the terminal file.
4. **Read results**: once complete, read from the end for pass/fail counts and coverage.

### Handling aborts and hangs

- If a test run produces no new output for **60 seconds** after launch (or 30 s for a single-file run), treat it as hung.
- When hung: report the stall to the user, note the pid from the terminal header, and offer to kill it with `taskkill /F /PID <pid>` (Windows) or `kill <pid>` (Unix).
- If the user or system cancels the run, read the terminal file for any partial output and report what completed before the abort.
- After an abort or hang-kill, always re-check which tests had actually run by looking for the Vitest summary lines in the output.

## Reading test output

Vitest output follows predictable patterns:

- **Pass**: lines containing `✓` or `PASS`.
- **Fail**: lines containing `✗`, `FAIL`, or `AssertionError`.
- **Summary**: final block starting with `Test Files` and `Tests`, showing counts.
- **Coverage table**: printed after `% Coverage` header when `--coverage` is used.

When reporting results, include:
1. Total / passed / failed / skipped counts.
2. Names of failing tests with the first line of each error.
3. Coverage percentages if a coverage run.

## Coverage thresholds (reference)

| Workspace | Lines | Statements | Functions | Branches |
|-----------|-------|------------|-----------|----------|
| `apps/web` | 80 % | 80 % | 80 % | 70 % |
| `apps/api` | 80 % | 80 % | 80 % | 75 % |

Flag any threshold violation immediately.

## Choosing what to run

- After editing a single test or source file → run that test file only.
- After broader changes in one workspace → run the full workspace suite.
- Before commit / PR → run `npm run ci:test:full` from the repo root.
- When investigating a flaky test → run the specific file 2-3 times and compare output.

## Notes

- `apps/api` sets `fileParallelism: false` to avoid DB race conditions; expect longer wall-clock times.
- Web tests use `jsdom` environment; API tests use `node` environment.
- Do not bypass coverage gates or weaken thresholds without an explicit waiver (owner + expiry).
