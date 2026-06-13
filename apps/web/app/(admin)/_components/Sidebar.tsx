"use client";

import type { UserRole } from "@new-cursor/db/schema";
import { Button } from "@new-cursor/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { signOut } from "@/lib/auth-client";

const SIDEBAR_STORAGE_KEY = "sidebar-expanded";

function getStoredSidebarExpanded(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function setStoredSidebarExpanded(expanded: boolean): void {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded));
}

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "ホーム", href: "/" },
  { label: "エージェント", href: "/agents" },
];

type Props = {
  user: {
    name?: string | null;
    email: string;
  };
  role: UserRole | null;
};

export function Sidebar({ user, role }: Props) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(getStoredSidebarExpanded());
  }, []);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      setStoredSidebarExpanded(next);
      return next;
    });
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.assign("/login");
          },
        },
      });
    } catch {
      setSignOutError(
        "ログアウトに失敗しました。時間をおいて再試行してください。",
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out ${
        expanded ? "w-52" : "w-12"
      }`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? "サイドバーを閉じる" : "サイドバーを開く"}
        className={`flex w-full shrink-0 items-center border-b border-border text-left transition-colors hover:bg-surface-hover ${
          expanded ? "gap-2 px-4 py-5" : "justify-center px-0 py-5"
        }`}
      >
        {expanded ? (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              new-cursor
            </span>
            <span
              aria-hidden
              className="text-xs text-muted-foreground"
              title="閉じる"
            >
              ‹
            </span>
          </>
        ) : (
          <span
            className="text-[10px] font-semibold leading-tight tracking-tight text-foreground [writing-mode:vertical-rl]"
            title="new-cursor"
          >
            nc
          </span>
        )}
      </button>
      {expanded ? (
        <>
          {role ? (
            <div className="px-4 pb-3 text-xs text-muted-foreground">
              {role}
            </div>
          ) : null}
          <nav
            className="flex-1 overflow-y-auto px-2"
            aria-label="メインナビゲーション"
          >
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-t border-border px-3 py-3">
            <ThemeToggle className="mb-3 w-full" />
            <div
              className="mb-2 truncate text-xs text-muted-foreground"
              title={user.email}
            >
              {user.name ?? user.email}
            </div>
            {signOutError ? (
              <p
                className="mb-2 text-xs text-destructive"
                role="alert"
                aria-live="polite"
              >
                {signOutError}
              </p>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              loading={signingOut}
              className="w-full justify-start"
            >
              ログアウト
            </Button>
          </div>
        </>
      ) : null}
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={
        isActive
          ? "block rounded-md bg-surface-active px-3 py-1.5 text-sm font-medium text-foreground"
          : "block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
      }
    >
      {item.label}
    </Link>
  );
}
