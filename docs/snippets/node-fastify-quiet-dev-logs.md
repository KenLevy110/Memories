# Fastify (pino): quieter local `npm run dev` for the API

Use this when a Node + TypeScript API workspace (e.g. `apps/api`) feels noisy: Fastify’s default pino `info` logs print large JSON lines on startup and for each request.

## Goals

- Default `dev` script: **warn** log level, plus **one** human-readable “ready” line.
- `start` / production default: still **info** (or your ops default) when `LOG_LEVEL` is unset.
- PowerShell / cmd / Unix: set `LOG_LEVEL` in `package.json` with **`cross-env`**.

## `package.json` (api workspace)

Add **`cross-env`** to `devDependencies` and set the dev script:

```json
{
  "scripts": {
    "dev": "cross-env LOG_LEVEL=warn tsx watch src/index.ts"
  },
  "devDependencies": {
    "cross-env": "^7.0.3"
  }
}
```

## `src/app.ts` — respect `LOG_LEVEL`

```ts
const logLevel =
  (process.env["LOG_LEVEL"] as
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "error"
    | "fatal"
    | "silent"
    | undefined) ?? "info";

// Fastify({ logger: { level: logLevel } })
```

## `src/index.ts` — one line when quiet

```ts
const logLevel = process.env["LOG_LEVEL"] ?? "info";
const isQuiet = ["warn", "error", "fatal", "silent"].includes(logLevel);

await app.listen({ port, host });
if (isQuiet) {
  console.log(`API http://127.0.0.1:${port}`);
} else {
  app.log.info(`API listening on ${host}:${port}`);
}
```

## Verbose local debugging

Set **`LOG_LEVEL=info`** (or `debug`) for that shell, then run `npm run dev` in the API workspace, e.g. PowerShell: `$env:LOG_LEVEL = "info"; npm run dev`.

## Revision

| Date | Notes |
| --- | --- |
| 2026-04-22 | Extracted from project backport (monorepo API dev UX). |
