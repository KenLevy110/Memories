import { execFileSync } from "node:child_process";

function parsePort(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port "${value}". Expected an integer 1-65535.`);
  }
  return parsed;
}

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8", stdio: "pipe" });
}

function getWindowsPids(port) {
  const output = run("netstat", ["-ano", "-p", "tcp"]);
  const lines = output.split(/\r?\n/);
  const pids = new Set();
  const portPattern = new RegExp(`:${port}$`);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || !line.startsWith("TCP")) {
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length < 5) {
      continue;
    }

    const localAddress = parts[1] ?? "";
    const state = parts[3] ?? "";
    const pid = parts[4] ?? "";

    if (state !== "LISTENING") {
      continue;
    }
    if (!portPattern.test(localAddress)) {
      continue;
    }
    if (!/^\d+$/.test(pid)) {
      continue;
    }

    pids.add(pid);
  }

  return [...pids];
}

function getUnixPids(port) {
  try {
    const output = run("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line));
  } catch {
    return [];
  }
}

function killWindowsPid(pid) {
  run("taskkill", ["/F", "/PID", pid]);
}

function killUnixPid(pid) {
  run("kill", ["-9", pid]);
}

function main() {
  const port = parsePort(process.argv[2] ?? "3000");
  const isWindows = process.platform === "win32";
  const pids = isWindows ? getWindowsPids(port) : getUnixPids(port);

  if (pids.length === 0) {
    console.log(`Port ${port} is already clear.`);
    return;
  }

  for (const pid of pids) {
    if (isWindows) {
      killWindowsPid(pid);
    } else {
      killUnixPid(pid);
    }
  }

  console.log(`Cleared port ${port}; stopped PID(s): ${pids.join(", ")}`);
}

main();
