import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

/** Execute npm without attempting to spawn a Windows batch file as an executable. */
export function runNpm(args, options = {}) {
  const cli = [
    process.env.npm_execpath,
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
    join(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
  ].find((path) => path && /[\\/]npm-cli\.js$/.test(path) && existsSync(path));
  const opts = { encoding: "utf8", windowsHide: true, ...options };
  if (cli) return execFileSync(process.execPath, [cli, ...args], opts);
  if (process.platform !== "win32") return execFileSync("npm", args, opts);
  // Only fixed command/option tokens are accepted by the shell fallback.
  if (args.some((arg) => !/^[\w:=-]+$/.test(arg))) throw Error("Unsupported npm argument for Windows fallback");
  return execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm.cmd ${args.join(" ")}`], opts);
}
