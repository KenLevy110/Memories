import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (
  (process.env.CI && process.env.CI !== "false") ||
  process.env.SKIP_SETUP_GIT_HOOKS === "1"
) {
  process.exit(0);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

try {
  execSync("git rev-parse --is-inside-work-tree", {
    cwd: repoRoot,
    stdio: "ignore",
  });
} catch {
  process.exit(0);
}

execSync("git config core.hooksPath .githooks", {
  cwd: repoRoot,
  stdio: "inherit",
});
console.log("Configured git hooks path to .githooks");
