import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterChip } from "../FilterChip";

afterEach(() => {
  cleanup();
});

describe("FilterChip", () => {
  it("renders label only when valueSummary is null and toggles popover content on click", () => {
    render(
      <FilterChip label="ロール" valueSummary={null} ariaLabel="ロールフィルタ">
        <div>popover-body</div>
      </FilterChip>,
    );

    // 未選択: ラベルだけ表示、popover はまだ閉じている
    const trigger = screen.getByRole("button", { name: /ロール/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("popover-body")).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("popover-body")).not.toBeNull();
    expect(
      screen.getByRole("dialog", { name: "ロールフィルタ" }),
    ).not.toBeNull();
  });

  it("shows valueSummary next to label when filter is active", () => {
    render(
      <FilterChip
        label="ロール"
        valueSummary="管理者, スタッフ"
        ariaLabel="ロールフィルタ"
      >
        <div />
      </FilterChip>,
    );

    expect(screen.getByText("ロール")).not.toBeNull();
    expect(screen.getByText("管理者, スタッフ")).not.toBeNull();
  });

  it("invokes controlled onOpenChange when the trigger is clicked", () => {
    const onOpenChange = vi.fn();
    render(
      <FilterChip
        label="状態"
        valueSummary={null}
        ariaLabel="状態フィルタ"
        open={false}
        onOpenChange={onOpenChange}
      >
        <div />
      </FilterChip>,
    );

    fireEvent.click(screen.getByRole("button", { name: /状態/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
