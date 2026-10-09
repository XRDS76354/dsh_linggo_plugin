import { buildPlugin } from "./build.mjs";
import { checkPackage, PACKAGE_ROOT } from "./check-package.mjs";
import { runNpm } from "./npm-command.mjs";

await buildPlugin();
checkPackage();
const [pack] = JSON.parse(runNpm(["pack", "--json", "--ignore-scripts"], { cwd: PACKAGE_ROOT }));
console.log(`Release package ready: ${pack.filename}`);
