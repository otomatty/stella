/**
 * 「設定」— 全ロール共通のユーザー設定画面。
 *
 * ユーザー名 (profiles.display_name) の変更ができる。 ユーザー名は登録 (初回 Google ログイン)
 * 時に Google アカウントの氏名から自動で入るため、 ここは「上書きしたい人だけが使う」画面。
 * 一度保存すると name_source='user' になり、 以後の Google ログインでは上書きされない。
 *
 * メール / ロール / 所属テナントは招待とログインが真実なので読み取り専用で見せる。
 * テナント管理者にはテナント設定 (テストモード) も同じ画面に並べる。
 * 教材の OS 別の手順で既定に開く OS (profiles.os_preference) もここで変える。
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { isOsName, OS_LABELS, OS_NAMES, type OsName } from "@stella/shared/markdown/os-blocks";
import { Loader2, Save } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { TenantSettingsCard } from "@/components/admin/TenantSettingsCard";
import { LearningPacePanel } from "@/components/learner/LearningPacePanel";
import { LearningPaceManager } from "@/components/instructor/LearningPaceManager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateMyDisplayName, type Profile } from "@/lib/auth";
import { detectBrowserOs, setViewOs, updateMyOsPreference } from "@/lib/os-preference";
import type { Role } from "@/data/types";

/** サーバ側 (POST /api/me) と揃える。 */
const MAX_NAME_LENGTH = 50;

const ROLE_LABELS: Record<string, string> = {
  student: "受講者",
  instructor: "講師",
  admin: "テナント管理者",
  platform_admin: "プラットフォーム管理者",
};

interface SettingsPageProps {
  role: Role;
  profile: Profile | null;
  tenantName: string;
  backendEnabled: boolean;
  /** 保存後に /api/me を取り直して、 サイドバー等の表示名を更新する。 */
  onProfileUpdated: () => Promise<void>;
}

export const SettingsPage = ({
  role,
  profile,
  tenantName,
  backendEnabled,
  onProfileUpdated,
}: SettingsPageProps) => (
  <>
    <PageHeader
      title="設定"
      sub={role === "admin" ? `アカウント / ${tenantName} のテナント設定` : "アカウント設定"}
    />
    <div className="max-w-[720px] flex flex-col gap-5">
      <AccountCard
        profile={profile}
        tenantName={tenantName}
        backendEnabled={backendEnabled}
        onProfileUpdated={onProfileUpdated}
      />
      {backendEnabled && profile ? (
        <OsPreferenceCard profile={profile} onProfileUpdated={onProfileUpdated} />
      ) : null}
      {backendEnabled && profile && role !== "sales" && role !== "instructor" ? (
        <LearningPacePanel key={profile.id} onSaved={onProfileUpdated} />
      ) : null}
      {backendEnabled && role === "admin" ? <LearningPaceManager admin /> : null}
      {role === "admin" ? <TenantSettingsCard backendEnabled={backendEnabled} /> : null}
    </div>
  </>
);

interface AccountCardProps {
  profile: Profile | null;
  tenantName: string;
  backendEnabled: boolean;
  onProfileUpdated: () => Promise<void>;
}

const AccountCard = ({
  profile,
  tenantName,
  backendEnabled,
  onProfileUpdated,
}: AccountCardProps) => {
  const savedName = profile?.display_name ?? "";
  const [name, setName] = useState(savedName);
  const [saving, setSaving] = useState(false);

  // profile は初回ロード後に届くので、 サーバ側の値が変わったら入力欄に反映し直す。
  useEffect(() => {
    setName(savedName);
  }, [savedName]);

  const trimmed = name.trim();
  const tooLong = trimmed.length > MAX_NAME_LENGTH;
  const canSave =
    backendEnabled && !saving && trimmed.length > 0 && !tooLong && trimmed !== savedName;

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateMyDisplayName(trimmed);
      await onProfileUpdated();
      toast.success("ユーザー名を保存しました");
    } catch (err) {
      console.error("[SettingsPage] save failed", err);
      toast.error(err instanceof Error ? err.message : "ユーザー名の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const initials = profile?.initials ?? (trimmed || "U").slice(0, 2).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>アカウント</CardTitle>
      </CardHeader>
      <CardContent>
        {!backendEnabled ? (
          <div className="mb-4 text-[12.5px] text-ink-3">
            アカウント設定はバックエンド接続時に利用できます (現在はデモ表示です)。
          </div>
        ) : null}

        <div className="flex items-center gap-3 mb-5">
          <Avatar size="lg">
            {profile?.avatar_url ? (
              // referrerPolicy: googleusercontent は Referer 付きだと 403 を返すことがある。
              <AvatarImage src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 text-[12.5px] text-ink-3">
            <div>{profile?.email ?? "—"}</div>
            <div>
              {tenantName}
              {profile ? ` ・ ${ROLE_LABELS[profile.role] ?? profile.role}` : ""}
            </div>
            <div className="text-[11.5px] text-ink-4">
              プロフィール画像は Google アカウントのものを使用します。
            </div>
          </div>
        </div>

        <div className="max-w-[360px]">
          <Label htmlFor="account-display-name">ユーザー名</Label>
          <Input
            id="account-display-name"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            disabled={!backendEnabled || saving}
            placeholder="山田 太郎"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSave();
            }}
          />
          <p className="mt-1.5 text-[11.5px] text-ink-3 leading-relaxed">
            登録時に Google アカウントの名前が自動で設定されます。 ここで変更すると、 以降の Google
            ログインでは上書きされません。 ステージ内の投稿者名や修了証にも使われます。
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button variant="accent" disabled={!canSave} onClick={() => void onSave()}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            保存
          </Button>
          {trimmed !== savedName && trimmed.length > 0 && !tooLong ? (
            <span className="text-[11.5px] text-ink-3">未保存の変更があります</span>
          ) : null}
        </div>

        <div className="mt-4 pt-4 border-t border-border text-[11.5px] text-ink-4">
          メールアドレス・ロール・所属は管理者が管理します。
          変更が必要な場合は管理者へ依頼してください。
        </div>
      </CardContent>
    </Card>
  );
};

/** 教材の OS 別の手順 (07 §11) で既定に開く OS。選んだ時点で保存する。 */
const OsPreferenceCard = ({
  profile,
  onProfileUpdated,
}: {
  profile: Profile;
  onProfileUpdated: () => Promise<void>;
}) => {
  const [saving, setSaving] = useState(false);
  const detected = detectBrowserOs();
  const saved = profile.os_preference ?? null;

  const onChange = async (value: string) => {
    const next = isOsName(value) ? value : null;
    if (next === saved) return;
    setSaving(true);
    try {
      await updateMyOsPreference(next);
      setViewOs(profile.id, null);
      await onProfileUpdated();
      toast.success("教材の OS を保存しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "教材の OS を保存できませんでした");
    } finally {
      setSaving(false);
    }
  };

  const options: { value: "auto" | OsName; label: string }[] = [
    {
      value: "auto",
      label: detected
        ? `自動 (この端末から判定: ${OS_LABELS[detected]})`
        : "自動 (判定できないときは Windows)",
    },
    ...OS_NAMES.map((os) => ({ value: os, label: OS_LABELS[os] })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>教材の OS</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-[12.5px] text-ink-3 leading-relaxed">
          まとめと課題文の OS ごとの手順を、最初にどの OS のタブで開くかを選びます。
          教材のタブを切り替えると、ほかの OS の手順も読めます。
        </p>
        <RadioGroup
          value={saved ?? "auto"}
          disabled={saving}
          onValueChange={(value) => void onChange(value)}
          aria-label="教材の OS"
        >
          {options.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`os-preference-${option.value}`} />
              <Label htmlFor={`os-preference-${option.value}`} className="mb-0 font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};
