import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  pathToCursorProjectSlug,
  resolveCursorTranscriptsDir,
} from "./resolve-cursor-transcripts-dir.mjs";

test("pathToCursorProjectSlug: dotted final segment", () => {
  if (process.platform === "win32") {
    assert.equal(
      pathToCursorProjectSlug(String.raw`C:\Users\evolution\Sites\localhost\dzcm.test`),
      "c-Users-evolution-Sites-localhost-dzcm-test",
    );
    return;
  }
  assert.equal(
    pathToCursorProjectSlug("/Users/evolution/Sites/localhost/dzcm.test"),
    "Users-evolution-Sites-localhost-dzcm-test",
  );
});

test("pathToCursorProjectSlug: spaces in segment", () => {
  if (process.platform !== "win32") return;
  assert.equal(
    pathToCursorProjectSlug(String.raw`C:\Users\Ken Levy\Dashboard`),
    "c-Users-Ken-Levy-Dashboard",
  );
});

test("resolveCursorTranscriptsDir matches repo.json workspace", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-resolve-"));
  const fakeRepoRaw = path.join(tmp, "myrepo");
  fs.mkdirSync(fakeRepoRaw, { recursive: true });
  const fakeRepo = fs.realpathSync.native(fakeRepoRaw);
  execSync("git init", { cwd: fakeRepo, stdio: "ignore" });

  const projectsBase = path.join(tmp, ".cursor", "projects");
  const projectDir = path.join(projectsBase, "any-slug-name");
  const transcripts = path.join(projectDir, "agent-transcripts");
  fs.mkdirSync(transcripts, { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, "repo.json"),
    JSON.stringify({ workspace: fakeRepo }),
    "utf8",
  );

  const resolved = resolveCursorTranscriptsDir(fakeRepo, { projectsBase });
  assert.equal(path.normalize(resolved), path.normalize(transcripts));
});

test("resolveCursorTranscriptsDir slug fallback when repo.json absent", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-resolve-slug-"));
  const fakeRepoRaw = path.join(tmp, "alpha", "beta");
  fs.mkdirSync(fakeRepoRaw, { recursive: true });
  const fakeRepo = fs.realpathSync.native(fakeRepoRaw);
  execSync("git init", { cwd: fakeRepo, stdio: "ignore" });

  const projectsBase = path.join(tmp, ".cursor", "projects");
  const slug = pathToCursorProjectSlug(fakeRepo);
  const transcripts = path.join(projectsBase, slug, "agent-transcripts");
  fs.mkdirSync(transcripts, { recursive: true });

  const resolved = resolveCursorTranscriptsDir(fakeRepo, { projectsBase });
  assert.equal(path.normalize(resolved), path.normalize(transcripts));
});
