import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Python package shipped next to lib/ (and src/ during development). */
export const PYTHON_DIR = fileURLToPath(new URL("../python", import.meta.url));

const ENV_KEEP = ["PATH", "HOME", "USERPROFILE", "LANG", "LC_ALL", "TMPDIR", "TEMP", "TMP", "SYSTEMROOT", "PROJ_DATA", "PROJ_LIB"];

/** Explicit user action only: fixed package script, argument array, credential-free environment. */
export function setupPythonEnvironment({ root, python, signal, onProgress }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? Error("Cancelled"));
    const env = { DSH_HOME: dirname(root) };
    for (const key of ENV_KEEP) if (process.env[key]) env[key] = process.env[key];
    const script = fileURLToPath(new URL("../scripts/setup-python.mjs", import.meta.url));
    const child = spawn(process.execPath, [script, ...(python ? ["--python", python] : [])], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: process.platform !== "win32" });
    let tail = "";
    const abort = () => {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }).on("error", () => child.kill());
      else { try { process.kill(-child.pid, "SIGTERM"); } catch {} }
      reject(signal.reason ?? Error("Cancelled"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const receive = (value) => {
      tail = (tail + value.toString()).slice(-2000);
      onProgress?.(.5, "正在准备隔离 Python 环境与数据依赖…");
    };
    child.stdout.on("data", receive);
    child.stderr.on("data", receive);
    child.on("error", reject);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) return;
      if (code === 0) resolve({ ready: true });
      else reject(Error("Python 初始化失败。请安装 Python 3.10+ 并检查网络，或在设置中选择已有环境。\n" + tail.replace(/https?:\/\/\S+/g, "[package registry]").slice(-600)));
    });
  });
}

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
    let stopError;
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
      setTimeout(() => child.exitCode === null && child.signalCode === null && child.kill("SIGKILL"), 3000).unref();
    };
    // Keep project locks and staging directories alive until the worker releases its files.
    const stopWithError = (error) => {
      if (settled || stopError) return;
      stopError = error;
      kill();
    };
    const abort = () => {
      stopWithError(signal.reason ?? Error("Cancelled"));
    };
    const timer = setTimeout(() => {
      stopWithError(Error("数据处理超时"));
    }, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.on("error", (error) =>
      finish(reject, error.code === "ENOENT" ? Error(`找不到 Python：${python}。请先初始化插件 Python 环境。`) : error),
    );
    child.stdout.setEncoding("utf8");
    const receive = (line) => {
      if (settled || stopError || !line.trim()) return;
      let event;
      try {
        event = JSON.parse(line);
        if (!event || typeof event !== "object" || Array.isArray(event)) throw Error("Invalid event");
      } catch {
        stopWithError(Error("数据进程协议错误：输出不是合法 JSON 事件。请检查 Python 数据模块或自定义算法的标准输出。"));
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
      if (stopError) return finish(reject, stopError);
      if (result?.ok) return finish(resolve, result.value);
      if (result) return finish(reject, Error(result.error));
      const missing = /No module named '?([\w.]+)/.exec(stderr);
      if (missing) return finish(reject, Error(`Python 缺少模块 ${missing[1]}。请先初始化插件 Python 环境。`));
      finish(reject, Error(`数据进程异常退出（${code}）：${stderr.trim().split("\n").at(-1) ?? ""}`));
    });
    child.stdin.on("error", (error) => {
      if (error.code !== "EPIPE") stopWithError(error);
    });
    child.stdin.end(JSON.stringify(request));
  });
}
