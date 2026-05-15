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
 * @param {string} content
 * @param {string} key
 * @returns {string | null}
 */
export function parseEnvFileValue(content, key) {
  const needle = `${key}=`;
  const text = content.startsWith("\ufeff") ? content.slice(1) : content;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const unexported = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    if (!unexported.startsWith(needle)) continue;
    let value = unexported.slice(needle.length).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.length > 0 ? value : null;
  }
  return null;
}

/**
 * @param {string} root
 * @returns {"dashboard" | "standalone"}
 */
export function readMemoriesEnvProfileFromRepoDotenv(root) {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) {
    return "dashboard";
  }
  const raw = parseEnvFileValue(readFileSync(envPath, "utf8"), "MEMORIES_ENV_PROFILE")?.trim().toLowerCase() ?? "";
  return raw === "standalone" ? "standalone" : "dashboard";
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
 *   envLocalPath: string;
 *   examplePath: string;
 *   profile: "dashboard" | "standalone";
 *   missing: string[];
 *   messages: string[];
 * }}
 */
export function runEnvCheck(options) {
  const { root, strict } = options;
  const examplePath = join(root, ".env.example");
  const envPath = join(root, ".env");
  const envLocalPath = join(root, ".env.local");

  if (!existsSync(examplePath)) {
    return {
      ok: true,
      skipped: true,
      strict,
      root,
      envPath,
      envLocalPath,
      examplePath,
      profile: "dashboard",
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
      envLocalPath,
      examplePath,
      profile: "dashboard",
      missing: [],
      messages: [".env.example has no KEY= lines; skipping env key check."],
    };
  }

  const envExists = existsSync(envPath);
  const envLocalExists = existsSync(envLocalPath);
  const profile = readMemoriesEnvProfileFromRepoDotenv(root);

  /** @type {Set<string>} */
  const envKeys = new Set();
  if (envExists) {
    for (const key of parseEnvFileKeys(readFileSync(envPath, "utf8"))) {
      envKeys.add(key);
    }
  }
  if (profile === "standalone" && envLocalExists) {
    for (const key of parseEnvFileKeys(readFileSync(envLocalPath, "utf8"))) {
      envKeys.add(key);
    }
  }

  const missing = missingEnvKeys(exampleKeys, envKeys);
  const ok = missing.length === 0;

  /** @type {string[]} */
  const messages = [];
  if (!envExists && !envLocalExists) {
    messages.push(
      `No repo-root .env or .env.local (expected ${envPath} and/or ${envLocalPath}). Copy from .env.example and fill values. Required keys (${missing.length}): ${missing.join(", ")}`,
    );
  } else {
    for (const k of missing) {
      const hint =
        profile === "dashboard"
          ? `Missing key in .env: ${k} (dashboard profile: unset or MEMORIES_ENV_PROFILE=dashboard — .env.local is ignored for this check)`
          : `Missing key in .env or .env.local: ${k}`;
      messages.push(hint);
    }
  }

  return {
    ok,
    strict,
    root,
    envPath,
    envLocalPath,
    examplePath,
    profile,
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
    const scope =
      result.profile === "standalone"
        ? "repo-root .env plus .env.local (MEMORIES_ENV_PROFILE=standalone)"
        : "repo-root .env (dashboard profile: .env.local ignored for this check)";
    console.log(`[check-env] ${scope} — every key listed in .env.example is declared.`);
    return 0;
  }
  console.warn(
    "[check-env] Add the missing keys (see .env.example). Dashboard: use .env only. Standalone: split across .env and .env.local with MEMORIES_ENV_PROFILE=standalone. Pass --strict to fail the process.",
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
