"use client";

import { type MouseEvent as ReactMouseEvent, useEffect, useRef } from "react";

type Props = {
  label: string;
  onResize: (deltaX: number) => void;
};

export function ColumnResizeHandle({ label, onResize }: Props) {
  const draggingRef = useRef(false);
  const onResizeRef = useRef(onResize);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      if (!draggingRef.current) return;
      onResizeRef.current(event.movementX);
    }

    function handleMouseUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  function handleMouseDown(event: ReactMouseEvent<HTMLButtonElement>): void {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={handleMouseDown}
      className="group relative w-px shrink-0 cursor-col-resize border-0 bg-border p-0 transition-colors hover:bg-ring/60 active:bg-ring"
    >
      <span className="absolute inset-y-0 -left-1.5 -right-1.5" aria-hidden />
    </button>
  );
}
