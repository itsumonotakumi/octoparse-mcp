import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { unwrap } from "./octoparse-client.js";

describe("unwrap", () => {
  it("unwraps legacy wrapped response", () => {
    const raw = {
      data: [{ taskGroupId: 1, taskGroupName: "Group1" }],
      error: "success",
      error_Description: "",
    };
    const result = unwrap(raw);
    assert.deepEqual(result, [{ taskGroupId: 1, taskGroupName: "Group1" }]);
  });

  it("throws on legacy wrapped error response", () => {
    const raw = {
      data: null,
      error: "failed",
      error_Description: "Something went wrong",
    };
    assert.throws(() => unwrap(raw), /Something went wrong/);
  });

  it("returns direct array response as-is", () => {
    const raw = [{ taskGroupId: 1, taskGroupName: "Group1" }];
    const result = unwrap(raw);
    assert.deepEqual(result, [{ taskGroupId: 1, taskGroupName: "Group1" }]);
  });

  it("returns direct object response as-is", () => {
    const raw = { total: 100, offset: 0, dataList: [] };
    const result = unwrap(raw);
    assert.deepEqual(result, { total: 100, offset: 0, dataList: [] });
  });

  it("does not misidentify data with 'data' and non-string 'error' keys", () => {
    // A data object that happens to have "data" and "error" keys
    // but "error" is not a string — should NOT be treated as wrapped
    const raw = { data: "some value", error: 42 };
    const result = unwrap(raw);
    assert.deepEqual(result, { data: "some value", error: 42 });
  });

  it("does not misidentify data with 'data' key but no 'error' key", () => {
    const raw = { data: [1, 2, 3], total: 3 };
    const result = unwrap(raw);
    assert.deepEqual(result, { data: [1, 2, 3], total: 3 });
  });
});
