import { describe, expect, it } from "vitest";

import { useButton } from "../use-button";

describe("useButton", () => {
  it("marks the button disabled while loading", () => {
    const { buttonProps, isLoading } = useButton({ loading: true });
    expect(buttonProps.disabled).toBe(true);
    expect(isLoading).toBe(true);
  });

  it("lets caller className win via tailwind-merge", () => {
    const { buttonProps } = useButton({ className: "px-8" });
    expect(buttonProps.className).toContain("px-8");
    expect(buttonProps.className).not.toContain("px-3");
  });
});
