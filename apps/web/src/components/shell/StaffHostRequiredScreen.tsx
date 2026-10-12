/**
 * 講師・管理者・営業のアカウントで受講者用の入口から開いたときの案内。
 *
 * 講師・管理者の操作は、Cloudflare Access (多要素認証) で守った講師・管理者用の入口
 * (`VITE_STAFF_ORIGIN`) を通ったときだけ API が受け付ける (Clerk のアカウントだけを奪われても、
 * 講師・管理者の操作はできないように)。
 */

import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { staffOrigin } from "@/lib/auth-client";

interface Props {
  onSignOut: () => void;
}

export function StaffHostRequiredScreen({ onSignOut }: Props) {
  const origin = staffOrigin();
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-[440px] bg-card border border-border rounded-md p-6">
        <Brand size="sm" />
        <h2 className="mt-5 text-[18px] font-semibold">講師・管理者用の入口から開いてください</h2>
        <p className="text-[12.5px] leading-relaxed text-ink-3 mt-1.5">
          講師・管理者・営業のアカウントは、講師・管理者用の入口からだけ使えます。入口では
          Cloudflare Access の確認 (多要素認証) を求められます。
        </p>
        <div className="mt-5 flex flex-col gap-2">
          {origin ? (
            <Button asChild variant="primary" size="full">
              <a href={`${origin}/`}>講師・管理者用の入口へ移る</a>
            </Button>
          ) : (
            <p className="rounded-md border border-border bg-sunken px-3 py-2 text-[12px] text-ink-2">
              講師・管理者用の入口の URL が設定されていません
              (VITE_STAFF_ORIGIN)。管理者に連絡してください。
            </p>
          )}
          <Button type="button" variant="outline" size="full" onClick={onSignOut}>
            ログアウト
          </Button>
        </div>
      </div>
    </div>
  );
}
