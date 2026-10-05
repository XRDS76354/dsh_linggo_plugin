import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
test("built client follows the DSH loader factory contract", async () => {
  let registration;
  vm.runInNewContext(
    await readFile(new URL("../lib/client.js", import.meta.url), "utf8"),
    {
      window: {
        __ModuleLoader__: {
          load: (r) => {
            registration = r;
          },
        },
      },
    },
  );
  assert.equal(registration.id, "dsh-linggo-plugin");
  const exported = registration.factory((name) => {
    assert.equal(name, "react");
    return { createElement() {}, useState() {}, useEffect() {} };
  });
  assert.equal(typeof exported.apply, "function");
  assert.ok(exported.inject.includes("connection"));
});
