import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Python package shipped next to lib/ (and src/ during development). */
export const PYTHON_DIR = fileURLToPath(new URL("../python", import.meta.url));

const ENV_KEEP = ["PATH", "HOME", "USERPROFILE", "LANG", "LC_ALL", "TMPDIR", "TEMP", "TMP", "SYSTEMROOT", "PROJ_DATA", "PROJ_LIB"];

/** The plugin venv under the LingGo root wins, then a configured path, then the system interpreter. */
export function resolvePython(root, configured) {
  if (configured) return configured;
  const venv = process.platform === "win32" ? join(root, "venv", "Scripts", "python.exe") : join(root, "venv", "bin", "python");
  if (existsSync(venv)) return venv;
  return process.platform === "win32" ? "python" : "python3";
}

/**
 * Run one worker request. Only an allowlisted environment reaches Python, so DSH model
 * credentials in the Host environment never do.
 */
export function runWorker({ python, request, signal, onProgress, timeoutMs = 30 * 60_000 }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? Error("Cancelled"));
    const env = { PYTHONPATH: PYTHON_DIR, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1", PYTHONUTF8: "1" };
    for (const key of ENV_KEEP) if (process.env[key]) env[key] = process.env[key];
    let child;
    try {
      child = spawn(python, ["-m", "linggo_data"], { env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    } catch (error) {
      return reject(error);
    }
    let buffer = "";
    let stderr = "";
    let result;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      fn(value);
    };
    const kill = () => {
      child.kill("SIGTERM");
      setTimeout(() => child.exitCode === null && child.kill("SIGKILL"), 3000).unref();
    };
    const abort = () => {
      kill();
      finish(reject, signal.reason ?? Error("Cancelled"));
    };
    const timer = setTimeout(() => {
      kill();
      finish(reject, Error("数据处理超时"));
    }, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    child.on("error", (error) =>
      finish(reject, error.code === "ENOENT" ? Error(`找不到 Python：${python}。请先初始化插件 Python 环境。`) : error),
    );
    child.stdout.setEncoding("utf8");
    const receive = (line) => {
      if (settled || !line.trim()) return;
      let event;
      try {
        event = JSON.parse(line);
        if (!event || typeof event !== "object" || Array.isArray(event)) throw Error("Invalid event");
      } catch {
        kill();
        finish(reject, Error("数据进程协议错误：输出不是合法 JSON 事件。请检查 Python 数据模块或自定义算法的标准输出。"));
        return;
      }
      if (event.event === "progress") onProgress?.(event.value, event.message);
      else if (event.event === "result") result = event;
    };
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        receive(line);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on("close", (code) => {
      receive(buffer);
      if (result?.ok) return finish(resolve, result.value);
      if (result) return finish(reject, Error(result.error));
      const missing = /No module named '?([\w.]+)/.exec(stderr);
      if (missing) return finish(reject, Error(`Python 缺少模块 ${missing[1]}。请先初始化插件 Python 环境。`));
      finish(reject, Error(`数据进程异常退出（${code}）：${stderr.trim().split("\n").at(-1) ?? ""}`));
    });
    child.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") finish(reject, error);
    });
    child.stdin.end(JSON.stringify(request));
  });
}
