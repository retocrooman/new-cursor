import { describe, expect, it } from "vitest";

import {
  parseCreateTaskAction,
  stripCreateTaskAction,
} from "@/lib/commander/parse-task-action";

describe("parseCreateTaskAction", () => {
  it("extracts create_task JSON with background and verification", () => {
    const reply =
      '起票します。\n{"action":"create_task","title":"Fix bug","branchName":"fix/bug","repositoryId":null,"background":"Login fails","verificationItems":["Manual test","Unit test"]}';
    const action = parseCreateTaskAction(reply);
    expect(action).toEqual({
      action: "create_task",
      title: "Fix bug",
      branchName: "fix/bug",
      repositoryId: null,
      background: "Login fails",
      verificationItems: "Manual test\nUnit test",
    });
    expect(stripCreateTaskAction(reply)).toBe("起票します。");
  });

  it("extracts create_task JSON from reply", () => {
    const reply =
      '起票します。\n{"action":"create_task","title":"Fix bug","branchName":"fix/bug","repositoryId":null}';
    const action = parseCreateTaskAction(reply);
    expect(action).toEqual({
      action: "create_task",
      title: "Fix bug",
      branchName: "fix/bug",
      repositoryId: null,
      background: null,
      verificationItems: null,
    });
    expect(stripCreateTaskAction(reply)).toBe("起票します。");
  });

  it("returns null when JSON is missing", () => {
    expect(parseCreateTaskAction("確認だけ")).toBeNull();
  });
});
