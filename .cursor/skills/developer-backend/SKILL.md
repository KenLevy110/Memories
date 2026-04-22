---
name: developer-backend
description: Implements and reviews backend API work for this repo using Node.js, TypeScript, Fastify or Hono, REST mutations, SSE fan-out, Zod validation, and pino logging with request_id. Use when building endpoints, auth, authorization, transactions, and realtime server behavior.
instructions: Keep backend changes aligned with docs/tech-stack.md and docs/technical-design.md.
---

# Developer Backend

## Scope

Use for API/server implementation and reviews: route handlers, service logic, auth/session, SSE lifecycle, and structured logging.

## Stack rules

- Runtime: Node.js + TypeScript.
- Framework: Fastify or Hono.
- Transport: REST for mutations, SSE for list sync push.
- Validation: Zod (or framework-native schema equivalent) matching API contract.
- Logging: pino with request correlation (`request_id`).

## Delivery checklist

- Validate inputs and normalize errors consistently.
- Enforce authz and ownership checks before mutation.
- Use transactions for multi-step state changes.
- Keep SSE fan-out scoped to active list subscribers.
- Update or add tests for changed routes and service logic.
