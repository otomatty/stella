/**
 * 招待されていないユーザー向けゲート画面。
 * テナント選択や自己登録は行わず、ログアウトのみ案内する。
 *
 * 本番は Cloudflare Access を通ったあとに出る — Access の許可の方針には入っているが、
 * STELLA に招待 (profiles の行) が無い。どのアカウントで入っているかが分かるよう、
 * メールアドレスが分からないときは Access の利用者情報 (`/cdn-cgi/access/get-identity`) から読む。
 */

import { useEffect, useState } from "react";

import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { isAccessMode } from "@/lib/auth-client";

interface Props {
  email: string;
  onSignOut: () => void;
}

/** Access の利用者情報からメールアドレスを読む (取れなければ空)。 */
function useAccessEmail(known: string): string {
  const [email, setEmail] = useState(known);
  useEffect(() => {
    if (known || !isAccessMode()) return;
    const ac = new AbortController();
    void fetch("/cdn-cgi/access/get-identity", {
      credentials: "same-origin",
      redirect: "manual",
      signal: ac.signal,
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ email?: unknown }>) : null))
      .then((identity) => {
        if (typeof identity?.email === "string") setEmail(identity.email);
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [known]);
  return email;
}

export function InviteRequiredScreen({ email, onSignOut }: Props) {
  const shownEmail = useAccessEmail(email);
  const access = isAccessMode();
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-[440px] bg-card border border-border rounded-md p-6">
        <Brand size="sm" />
        <h2 className="mt-5 text-[18px] font-semibold">招待が必要です</h2>
        <p className="text-[12.5px] leading-relaxed text-ink-3 mt-1.5">
          {access
            ? "Cloudflare Access へのログインはできていますが、このアカウントはまだ STELLA に招待されていません。管理者に招待を依頼してください。別のアカウントで使う場合は、ログアウトしてからログインし直してください。"
            : "このアカウントはまだ STELLA に招待されていません。管理者に連絡してください。"}
        </p>
        {shownEmail ? <p className="mt-3 text-[12.5px] text-ink-2">{shownEmail}</p> : null}
        <Button type="button" variant="accent" size="full" className="mt-5" onClick={onSignOut}>
          ログアウト
        </Button>
      </div>
    </div>
  );
}
