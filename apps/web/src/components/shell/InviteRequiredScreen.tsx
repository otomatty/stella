/**
 * 招待されていないユーザー向けゲート画面。
 * テナント選択や自己登録は行わず、ログアウトのみ案内する。
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
        <p className="text-[12.5px] text-ink-3 mt-1.5">
          招待が必要です。管理者に連絡してください。
        </p>
        <p className="mt-3 text-[12.5px] text-ink-2">{email}</p>
        <Button
          type="button"
          variant="accent"
          size="full"
          className="mt-5"
          onClick={onSignOut}
        >
          ログアウト
        </Button>
      </div>
    </div>
  );
}
