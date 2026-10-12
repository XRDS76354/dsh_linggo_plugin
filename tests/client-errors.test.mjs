import test from "node:test";
import assert from "node:assert/strict";
import { clientError } from "../src/client-errors.js";
import { zh } from "../src/locales.js";
test("new management API 404 explains that the Host must restart, without retrying deletion", () => {
  for (const operation of [
    "previewDeleteData",
    "deleteData",
    "setJobsHidden",
  ]) {
    const error = clientError(
      operation,
      new Error(`transport failure for /api/linggo.${operation}: HTTP 404`),
      (k) => zh[k],
    );
    assert.match(error.message, /完整退出/);
    assert.match(error.message, /没有删除任何数据/);
  }
});
test("ordinary business errors and unrelated 404s retain the original error", () => {
  for (const [operation, message] of [
    ["state", "HTTP 404"],
    ["deleteData", "数据或关联结果已变化，请重新确认删除"],
    ["previewDeleteData", "HTTP 500"],
    ["setJobsHidden", "只能清理已完成、失败或已取消的任务"],
  ]) {
    const error = new Error(message);
    assert.equal(
      clientError(operation, error, () => "restart"),
      error,
    );
  }
});
