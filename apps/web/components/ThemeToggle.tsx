"use client";

import { Button } from "@new-cursor/ui";
import { useEffect, useState } from "react";

import {
  getStoredTheme,
  resolveDark,
  setTheme,
  toggleTheme,
} from "@/lib/theme";

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(resolveDark(getStoredTheme()));
    sync();
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getStoredTheme() === "system") sync();
    };
    media.addEventListener("change", onMediaChange);
    return () => media.removeEventListener("change", onMediaChange);
  }, []);

  function handleToggle() {
    toggleTheme();
    setIsDark(resolveDark(getStoredTheme()));
  }

  function handleSystemReset() {
    setTheme("system");
    setIsDark(resolveDark("system"));
  }

  if (!mounted) {
    return null;
  }

  const stored = getStoredTheme();

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        aria-label={isDark ? "ライトモードに切替" : "ダークモードに切替"}
        className="justify-start gap-2"
      >
        <span aria-hidden>{isDark ? "☀️" : "🌙"}</span>
        {isDark ? "ライト" : "ダーク"}
      </Button>
      {stored !== "system" ? (
        <button
          type="button"
          onClick={handleSystemReset}
          className="mt-1 w-full px-2 py-0.5 text-left text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          システム設定に戻す
        </button>
      ) : null}
    </div>
  );
}
