import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { clerkErrorMessage, completeOAuthRedirect } from "@/lib/clerk";

/**
 * Google でのログインから戻る場所 (Clerk の `redirectUrl`)。Clerk がサインイン (初めてならサインアップ)
 * を仕上げてセッションを作り、ホームへ移す。認証付きシェルの外に置く (戻った時点ではまだログイン前)。
 */
export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void completeOAuthRedirect().catch((err: unknown) => setError(clerkErrorMessage(err)));
  }, []);
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-[400px] bg-card border border-border rounded-md p-6">
        <Brand size="sm" />
        {error ? (
          <>
            <h2 className="mt-5 text-[18px] font-semibold">ログインを完了できませんでした</h2>
            <p className="mt-2 text-[12.5px] text-ink-2 break-words">{error}</p>
            <Button asChild variant="primary" size="full" className="mt-5">
              <a href="/">ログイン画面へ戻る</a>
            </Button>
          </>
        ) : (
          <p className="mt-5 text-[13px] text-ink-3">ログインしています…</p>
        )}
      </div>
    </div>
  );
}
