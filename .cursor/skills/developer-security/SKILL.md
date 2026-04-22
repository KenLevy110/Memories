---
name: developer-security
description: Implements and reviews application security for this repo including magic-link auth hardening, secure session cookies, CSRF/SameSite decisions, input validation, authorization checks, HTTPS posture, and security logging. Use when handling auth, sensitive data, threat mitigation, or security review.
instructions: Apply least privilege and fail-closed defaults across API and data access.
---

# Developer Security

## Scope

Use for security controls in auth, sessions, API routes, data access, and deployment posture.

## Stack rules

- Auth MVP: magic links with server session after link consumption.
- Session cookies: `httpOnly`; validate `Secure`, `SameSite`, and CSRF model.
- API validation: strict schema validation (Zod) and authorization per resource.
- Transport: HTTPS everywhere.

## Delivery checklist

- Enforce authz on every mutating route and sensitive read.
- Prevent replay/abuse in magic-link flow (expiry, one-time use).
- Sanitize and validate untrusted inputs at boundaries.
- Emit security-relevant audit events for critical actions.
- Document residual risk and follow-up hardening tasks.
