"use client";

import { Button, FormField, Input } from "@new-cursor/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { signIn } from "@/lib/auth-client";
import { sanitizeRedirectTarget } from "@/lib/redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = sanitizeRedirectTarget(searchParams.get("from"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError("メールアドレスまたはパスワードが正しくありません。");
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("メールアドレスまたはパスワードが正しくありません。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-4" onSubmit={onSubmit}>
      <FormField label="メールアドレス" required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            suppressHydrationWarning
          />
        )}
      </FormField>
      <FormField label="パスワード" required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            suppressHydrationWarning
          />
        )}
      </FormField>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" loading={loading}>
        サインイン
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <h1 className="text-2xl font-semibold">new-cursor</h1>
      <p className="mt-1 text-sm text-muted-foreground">スタッフ用ログイン</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
