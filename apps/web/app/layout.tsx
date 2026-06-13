import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "monorepo-template",
  description: "kecakjp monorepo template",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className="bg-zinc-50 text-zinc-900 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
