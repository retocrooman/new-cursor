"use client";

import type { UserRole } from "@new-cursor/db/schema";
import { Button } from "@new-cursor/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";

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
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="px-4 py-5">
        <div className="text-sm font-semibold text-zinc-900">new-cursor</div>
        {role ? <div className="mt-1 text-xs text-zinc-500">{role}</div> : null}
      </div>
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
      <div className="border-t border-zinc-200 px-3 py-3">
        <div className="mb-2 truncate text-xs text-zinc-500" title={user.email}>
          {user.name ?? user.email}
        </div>
        {signOutError ? (
          <p
            className="mb-2 text-xs text-red-600"
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
          ? "block rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900"
          : "block rounded-md px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100"
      }
    >
      {item.label}
    </Link>
  );
}
