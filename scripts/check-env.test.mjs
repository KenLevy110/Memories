import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  findRepoRootWithEnvExample,
  missingEnvKeys,
  parseEnvFileKeys,
  runEnvCheck,
} from "./check-env.mjs";

test("parseEnvFileKeys: skips comments, blanks, and supports export", () => {
  const raw = `
# ignored
FOO=1
export BAR=two
   SPACED =x

# nocommit
BAZ=
`;
  const keys = parseEnvFileKeys(raw);
  assert.deepEqual([...keys].sort(), ["BAR", "BAZ", "FOO", "SPACED"]);
});

test("parseEnvFileKeys: strips BOM", () => {
  const keys = parseEnvFileKeys("\ufeffONE=1\n");
  assert.ok(keys.has("ONE"));
});

test("missingEnvKeys", () => {
  const ex = new Set(["A", "B", "C"]);
  const env = new Set(["B"]);
  assert.deepEqual(missingEnvKeys(ex, env), ["A", "C"]);
});

test("findRepoRootWithEnvExample from nested directory", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-env-root-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "X=1\n", "utf8");
  const nested = path.join(tmp, "apps", "api");
  fs.mkdirSync(nested, { recursive: true });
  assert.equal(findRepoRootWithEnvExample(nested), tmp);
});

test("runEnvCheck: ok when .env has all keys", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-env-ok-"));
  fs.writeFileSync(
    path.join(tmp, ".env.example"),
    "A=1\nB=2\n# comment\n",
    "utf8",
  );
  fs.writeFileSync(path.join(tmp, ".env"), "A=x\nB=y\n", "utf8");
  const r = runEnvCheck({ root: tmp, strict: false });
  assert.equal(r.ok, true);
  assert.equal(r.missing.length, 0);
});

test("runEnvCheck: missing keys when .env incomplete", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-env-miss-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "A=1\nB=2\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env"), "A=x\n", "utf8");
  const r = runEnvCheck({ root: tmp, strict: false });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["B"]);
});

test("runEnvCheck: ok when .env.local supplies keys missing from .env (standalone profile)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-env-split-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "A=1\nB=2\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env"), "MEMORIES_ENV_PROFILE=standalone\nA=x\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env.local"), "B=y\n", "utf8");
  const r = runEnvCheck({ root: tmp, strict: false });
  assert.equal(r.ok, true);
  assert.equal(r.missing.length, 0);
});

test("runEnvCheck: dashboard profile ignores .env.local for required keys", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-env-dash-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "A=1\nB=2\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env"), "MEMORIES_ENV_PROFILE=dashboard\nA=x\n", "utf8");
  fs.writeFileSync(path.join(tmp, ".env.local"), "B=y\n", "utf8");
  const r = runEnvCheck({ root: tmp, strict: false });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["B"]);
});

test("runEnvCheck: no .env", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "check-env-noenv-"));
  fs.writeFileSync(path.join(tmp, ".env.example"), "ONLY=1\n", "utf8");
  const r = runEnvCheck({ root: tmp, strict: false });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["ONLY"]);
});
