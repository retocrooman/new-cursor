import "server-only";

import type { UserRole } from "@new-cursor/db/schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchUserRole } from "@/lib/orpc/context";
import { AppQueryClientProvider } from "@/lib/query/query-client-provider";
import { sanitizeRedirectTarget } from "@/lib/redirect";

import { Sidebar } from "./_components/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await safeGetSession();
  if (!session) {
    const requestHeaders = await headers();
    const pathname = requestHeaders.get("x-pathname") ?? "/";
    const from = sanitizeRedirectTarget(pathname);
    const target =
      from === "/" ? "/login" : `/login?from=${encodeURIComponent(from)}`;
    redirect(target);
  }
  const role = await safeResolveRole(session.user.id);
  return (
    <AppQueryClientProvider>
      <NuqsAdapter>
        <div className="flex h-screen overflow-hidden">
          <Sidebar user={session.user} role={role} />
          <main className="min-h-0 flex-1 overflow-hidden bg-white">
            {children}
          </main>
        </div>
      </NuqsAdapter>
    </AppQueryClientProvider>
  );
}

async function safeGetSession() {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

async function safeResolveRole(userId: string): Promise<UserRole | null> {
  try {
    return await fetchUserRole(db, userId);
  } catch {
    return null;
  }
}
