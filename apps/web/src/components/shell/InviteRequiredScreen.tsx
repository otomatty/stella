/**
 * 招待されていないユーザー向けゲート画面。
 * テナント選択や自己登録は行わず、ログアウトのみ案内する。
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
        <h2 className="mt-5 text-[18px] font-semibold">招待が必要です</h2>
        <p className="text-[12.5px] leading-relaxed text-ink-3 mt-1.5">
          ログインはできていますが、このアカウントはまだ STELLA
          に招待されていません。管理者に招待を依頼してください。別のアカウントで使う場合は、ログアウトしてからログインし直してください。
        </p>
        {email ? <p className="mt-3 text-[12.5px] text-ink-2">{email}</p> : null}
        <Button type="button" variant="accent" size="full" className="mt-5" onClick={onSignOut}>
          ログアウト
        </Button>
      </div>
    </div>
  );
}
