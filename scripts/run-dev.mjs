import { spawn } from "node:child_process";

const run = (script) =>
  new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", script], {
      stdio: "inherit",
      shell: true,
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run ${script} failed with code ${code ?? "unknown"}`));
    });
  });

const main = async () => {
  await run("dev:clean");
  await run("dev:all");
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
