import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_WALK = 20;

/**
 * Collect variable names from a dotenv-style file (comments and blank lines ignored).
 * Supports optional `export ` prefix. Does not parse multiline values.
 *
 * @param {string} content
 * @returns {Set<string>}
 */
export function parseEnvFileKeys(content) {
  const keys = new Set();
  const text = content.startsWith("\ufeff") ? content.slice(1) : content;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const unexported = trimmed.startsWith("export ")
      ? trimmed.slice(7).trim()
      : trimmed;
    const eq = unexported.indexOf("=");
    if (eq <= 0) continue;
    const key = unexported.slice(0, eq).trim();
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * @param {string} startDir
 * @returns {string | null}
 */
export function findRepoRootWithEnvExample(startDir) {
  let dir = resolve(startDir);
  for (let i = 0; i < MAX_WALK; i++) {
    if (existsSync(join(dir, ".env.example"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

/**
 * @param {Set<string>} exampleKeys
 * @param {Set<string>} envKeys
 * @returns {string[]}
 */
export function missingEnvKeys(exampleKeys, envKeys) {
  return [...exampleKeys].filter((k) => !envKeys.has(k)).sort();
}

/**
 * @param {{ root: string; strict: boolean }} options
 * @returns {{
 *   ok: boolean;
 *   strict: boolean;
 *   skipped?: boolean;
 *   root: string;
 *   envPath: string;
 *   examplePath: string;
 *   missing: string[];
 *   messages: string[];
 * }}
 */
export function runEnvCheck(options) {
  const { root, strict } = options;
  const examplePath = join(root, ".env.example");
  const envPath = join(root, ".env");

  if (!existsSync(examplePath)) {
    return {
      ok: true,
      skipped: true,
      strict,
      root,
      envPath,
      examplePath,
      missing: [],
      messages: [`No .env.example at ${root}; skipping env key check.`],
    };
  }

  const exampleKeys = parseEnvFileKeys(readFileSync(examplePath, "utf8"));

  if (exampleKeys.size === 0) {
    return {
      ok: true,
      skipped: true,
      strict,
      root,
      envPath,
      examplePath,
      missing: [],
      messages: [".env.example has no KEY= lines; skipping env key check."],
    };
  }

  const envExists = existsSync(envPath);
  const envKeys = envExists
    ? parseEnvFileKeys(readFileSync(envPath, "utf8"))
    : new Set();

  const missing = missingEnvKeys(exampleKeys, envKeys);
  const ok = missing.length === 0;

  /** @type {string[]} */
  const messages = [];
  if (!envExists) {
    messages.push(
      `No repo-root .env (expected ${envPath}). Copy from .env.example and fill values. Required keys (${missing.length}): ${missing.join(", ")}`,
    );
  } else {
    for (const k of missing) {
      messages.push(`Missing key in .env: ${k}`);
    }
  }

  return {
    ok,
    strict,
    root,
    envPath,
    examplePath,
    missing,
    messages,
  };
}

/**
 * @param {Awaited<ReturnType<typeof runEnvCheck>>} result
 * @returns {number} exit code
 */
export function exitCodeForCheck(result) {
  if (result.skipped) {
    console.log(`[check-env] ${result.messages[0]}`);
    return 0;
  }
  for (const m of result.messages) {
    console.warn(`[check-env] ${m}`);
  }
  if (result.ok) {
    console.log("[check-env] .env declares every key listed in .env.example.");
    return 0;
  }
  console.warn(
    "[check-env] Add the missing keys to .env (see .env.example). Pass --strict to fail the process.",
  );
  return result.strict ? 1 : 0;
}

function parseArgs(argv) {
  let strict = false;
  let rootOverride = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--strict") strict = true;
    else if (argv[i] === "--root" && argv[i + 1]) {
      rootOverride = resolve(argv[++i]);
    }
  }
  return { strict, rootOverride };
}

function runningAsMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fileURLToPath(import.meta.url) === resolve(entry);
  } catch {
    return false;
  }
}

export async function main() {
  const { strict, rootOverride } = parseArgs(process.argv);
  const start = rootOverride ?? process.cwd();
  const root = findRepoRootWithEnvExample(start);
  if (!root) {
    console.warn(
      "[check-env] Could not find .env.example by walking up from",
      start,
      "— run from the repository root (or pass --root <path>).",
    );
    process.exitCode = strict ? 1 : 0;
    return;
  }

  const result = runEnvCheck({ root, strict });
  process.exitCode = exitCodeForCheck(result);
}

if (runningAsMain()) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
