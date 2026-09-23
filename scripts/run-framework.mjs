import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";

let pythonRunner;
if (command === "dev") {
  const runnerPort = process.env.LOCKINOLA_RUNNER_PORT || "4317";
  const pythonExecutable = process.env.LOCKINOLA_PYTHON_PATH || "python";
  process.env.LOCKINOLA_RUNNER_URL ||= `http://127.0.0.1:${runnerPort}/run`;
  pythonRunner = spawn(pythonExecutable, [
    "-I", "-S", "-B", fileURLToPath(new URL("./python_runner_server.py", import.meta.url)), "--port", runnerPort,
  ], { stdio: ["ignore", "inherit", "inherit"], windowsHide: true });
  pythonRunner.on("error", () => {
    console.error("Lockinola could not start its local Python runner. Set LOCKINOLA_PYTHON_PATH to your Python executable.");
  });
  const stopRunner = () => { if (pythonRunner && !pythonRunner.killed) pythonRunner.kill(); };
  process.once("exit", stopRunner);
  process.once("SIGINT", () => { stopRunner(); process.exit(130); });
  process.once("SIGTERM", () => { stopRunner(); process.exit(143); });
}

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);
