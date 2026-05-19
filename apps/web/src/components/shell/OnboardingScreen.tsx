/**
 * Magic Link 初回サインイン直後、 `profiles` 行が無い状態で開かれるオンボーディング画面。
 *
 * テナント選択 + 表示名入力で `profiles` 行を作成する (デフォルト role='student')。
 * 管理者 / 講師ロールへの昇格は Supabase SQL Editor から手動で行う前提 (README 参照)。
 */

import { useState } from "react";
import { toast } from "sonner";

import { Brand } from "@/components/common/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TENANTS } from "@/data/fixtures";
import { ensureProfile } from "@/lib/auth";

interface Props {
  userId: string;
  email: string | undefined;
  onCompleted: () => Promise<void> | void;
}

export function OnboardingScreen({ userId, email, onCompleted }: Props) {
  const [tenantId, setTenantId] = useState(TENANTS[0]?.id ?? "ses");
  const [displayName, setDisplayName] = useState(email?.split("@")[0] ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      await ensureProfile({
        userId,
        tenantId,
        displayName: displayName.trim() || "ゲスト",
        email,
      });
      await onCompleted();
    } catch (err) {
      toast.error(`プロフィール作成失敗: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-[440px] bg-card border border-border rounded-md p-6">
        <Brand size="sm" />
        <h2 className="mt-5 text-[18px] font-semibold">ようこそ FALCON へ</h2>
        <p className="text-[12.5px] text-ink-3 mt-1.5">
          所属テナントと表示名を選んでアカウントを作成します。 管理者 / 講師ロールへの変更は、 サインアップ後に管理画面で行われます。
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-5 flex flex-col gap-4">
          <div>
            <Label htmlFor="onb-tenant">テナント</Label>
            <select
              id="onb-tenant"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value as typeof tenantId)}
              className="h-10 w-full rounded-sm border border-input bg-card px-3 text-sm"
            >
              {TENANTS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="onb-name">表示名</Label>
            <Input
              id="onb-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例: 田中 翔太"
            />
          </div>
          <Button type="submit" variant="accent" size="full" disabled={submitting}>
            {submitting ? "作成中…" : "登録"}
          </Button>
        </form>
      </div>
    </div>
  );
}
