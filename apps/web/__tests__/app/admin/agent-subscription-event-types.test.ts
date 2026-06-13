import { describe, expect, it } from "vitest";

import { toggleSubscriptionEventType } from "@/app/(admin)/_components/agent-subscription-event-types";

describe("toggleSubscriptionEventType", () => {
  it("adds an event type when checked", () => {
    expect(
      toggleSubscriptionEventType(["task_created"], "run_completed", true),
    ).toEqual(["task_created", "run_completed"]);
  });

  it("removes an event type when unchecked", () => {
    expect(
      toggleSubscriptionEventType(
        ["task_created", "run_completed"],
        "task_created",
        false,
      ),
    ).toEqual(["run_completed"]);
  });

  it("is idempotent when adding an existing event type", () => {
    expect(
      toggleSubscriptionEventType(["task_created"], "task_created", true),
    ).toEqual(["task_created"]);
  });
});
