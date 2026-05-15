/**
 * Prints the absolute path to this repo's Cursor agent-transcripts directory when
 * discoverable, then exits 0. Prints nothing when not found.
 *
 * Discovery order:
 * 1) Scan ~/.cursor/projects/ subfolders for repo.json (workspace, rootPath, or path vs git toplevel)
 * 2) ~/.cursor/projects/<slug>/agent-transcripts where slug is derived from the git toplevel path
 *
 * argv[2]: optional repo root (default: cwd). Intended for sync-agent-chats callers.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Cursor project directory names use a slug derived from the absolute workspace path
 * (slashes/backslashes → hyphens, spaces → hyphens, dots in segment names → hyphens;
 * Windows drive "C:" becomes leading "c").
 */
export function pathToCursorProjectSlug(absPath) {
  const resolved = path.resolve(absPath);
  const sep = path.sep;
  const rawParts = resolved.split(sep).filter((p) => p.length > 0);
  const out = [];
  for (let i = 0; i < rawParts.length; i += 1) {
    let seg = rawParts[i];
    if (i === 0 && /^[a-zA-Z]:$/.test(seg)) {
      out.push(seg[0].toLowerCase());
      continue;
    }
    seg = seg.replace(/\./g, "-").replace(/\s+/g, "-");
    out.push(seg);
  }
  return out.join("-");
}

function gitTopLevel(startDir) {
  try {
    return execSync("git rev-parse --show-toplevel", {
      cwd: startDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function tryRealPath(p) {
  try {
    return fs.realpathSync.native(path.resolve(p));
  } catch {
    return "";
  }
}

function pathsEqual(a, b) {
  const ra = tryRealPath(a) || path.resolve(a);
  const rb = tryRealPath(b) || path.resolve(b);
  if (process.platform === "win32") {
    return ra.toLowerCase() === rb.toLowerCase();
  }
  return ra === rb;
}

function pickRepoJsonPath(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "";
  for (const key of ["workspace", "rootPath", "path"]) {
    const v = obj[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

function fileUrlToFsPath(fileUrl) {
  try {
    const u = new URL(fileUrl);
    if (u.protocol !== "file:") return "";
    let p = u.pathname;
    if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(p)) {
      p = p.slice(1);
    }
    return path.normalize(decodeURIComponent(p));
  } catch {
    return "";
  }
}

function normalizeWorkspaceField(raw) {
  if (!raw || typeof raw !== "string") return "";
  const t = raw.trim();
  if (t.startsWith("file:")) {
    return fileUrlToFsPath(t);
  }
  return path.normalize(t);
}

function homeDir() {
  return process.platform === "win32"
    ? process.env.USERPROFILE || os.homedir()
    : os.homedir();
}

function transcriptsDir(projectDir) {
  const t = path.join(projectDir, "agent-transcripts");
  return fs.existsSync(t) && fs.statSync(t).isDirectory() ? t : "";
}

/**
 * @param {string} repoRoot
 * @param {{ projectsBase?: string }} [options]
 * @returns {string} absolute agent-transcripts path or ""
 */
export function resolveCursorTranscriptsDir(repoRoot, options = {}) {
  const start = path.resolve(repoRoot || process.cwd());
  const gitRoot = gitTopLevel(start) || start;
  const normalizedGitRoot = path.resolve(gitRoot);

  const projectsBase =
    typeof options.projectsBase === "string" && options.projectsBase.length > 0
      ? path.resolve(options.projectsBase)
      : path.join(homeDir(), ".cursor", "projects");
  if (!fs.existsSync(projectsBase)) {
    return "";
  }

  try {
    for (const ent of fs.readdirSync(projectsBase, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const projectDir = path.join(projectsBase, ent.name);
      const repoJsonPath = path.join(projectDir, "repo.json");
      if (!fs.existsSync(repoJsonPath)) continue;

      let data;
      try {
        data = JSON.parse(fs.readFileSync(repoJsonPath, "utf8"));
      } catch {
        continue;
      }

      const workspacePath = normalizeWorkspaceField(pickRepoJsonPath(data));
      if (workspacePath && pathsEqual(workspacePath, normalizedGitRoot)) {
        const t = transcriptsDir(projectDir);
        if (t) return t;
      }
    }
  } catch {
    return "";
  }

  const slugRoot = tryRealPath(normalizedGitRoot) || normalizedGitRoot;
  const slug = pathToCursorProjectSlug(slugRoot);
  const slugTranscripts = path.join(projectsBase, slug, "agent-transcripts");
  if (fs.existsSync(slugTranscripts) && fs.statSync(slugTranscripts).isDirectory()) {
    return slugTranscripts;
  }

  return "";
}

function main() {
  const repoArg = process.argv[2] || process.cwd();
  const found = resolveCursorTranscriptsDir(repoArg);
  if (found) {
    process.stdout.write(found);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
