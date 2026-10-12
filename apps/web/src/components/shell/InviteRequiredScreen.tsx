/**
 * 招待されていないユーザー向けゲート画面。
 * ログイン時に auth_users へ残った行がアクセス申請になる。テナント選択や自己登録はせず、ログアウトのみ案内する。
 *
 * 本番は Clerk でログインしたあとに出る — Clerk のアカウントはあるが、 STELLA に招待 (profiles の行)
 * が無い。どのアカウントで入っているかが分かるよう、メールアドレスを出す。
 */

import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";

interface Props {
  email: string;
  onSignOut: () => void;
}

export function InviteRequiredScreen({ email, onSignOut }: Props) {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-[440px] bg-card border border-border rounded-md p-6">
        <Brand size="sm" />
        <h2 className="mt-5 text-[18px] font-semibold">リクエストを送信しました</h2>
        <p className="text-[12.5px] leading-relaxed text-ink-3 mt-1.5">
          アクセスできるまで少々お待ちください。別のアカウントで使う場合は、ログアウトしてからログインし直してください。
        </p>
        {email ? <p className="mt-3 text-[12.5px] text-ink-2">{email}</p> : null}
        <Button type="button" variant="accent" size="full" className="mt-5" onClick={onSignOut}>
          ログアウト
        </Button>
      </div>
    </div>
  );
}
