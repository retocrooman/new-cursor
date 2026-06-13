import { describe, expect, it } from "vitest";

import {
  parseRecordDecisionActions,
  stripRecordDecisionActions,
} from "../src/parse-record-decision";

describe("parseRecordDecisionActions", () => {
  it("extracts record_decision JSON with all fields", () => {
    const text =
      '記録します。\n{"action":"record_decision","taskId":"550e8400-e29b-41d4-a716-446655440000","summary":"API方針","context":"REST vs GraphQL","userResponse":"RESTで進める"}';
    expect(parseRecordDecisionActions(text)).toEqual([
      {
        action: "record_decision",
        taskId: "550e8400-e29b-41d4-a716-446655440000",
        summary: "API方針",
        context: "REST vs GraphQL",
        userResponse: "RESTで進める",
      },
    ]);
    expect(stripRecordDecisionActions(text)).toBe("記録します。");
  });

  it("extracts multiple record_decision blocks", () => {
    const text = [
      '{"action":"record_decision","summary":"first","context":null}',
      '{"action":"record_decision","summary":"second","userResponse":"yes"}',
    ].join("\n");
    expect(parseRecordDecisionActions(text)).toHaveLength(2);
    expect(parseRecordDecisionActions(text)[0]?.summary).toBe("first");
    expect(parseRecordDecisionActions(text)[1]?.userResponse).toBe("yes");
  });

  it("returns empty array when JSON is missing", () => {
    expect(parseRecordDecisionActions("確認だけ")).toEqual([]);
  });
});
