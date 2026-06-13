export const THEME_STORAGE_KEY = "theme";

export type ThemePreference = "light" | "dark" | "system";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function resolveDark(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle("dark", resolveDark(preference));
}

export function setTheme(preference: ThemePreference): void {
  localStorage.setItem(THEME_STORAGE_KEY, preference);
  applyTheme(preference);
}

/** 現在の見た目の反対を明示 preference として保存する。 */
export function toggleTheme(): ThemePreference {
  const next: ThemePreference = resolveDark(getStoredTheme())
    ? "light"
    : "dark";
  setTheme(next);
  return next;
}

export const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(s==="dark"||(s!=="light"&&d))document.documentElement.classList.add("dark")}catch(e){}})();`;
