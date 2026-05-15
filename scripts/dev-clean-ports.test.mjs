import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveDevCleanPorts, uniqueDevCleanPorts } from "./dev-clean-ports.mjs";

test("dashboard + PORT in .env clears that API port and 5174 web", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dev-clean-dash-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  fs.writeFileSync(
    path.join(tmp, ".env"),
    "MEMORIES_ENV_PROFILE=dashboard\nPORT=9090\n",
    "utf8",
  );
  assert.deepEqual(resolveDevCleanPorts(tmp), { apiPort: 9090, webPort: 5174 });
  assert.deepEqual(uniqueDevCleanPorts(tmp), [9090, 5174]);
});

test("dashboard without PORT defaults API clean to 9090 (not 3000)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dev-clean-dash-def-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env"), "MEMORIES_ENV_PROFILE=dashboard\n", "utf8");
  assert.deepEqual(resolveDevCleanPorts(tmp), { apiPort: 9090, webPort: 5174 });
});

test("standalone uses PORT from .env.local over .env", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dev-clean-standalone-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  fs.writeFileSync(
    path.join(tmp, ".env"),
    "MEMORIES_ENV_PROFILE=standalone\nPORT=9090\n",
    "utf8",
  );
  fs.writeFileSync(path.join(tmp, ".env.local"), "PORT=3000\n", "utf8");
  assert.deepEqual(resolveDevCleanPorts(tmp), { apiPort: 3000, webPort: 5173 });
});

test("standalone without PORT defaults API clean to 3000", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dev-clean-standalone-def-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env"), "MEMORIES_ENV_PROFILE=standalone\n", "utf8");
  assert.deepEqual(resolveDevCleanPorts(tmp), { apiPort: 3000, webPort: 5173 });
});

test("uniqueDevCleanPorts dedupes when API and web share a port", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dev-clean-dedupe-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  fs.writeFileSync(
    path.join(tmp, ".env"),
    "MEMORIES_ENV_PROFILE=dashboard\nPORT=5174\n",
    "utf8",
  );
  assert.deepEqual(uniqueDevCleanPorts(tmp), [5174]);
});

test("invalid PORT throws", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dev-clean-bad-port-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env"), "MEMORIES_ENV_PROFILE=dashboard\nPORT=abc\n", "utf8");
  assert.throws(() => resolveDevCleanPorts(tmp), /Invalid PORT/);
});
