import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  INTEGRATION_SCOPES,
  INTEGRATION_SCOPE_DESCRIPTIONS,
  type IntegrationClient,
  type IntegrationGroup,
  type IntegrationScope,
} from "@stella/shared/integrations/types";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Copy, Plus } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { syncIntegrationClientDraft } from "./integrations-admin-draft";
import { PageHeader } from "@/components/common/PageHeader";

const ROOT = "/api/admin/integrations";
const BUTTON_CLASS = "min-h-11";
const LAST_USED_FORMAT = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
export function IntegrationsAdmin() {
  const nameId = useId();
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<IntegrationScope[]>([]);
  const [prefixes, setPrefixes] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ name: string; rows: IntegrationGroup[] } | null>(null);
  const load = useCallback(async () => {
    const data = await apiFetch<{ clients: IntegrationClient[] }>(ROOT);
    setClients(data.clients);
  }, []);
  useEffect(() => {
    void load().catch(() => setError("一覧の取得に失敗しました"));
  }, [load]);
  const mutate = async (path: string, method: "POST" | "PATCH", body?: object) => {
    setBusy(true);
    setError(null);
    setToken(null);
    try {
      const data = await apiFetch<{ token?: string }>(path, { method, body });
      if (data.token) setToken(data.token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作に失敗しました");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader title="外部連携" sub="連携クライアントとグループを管理します" />
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive"
        >
          {error}
        </div>
      ) : null}
      {token ? (
        <Card role="status" className="mb-6 border-warning">
          <CardHeader className="bg-warning-soft">
            <AlertTriangle size={18} className="shrink-0 text-warning" aria-hidden="true" />
            <CardTitle>トークンはこの画面で一度だけ表示します</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[13px] text-ink-2">
              画面を閉じる前にコピーして、安全な場所に保存してください。
            </p>
            <fieldset className="flex min-w-0 items-start gap-2">
              <legend className="sr-only">発行したトークン</legend>
              <code className="min-w-0 flex-1 select-all whitespace-pre-wrap break-all rounded-sm border border-input bg-sunken px-3 py-2.5 font-mono text-[13px] leading-6">
                {token}
              </code>
              <Button
                type="button"
                className={cn(BUTTON_CLASS, "shrink-0")}
                onClick={() => {
                  void navigator.clipboard
                    .writeText(token)
                    .then(() => toast.success("コピーしました"))
                    .catch(() =>
                      toast.error("コピーできませんでした。トークンを選択してコピーしてください"),
                    );
                }}
              >
                <Copy size={14} aria-hidden="true" />
                コピー
              </Button>
            </fieldset>
            <Button
              type="button"
              variant="outline"
              className={BUTTON_CLASS}
              onClick={() => setToken(null)}
            >
              閉じる
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>連携クライアントを作る</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(ROOT, "POST", {
                name,
                scopes,
                allowedStagePrefixes: prefixList(prefixes),
              });
            }}
          >
            <div className="max-w-md">
              <Label htmlFor={nameId}>クライアント名</Label>
              <Input
                id={nameId}
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-11"
              />
            </div>
            <PrefixEditor value={prefixes} onChange={setPrefixes} disabled={busy} />
            <ScopeEditor value={scopes} onChange={setScopes} disabled={busy} />
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                type="submit"
                variant="accent"
                className={BUTTON_CLASS}
                disabled={busy || !name.trim()}
              >
                <Plus size={14} aria-hidden="true" />
                連携クライアントを作る
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            busy={busy}
            onUpdate={(body) => void mutate(`${ROOT}/${client.id}`, "PATCH", body)}
            onRotate={() => {
              if (window.confirm("古いトークンは使えなくなります。作り直しますか？"))
                void mutate(`${ROOT}/${client.id}/rotate`, "POST");
            }}
            onGroups={() => {
              void apiFetch<{ groups: IntegrationGroup[] }>(`${ROOT}/${client.id}/groups`)
                .then((data) => setGroups({ name: client.name, rows: data.groups }))
                .catch(() => setError("グループの取得に失敗しました"));
            }}
          />
        ))}
      </div>
      {groups ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="min-w-0 break-all">{groups.name} のグループ</CardTitle>
          </CardHeader>
          <CardContent>
            {groups.rows.length ? (
              <ul className="divide-y divide-border">
                {groups.rows.map((group) => (
                  <li
                    key={group.id}
                    className="flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="break-all text-[13px] font-medium">{group.name}</p>
                      <p className="break-all font-mono text-xs text-ink-3">{group.key}</p>
                    </div>
                    <Badge className="shrink-0">{group.memberCount} 人</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-[13px] text-ink-3">グループはありません</p>
            )}
            <div className="mt-4 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className={BUTTON_CLASS}
                onClick={() => setGroups(null)}
              >
                閉じる
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
function ClientCard({
  client,
  busy,
  onUpdate,
  onRotate,
  onGroups,
}: {
  client: IntegrationClient;
  busy: boolean;
  onUpdate: (body: object) => void;
  onRotate: () => void;
  onGroups: () => void;
}) {
  const [draft, setDraft] = useState(() => syncIntegrationClientDraft(null, client));
  useEffect(() => setDraft((previous) => syncIntegrationClientDraft(previous, client)), [client]);
  const { prefixes, scopes } = draft;
  return (
    <Card className={cn(!client.enabled && "border-warning")}>
      <CardHeader className={cn(!client.enabled && "bg-warning-soft")}>
        <CardTitle className="min-w-0 flex-1 break-all">{client.name}</CardTitle>
        <Badge variant={client.enabled ? "success" : "warning"}>
          {client.enabled ? "有効" : "停止中"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-4 text-[13px] sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="mb-1 text-xs text-ink-3">トークンの先頭</dt>
            <dd className="break-all font-mono text-ink-2">{client.tokenPrefix}…</dd>
          </div>
          <div className="min-w-0">
            <dt className="mb-1 text-xs text-ink-3">最後に使った日時（日本時間）</dt>
            <dd className="text-ink-2">
              {client.lastUsedAt ? (
                <time dateTime={client.lastUsedAt}>
                  {LAST_USED_FORMAT.format(new Date(client.lastUsedAt))}
                </time>
              ) : (
                "未使用"
              )}
            </dd>
          </div>
        </dl>
        <PrefixEditor
          value={prefixes}
          onChange={(value) => setDraft((previous) => ({ ...previous, prefixes: value }))}
          disabled={busy}
        />
        <ScopeEditor
          value={scopes}
          onChange={(value) => setDraft((previous) => ({ ...previous, scopes: value }))}
          disabled={busy}
        />
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="primary"
            className={BUTTON_CLASS}
            disabled={busy}
            onClick={() => onUpdate({ scopes, allowedStagePrefixes: prefixList(prefixes) })}
          >
            範囲を保存する
          </Button>
          <Button
            type="button"
            variant="outline"
            className={BUTTON_CLASS}
            disabled={busy}
            onClick={() => onUpdate({ enabled: !client.enabled })}
          >
            {client.enabled ? "止める" : "戻す"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={BUTTON_CLASS}
            disabled={busy}
            onClick={onRotate}
          >
            トークンを作り直す
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={BUTTON_CLASS}
            disabled={busy}
            onClick={onGroups}
          >
            グループを見る
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ScopeEditor({
  value,
  onChange,
  disabled,
}: {
  value: IntegrationScope[];
  onChange: (scopes: IntegrationScope[]) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-2 text-xs font-medium text-ink-2">使える操作の範囲</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {INTEGRATION_SCOPES.map((scope) => (
          <Label
            key={scope}
            htmlFor={`${id}-${scope}`}
            className={cn(
              "mb-0 flex min-h-11 min-w-0 items-center gap-3 rounded-sm border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background",
              value.includes(scope) ? "border-brand bg-brand-soft" : "border-border bg-card",
              disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-border-strong",
            )}
          >
            <input
              id={`${id}-${scope}`}
              type="checkbox"
              checked={value.includes(scope)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...value, scope] : value.filter((item) => item !== scope),
                )
              }
              className="size-5 shrink-0 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="min-w-0">
              <span className="block text-[13px] leading-5">
                {INTEGRATION_SCOPE_DESCRIPTIONS[scope]}
              </span>
              <code className="block break-all text-xs font-normal leading-5 text-ink-3">
                {scope}
              </code>
            </span>
          </Label>
        ))}
      </div>
    </fieldset>
  );
}

function prefixList(value: string) {
  return [...new Set(value.split(/[,\s]+/).filter(Boolean))];
}
function PrefixEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>指定してよいステージの接頭辞</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: devlab-"
        className="min-h-11"
      />
      <p className="mt-1 text-xs text-ink-3">
        カンマか空白で区切ってください。空欄の場合はステージを指定できません。
      </p>
    </div>
  );
}
