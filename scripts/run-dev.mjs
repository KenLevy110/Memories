import { spawn } from "node:child_process";

const run = (script, { quiet = false } = {}) =>
  new Promise((resolve, reject) => {
    const npmRunCommand = `npm run --silent ${script}`;
    const stdio = quiet ? ["ignore", "pipe", "pipe"] : "inherit";
    const child =
      process.platform === "win32"
        ? spawn(npmRunCommand, {
            stdio,
            shell: true,
            env: process.env,
          })
        : spawn("npm", ["run", "--silent", script], {
            stdio,
            shell: false,
            env: process.env,
          });

    let bufferedStderr = "";
    if (quiet) {
      child.stderr?.on("data", (chunk) => {
        bufferedStderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      if (quiet && bufferedStderr.trim().length > 0) {
        process.stderr.write(bufferedStderr);
      }
      reject(new Error(`npm run ${script} failed with code ${code ?? "unknown"}`));
    });
  });

const main = async () => {
  console.log("Starting API and web dev servers...");
  await run("dev:clean", { quiet: true });
  await run("dev:all");
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
