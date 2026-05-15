import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  findRepoRootWithEnvExample,
  parseEnvFileValue,
  readMemoriesEnvProfileFromRepoDotenv,
} from "./check-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} raw
 * @returns {number}
 */
function parsePort(raw) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT "${raw}". Expected an integer 1-65535.`);
  }
  return parsed;
}

/**
 * Mirrors apps/api `loadMonorepoRootEnv` + `apps/web/vite.config.ts` port selection
 * so `npm run dev` only clears processes bound to Memories dev ports.
 *
 * @param {string} repoRoot
 * @returns {{ apiPort: number, webPort: number }}
 */
export function resolveDevCleanPorts(repoRoot) {
  const envPath = join(repoRoot, ".env");
  const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const profile = readMemoriesEnvProfileFromRepoDotenv(repoRoot);

  let portRaw = parseEnvFileValue(envText, "PORT");
  if (profile === "standalone") {
    const localPath = join(repoRoot, ".env.local");
    if (existsSync(localPath)) {
      const localText = readFileSync(localPath, "utf8");
      const fromLocal = parseEnvFileValue(localText, "PORT");
      if (fromLocal != null && fromLocal.length > 0) {
        portRaw = fromLocal;
      }
    }
  }

  let apiPort;
  if (portRaw != null && portRaw.length > 0) {
    apiPort = parsePort(portRaw);
  } else if (profile === "dashboard") {
    // Documented default alongside Dashboard (see `.env.example`); avoids killing Dashboard on 3000.
    apiPort = 9090;
  } else {
    apiPort = 3000;
  }

  const webPort = profile === "standalone" ? 5173 : 5174;
  return { apiPort, webPort };
}

/**
 * @param {string} repoRoot
 * @returns {number[]}
 */
export function uniqueDevCleanPorts(repoRoot) {
  const { apiPort, webPort } = resolveDevCleanPorts(repoRoot);
  return apiPort === webPort ? [apiPort] : [apiPort, webPort];
}

function main() {
  const repoRoot = findRepoRootWithEnvExample(__dirname) ?? join(__dirname, "..");
  const ports = uniqueDevCleanPorts(repoRoot);
  const killScript = join(__dirname, "kill-dev-port.mjs");

  for (const port of ports) {
    const r = spawnSync(process.execPath, [killScript, String(port)], { stdio: "inherit" });
    if (r.status !== 0) {
      process.exit(r.status ?? 1);
    }
  }
}

const selfPath = resolve(fileURLToPath(import.meta.url));
const argvScript = process.argv[1] ? resolve(process.argv[1]) : "";
if (argvScript === selfPath) {
  main();
}
