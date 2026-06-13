import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MultiSelectFilterChip,
  type MultiSelectOption,
} from "../MultiSelectFilterChip";

const OPTIONS: ReadonlyArray<MultiSelectOption<"a" | "b" | "c">> = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

afterEach(() => {
  cleanup();
});

describe("MultiSelectFilterChip", () => {
  it("renders label only when value is empty", () => {
    render(
      <MultiSelectFilterChip
        label="ロール"
        ariaLabel="ロールフィルタ"
        options={OPTIONS}
        value={[]}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText("ロール")).not.toBeNull();
    expect(screen.queryByText("Alpha")).toBeNull();
  });

  it("summarizes selected option labels next to chip label", () => {
    render(
      <MultiSelectFilterChip
        label="ロール"
        ariaLabel="ロールフィルタ"
        options={OPTIONS}
        value={["a", "c"]}
        onChange={() => undefined}
      />,
    );

    // popover を開かなくても summary は chip 上に出る
    expect(screen.getByText("Alpha, Gamma")).not.toBeNull();
  });

  it("invokes onChange with the next array when a checkbox is toggled on", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectFilterChip
        label="ロール"
        ariaLabel="ロールフィルタ"
        options={OPTIONS}
        value={["a"]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ロール/ }));
    fireEvent.click(screen.getByLabelText("Beta"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("invokes onChange with the value removed when toggling off", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectFilterChip
        label="ロール"
        ariaLabel="ロールフィルタ"
        options={OPTIONS}
        value={["a", "b"]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ロール/ }));
    fireEvent.click(screen.getByLabelText("Alpha"));
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("uses formatSummary when provided", () => {
    render(
      <MultiSelectFilterChip
        label="ロール"
        ariaLabel="ロールフィルタ"
        options={OPTIONS}
        value={["a", "b"]}
        onChange={() => undefined}
        formatSummary={(sel) => `${sel.length}件選択`}
      />,
    );
    expect(screen.getByText("2件選択")).not.toBeNull();
  });
});
