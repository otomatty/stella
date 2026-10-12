/**
 * `/admin/security` — セキュリティ監視 (管理者のみ)。
 *
 * 不正アクセスの兆候 (いつもと違う国からのサインイン・Access でのログイン拒否の連続・権限外の
 * 操作の連続・休眠アカウント…) をすぐ見つけて手を打つための画面。出来事は API と Cloudflare Access
 * のログから集め、検知ルールがアラートにする (ルールの説明と最初にやることは
 * `@stella/shared/security/types` の `SECURITY_RULES` が唯一の定義)。
 *
 *   - 上段 … 設定の不足 (Access の検証・ログの取り込み・外部通知)、件数、直近 7 日の推移
 *   - タブ … アラート / サインイン履歴 / イベントログ / アカウント棚卸し
 *
 * 時刻はすべて日本時間で出す (管理者がどこから見ても同じ時刻で話せるように)。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  SECURITY_ALERT_STATUS_LABELS,
  SECURITY_EVENT_LABELS,
  SECURITY_SEVERITY_LABELS,
  type SecurityAccountRow,
  type SecurityAlertRow,
  type SecurityAlertStatus,
  type SecurityConfigStatus,
  type SecurityEventRow,
  type SecurityOverview,
  type SecuritySeverity,
} from "@stella/shared/security/types";
import type { ProfileRole } from "@stella/shared/cms/types";

import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { ROLE_LABEL } from "@/components/admin/users-admin/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Info, RefreshCw, Search, ShieldCheck } from "@/lib/icons";
import {
  fetchSecurityOverview,
  listSecurityAccounts,
  listSecurityAlerts,
  listSecurityEvents,
  revokeAccessSessions,
  runSecurityScan,
  updateSecurityAlert,
  type SecurityAlertFilter,
  type SecurityEventQuery,
} from "@/lib/security-api";
import {
  alertTransitions,
  barPercent,
  countryLabel,
  detailEntries,
  eventKindLabel,
  formatDayLabel,
  formatJst,
  previousCountryIfChanged,
  ruleInfo,
  shortUserAgent,
} from "@/lib/security-format";

interface Props {
  backendEnabled: boolean;
}

export function AdminSecurityPage({ backendEnabled }: Props) {
  if (!backendEnabled) return <SecurityDemo />;
  return <SecurityLive />;
}

const SEVERITY_VARIANT: Record<SecuritySeverity, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  low: "info",
};

const STATUS_VARIANT: Record<SecurityAlertStatus, "danger" | "warning" | "success"> = {
  open: "danger",
  acknowledged: "warning",
  resolved: "success",
};

const TRANSITION_LABEL: Record<SecurityAlertStatus, string> = {
  open: "未対応に戻す",
  acknowledged: "確認中にする",
  resolved: "解決済みにする",
};

const SIGN_IN_KINDS = ["session.start", "access.login", "access.denied"] as const;
const PAGE_SIZE = 100;
const DAY_OPTIONS = [1, 7, 30, 90, 180] as const;

function roleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABEL[role as ProfileRole] ?? role;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "読み込みに失敗しました";
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------
// 全体
// ---------------------------------------------------------------

function SecurityLive() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  // 検査やアラートの更新のあとに、各タブへ「取り直して」を伝える版番号。
  const [version, setVersion] = useState(0);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await fetchSecurityOverview());
      setOverviewError(null);
    } catch (err) {
      setOverviewError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const refreshAll = useCallback(() => {
    void loadOverview();
    setVersion((v) => v + 1);
  }, [loadOverview]);

  const onScan = async () => {
    setScanning(true);
    try {
      const result = await runSecurityScan();
      if (result.access_log_error) {
        toast.warning(
          "Cloudflare Access のログを取り込めませんでした。検知はアプリの記録だけで行いました",
        );
      }
      if (result.new_alerts > 0) toast.error(`新しいアラートが ${result.new_alerts} 件あります`);
      else toast.success("検査しました。新しいアラートはありません");
      refreshAll();
    } catch (err) {
      toast.error(`検査に失敗しました: ${errorMessage(err)}`);
    } finally {
      setScanning(false);
    }
  };

  const openTotal = overview
    ? overview.open_alerts.high + overview.open_alerts.medium + overview.open_alerts.low
    : undefined;

  return (
    <>
      <PageHeader
        title="セキュリティ"
        sub={
          <>
            不正アクセスの兆候の検知とアカウントの棚卸し — 最終検査:{" "}
            {!overview
              ? "…"
              : overview.config.last_scan_at
                ? formatJst(overview.config.last_scan_at, false)
                : "まだありません"}
          </>
        }
        actions={
          <Button variant="primary" onClick={() => void onScan()} disabled={scanning}>
            <ShieldCheck size={14} />
            {scanning ? "検査中…" : "今すぐ検査"}
          </Button>
        }
      />

      {overviewError ? <ErrorBox message={overviewError} /> : null}

      {overview ? (
        <>
          <ConfigBanner config={overview.config} />
          <KpiTiles overview={overview} />
          <DailyTable daily={overview.daily} />
        </>
      ) : overviewError ? null : (
        <SkeletonRows rows={4} className="mb-6" />
      )}

      <Tabs defaultValue="alerts">
        <TabsList>
          <TabsTrigger value="alerts" count={openTotal}>
            アラート
          </TabsTrigger>
          <TabsTrigger value="sign-ins">サインイン履歴</TabsTrigger>
          <TabsTrigger value="events">イベントログ</TabsTrigger>
          <TabsTrigger value="accounts">アカウント棚卸し</TabsTrigger>
        </TabsList>
        <TabsContent value="alerts">
          <AlertsPanel version={version} onChanged={refreshAll} />
        </TabsContent>
        <TabsContent value="sign-ins">
          <SignInsPanel version={version} />
        </TabsContent>
        <TabsContent value="events">
          <EventsPanel version={version} />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsPanel
            version={version}
            sessionRevoke={overview?.config.session_revoke ?? false}
            onChanged={refreshAll}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ---------------------------------------------------------------
// 設定の不足
// ---------------------------------------------------------------

function ConfigBanner({ config }: { config: SecurityConfigStatus }) {
  return (
    <div className="mb-5 space-y-2">
      {!config.access_enforced ? (
        <div
          role="alert"
          className="flex gap-2 rounded-md border border-destructive bg-danger-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-destructive"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold">API が Cloudflare Access を確かめていません</div>
            API に <code>ACCESS_TEAM_DOMAIN</code> と <code>ACCESS_AUD</code>{" "}
            が設定されていないため、ログインを Access
            で確かめていません。ローカル開発以外でこの表示が出たら、 すぐに設定してください。
          </div>
        </div>
      ) : null}
      {!config.access_logs_import ? (
        <InfoNote>
          Access でのログイン拒否 (総当たり・なりすましの試行) を取り込んでいません。API に{" "}
          <code>CF_ACCESS_API_TOKEN</code> を設定すると、拒否の記録の取り込みと、この画面からの
          Access セッションの失効ができるようになります。
        </InfoNote>
      ) : null}
      {!config.webhook ? (
        <InfoNote>
          アラートはこの画面と通知センターにだけ出ます。<code>SECURITY_ALERT_WEBHOOK_URL</code>{" "}
          を設定すると、Slack などにもすぐ届きます。
        </InfoNote>
      ) : null}
      <p className="text-[11.5px] text-ink-3">
        出来事は {config.retention_days} 日間保存します。
        {config.access_logs_import
          ? ` Access のログの最終取り込み: ${formatJst(config.last_access_log_import_at, false)}`
          : ""}
      </p>
    </div>
  );
}

function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md border border-border bg-info-soft px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
      <Info size={15} className="mt-0.5 shrink-0 text-info" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------
// 件数・推移
// ---------------------------------------------------------------

function KpiTiles({ overview }: { overview: SecurityOverview }) {
  const { open_alerts: open, last24h, accounts } = overview;
  const openTotal = open.high + open.medium + open.low;
  return (
    <div className="grid gap-3 mb-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="未対応のアラート" value={openTotal} unit="件">
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["high", "medium", "low"] as const).map((s) => (
            <Badge key={s} variant={open[s] > 0 ? SEVERITY_VARIANT[s] : "default"}>
              {SECURITY_SEVERITY_LABELS[s]} {open[s]}
            </Badge>
          ))}
        </div>
      </KpiCard>
      <KpiCard label="サインイン (24時間)" value={last24h["session.start"] ?? 0} unit="回" />
      <KpiCard label="Access の拒否 (24時間)" value={last24h["access.denied"] ?? 0} unit="回" />
      <KpiCard
        label="権限外の操作 403 (24時間)"
        value={last24h["authz.forbidden"] ?? 0}
        unit="回"
      />
      <KpiCard label="サーバーエラー 5xx (24時間)" value={last24h.server_error ?? 0} unit="回" />
      <KpiCard label="有効な管理者" value={accounts.admins} unit="人" />
      <KpiCard
        label="休眠中の権限アカウント"
        value={accounts.dormant_privileged}
        unit="人"
        trend={accounts.dormant_privileged > 0 ? "90 日サインインなし — 棚卸しで確認" : undefined}
        trendDir={accounts.dormant_privileged > 0 ? "down" : undefined}
      />
    </div>
  );
}

const DAILY_COLUMNS = [
  { key: "sign_ins", label: "サインイン", bar: "bg-info" },
  { key: "denied", label: "Access の拒否", bar: "bg-danger" },
  { key: "forbidden", label: "403", bar: "bg-warning" },
  { key: "errors", label: "5xx", bar: "bg-danger" },
] as const;

function DailyTable({ daily }: { daily: SecurityOverview["daily"] }) {
  const max = useMemo(() => {
    const out: Record<(typeof DAILY_COLUMNS)[number]["key"], number> = {
      sign_ins: 0,
      denied: 0,
      forbidden: 0,
      errors: 0,
    };
    for (const d of daily)
      for (const c of DAILY_COLUMNS) out[c.key] = Math.max(out[c.key], d[c.key]);
    return out;
  }, [daily]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>直近 7 日の推移 (日本時間)</CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日付</TableHead>
            {DAILY_COLUMNS.map((c) => (
              <TableHead key={c.key}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {daily.map((d) => (
            <TableRow key={d.date}>
              <TableCell className="whitespace-nowrap text-[12.5px]">
                {formatDayLabel(d.date)}
              </TableCell>
              {DAILY_COLUMNS.map((c) => (
                <TableCell key={c.key} className="min-w-[110px]">
                  <div className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-right font-mono text-[12px] tabular-nums">
                      {d[c.key]}
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-muted" aria-hidden="true">
                      <div
                        className={`h-1.5 rounded-full ${c.bar}`}
                        style={{ width: `${barPercent(d[c.key], max[c.key])}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// ---------------------------------------------------------------
// アラート
// ---------------------------------------------------------------

const ALERT_FILTERS: { value: SecurityAlertFilter; label: string }[] = [
  { value: "active", label: "対応中 (未対応・確認中)" },
  { value: "resolved", label: "解決済み" },
  { value: "all", label: "すべて" },
];

function AlertsPanel({ version, onChanged }: { version: number; onChanged: () => void }) {
  const [filter, setFilter] = useState<SecurityAlertFilter>("active");
  const [rows, setRows] = useState<SecurityAlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: version は取り直しの合図
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSecurityAlerts(filter)
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, version]);

  return (
    <>
      <fieldset className="mb-4 flex flex-wrap items-center gap-2">
        <legend className="sr-only">アラートの絞り込み</legend>
        {ALERT_FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "primary" : "outline"}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        {rows ? <span className="ml-auto text-[12.5px] text-ink-3">{rows.length} 件</span> : null}
      </fieldset>
      {error ? <ErrorBox message={error} /> : null}
      {rows === null && loading ? (
        <SkeletonRows rows={4} />
      ) : rows && rows.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-ink-3">
            {filter === "active"
              ? "対応が必要なアラートはありません。"
              : "該当するアラートはありません。"}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows?.map((row) => (
            <AlertCard key={row.id} alert={row} onChanged={onChanged} />
          ))}
        </div>
      )}
    </>
  );
}

function AlertCard({ alert, onChanged }: { alert: SecurityAlertRow; onChanged: () => void }) {
  const info = ruleInfo(alert.rule);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(alert.note ?? "");
  const [saving, setSaving] = useState<SecurityAlertStatus | null>(null);
  const details = detailEntries(alert.detail);

  useEffect(() => setNote(alert.note ?? ""), [alert.note]);

  const change = async (status: SecurityAlertStatus) => {
    setSaving(status);
    try {
      // メモは開いて書き換えたときだけ送る (送らなければ今のメモのまま)。
      const noteChanged = noteOpen && note.trim() !== (alert.note ?? "");
      await updateSecurityAlert(alert.id, {
        status,
        ...(noteChanged ? { note: note.trim() } : {}),
      });
      toast.success(`「${SECURITY_ALERT_STATUS_LABELS[status]}」にしました`);
      setNoteOpen(false);
      onChanged();
    } catch (err) {
      toast.error(`更新に失敗しました: ${errorMessage(err)}`);
    } finally {
      setSaving(null);
    }
  };

  const noteId = `alert-note-${alert.id}`;

  return (
    <Card className="px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={SEVERITY_VARIANT[alert.severity]}>
          重要度 {SECURITY_SEVERITY_LABELS[alert.severity]}
        </Badge>
        <Badge variant={STATUS_VARIANT[alert.status]}>
          {SECURITY_ALERT_STATUS_LABELS[alert.status]}
        </Badge>
        <h3 className="text-[14px] font-semibold">{info?.label ?? alert.title}</h3>
      </div>
      {info && alert.title && alert.title !== info.label ? (
        <p className="mt-1.5 text-[13px] text-ink">{alert.title}</p>
      ) : null}
      {info ? <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">{info.what}</p> : null}
      {info ? (
        <div className="mt-2 rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] leading-relaxed">
          <span className="font-semibold">推奨の対応: </span>
          {info.action}
        </div>
      ) : null}

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
        <MetaItem label="対象" value={alert.subject ?? "—"} mono />
        <MetaItem label="件数" value={`${alert.event_count} 件`} />
        <MetaItem label="最初の検知" value={formatJst(alert.first_seen_at)} mono />
        <MetaItem label="最後の検知" value={formatJst(alert.last_seen_at)} mono />
        {details.map(([k, v]) => (
          <MetaItem key={k} label={k} value={v} mono />
        ))}
        {alert.status_changed_at ? (
          <MetaItem
            label="状態の変更"
            value={`${formatJst(alert.status_changed_at, false)}${alert.status_changed_by ? ` (${alert.status_changed_by})` : ""}`}
          />
        ) : null}
      </dl>

      {alert.note && !noteOpen ? (
        <p className="mt-2 whitespace-pre-wrap rounded-md border border-border px-3 py-2 text-[12.5px] text-ink-2">
          <span className="font-semibold">メモ: </span>
          {alert.note}
        </p>
      ) : null}

      {noteOpen ? (
        <div className="mt-3">
          <label htmlFor={noteId} className="mb-1 block text-[11.5px] text-ink-3">
            メモ (確認した内容・本人への確認結果など。状態を変えるときに保存します)
          </label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[64px] text-[12.5px]"
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {alertTransitions(alert.status).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === "resolved" ? "primary" : "outline"}
            disabled={saving !== null}
            onClick={() => void change(s)}
          >
            {saving === s ? "更新中…" : TRANSITION_LABEL[s]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setNoteOpen((v) => !v)}>
          {noteOpen ? "メモを閉じる" : alert.note ? "メモを直す" : "メモを添える"}
        </Button>
      </div>
    </Card>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className={`min-w-0 break-all ${mono ? "font-mono text-[11.5px]" : ""}`}>{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------
// 出来事 (サインイン履歴・イベントログ)
// ---------------------------------------------------------------

/** 出来事の一覧を新しい順に取り、「さらに読み込む」で古い方へ続ける。 */
function useSecurityEvents(query: SecurityEventQuery, version: number) {
  const [rows, setRows] = useState<SecurityEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const key = JSON.stringify(query);

  // biome-ignore lint/correctness/useExhaustiveDependencies: query は key (JSON) で比べる。version は取り直しの合図
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSecurityEvents({ ...query, limit: PAGE_SIZE })
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setHasMore(r.length >= PAGE_SIZE);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const loadMore = async () => {
    const last = rows.at(-1);
    if (!last) return;
    setLoading(true);
    try {
      const more = await listSecurityEvents({
        ...query,
        limit: PAGE_SIZE,
        before: last.created_at,
        beforeId: last.id,
      });
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...more.filter((r) => !seen.has(r.id))];
      });
      setHasMore(more.length >= PAGE_SIZE);
    } catch (err) {
      toast.error(`読み込みに失敗しました: ${errorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return { rows, loading, error, hasMore, loadMore };
}

function actorText(row: SecurityEventRow): { name: string; email: string | null } {
  const name = row.actor_name ?? row.email ?? "—";
  return { name, email: row.actor_name && row.email ? row.email : null };
}

function EventKindBadge({ kind }: { kind: string }) {
  const variant =
    kind === "access.denied" ||
    kind === "auth.disabled" ||
    kind === "auth.no_profile" ||
    kind === "auth.tenant_inactive"
      ? "danger"
      : kind === "authz.forbidden" || kind === "rate_limited" || kind === "auth.invalid_token"
        ? "warning"
        : kind === "server_error" || kind === "data.export" || kind === "session.revoke"
          ? "info"
          : "default";
  return <Badge variant={variant}>{eventKindLabel(kind)}</Badge>;
}

function CountryCell({ row }: { row: SecurityEventRow }) {
  const prev = previousCountryIfChanged(row);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="whitespace-nowrap text-[12px]">{countryLabel(row.country)}</span>
      {prev ? (
        <Badge variant="warning" title="前回のサインインと違う国">
          前回と違う国 (前回: {prev})
        </Badge>
      ) : null}
    </div>
  );
}

function EventsTable({
  rows,
  variant,
}: {
  rows: SecurityEventRow[];
  variant: "sign-ins" | "events";
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日時</TableHead>
          <TableHead>種類</TableHead>
          <TableHead>利用者</TableHead>
          <TableHead>ロール</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>国</TableHead>
          {variant === "events" ? <TableHead>リクエスト</TableHead> : null}
          <TableHead>端末</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const actor = actorText(row);
          return (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-[11.5px] whitespace-nowrap">
                {formatJst(row.created_at)}
              </TableCell>
              <TableCell>
                <EventKindBadge kind={row.kind} />
              </TableCell>
              <TableCell className="min-w-[140px]">
                <div className="text-[12.5px]">{actor.name}</div>
                {actor.email ? <div className="text-[11.5px] text-ink-3">{actor.email}</div> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap text-[12px]">
                {roleLabel(row.actor_role)}
              </TableCell>
              <TableCell className="font-mono text-[11.5px] text-ink-3">{row.ip ?? "—"}</TableCell>
              <TableCell>
                <CountryCell row={row} />
              </TableCell>
              {variant === "events" ? (
                <TableCell className="font-mono text-[11.5px] text-ink-3 break-all">
                  {row.method || row.path
                    ? `${row.method ?? ""} ${row.path ?? ""}${row.status ? ` → ${row.status}` : ""}`
                    : "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-[11.5px] text-ink-3" title={row.user_agent ?? undefined}>
                {shortUserAgent(row.user_agent)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function EventsResult({
  state,
  variant,
  empty,
}: {
  state: ReturnType<typeof useSecurityEvents>;
  variant: "sign-ins" | "events";
  empty: string;
}) {
  const { rows, loading, error, hasMore, loadMore } = state;
  return (
    <>
      {error ? <ErrorBox message={error} /> : null}
      <Card className="overflow-hidden">
        {loading && rows.length === 0 ? (
          <SkeletonRows rows={6} className="p-4" />
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">{empty}</div>
        ) : (
          <EventsTable rows={rows} variant={variant} />
        )}
      </Card>
      {hasMore ? (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={() => void loadMore()} disabled={loading}>
            {loading ? "読み込み中…" : "さらに読み込む"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function SignInsPanel({ version }: { version: number }) {
  const [days, setDays] = useState<number>(30);
  const query = useMemo(() => ({ kinds: SIGN_IN_KINDS, days }), [days]);
  const state = useSecurityEvents(query, version);
  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3 px-4 py-3">
          <DaysSelect value={days} onChange={setDays} />
          <p className="text-[12px] text-ink-3">
            新しいセッションの開始・Access のログイン・Access での拒否を新しい順に出します。
            前回と違う国からのサインインには印が付きます。
          </p>
        </div>
      </Card>
      <EventsResult
        state={state}
        variant="sign-ins"
        empty="この期間のサインインの記録はありません。"
      />
    </>
  );
}

function EventsPanel({ version }: { version: number }) {
  const [kind, setKind] = useState("");
  const [days, setDays] = useState<number>(7);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const query = useMemo(
    () => ({ ...(kind ? { kinds: [kind] } : {}), days, ...(q ? { q } : {}) }),
    [kind, days, q],
  );
  const state = useSecurityEvents(query, version);

  return (
    <>
      <Card className="mb-4">
        <form
          className="flex flex-wrap items-end gap-3 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
        >
          <FilterField label="種類" htmlFor="security-event-kind">
            <select
              id="security-event-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-9 w-full min-w-[200px] rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
            >
              <option value="">すべて</option>
              {Object.entries(SECURITY_EVENT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </FilterField>
          <DaysSelect value={days} onChange={setDays} />
          <FilterField label="検索 (メール・IP・名前)" htmlFor="security-event-q">
            <input
              id="security-event-q"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="例: 203.0.113.5"
              className="h-9 w-full min-w-[200px] rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
            />
          </FilterField>
          <Button type="submit" variant="outline">
            <Search size={14} />
            検索
          </Button>
          {q ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setQ("");
              }}
            >
              検索をやめる
            </Button>
          ) : null}
        </form>
      </Card>
      <EventsResult state={state} variant="events" empty="条件に一致する出来事はありません。" />
    </>
  );
}

function DaysSelect({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <FilterField label="期間" htmlFor={undefined}>
      <select
        aria-label="期間"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 w-full rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
      >
        {DAY_OPTIONS.map((d) => (
          <option key={d} value={d}>
            {d === 1 ? "直近 24 時間" : `直近 ${d} 日`}
          </option>
        ))}
      </select>
    </FilterField>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:flex-none">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-[11px] text-ink-3">
          {label}
        </label>
      ) : (
        <span className="text-[11px] text-ink-3">{label}</span>
      )}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------
// アカウント棚卸し
// ---------------------------------------------------------------

function AccountsPanel({
  version,
  sessionRevoke,
  onChanged,
}: {
  version: number;
  sessionRevoke: boolean;
  onChanged: () => void;
}) {
  const [rows, setRows] = useState<SecurityAccountRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: version / reloadKey は取り直しの合図
  useEffect(() => {
    let cancelled = false;
    listSecurityAccounts()
      .then((r) => {
        if (cancelled) return;
        setRows(r);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [version, reloadKey]);

  const revoke = async (row: SecurityAccountRow) => {
    if (
      !window.confirm(
        `${row.display_name} (${row.email ?? "メールなし"}) の Cloudflare Access のセッションを失効します。\n本人は次の操作でログインし直しになります。よろしいですか?`,
      )
    ) {
      return;
    }
    setRevoking(row.id);
    try {
      await revokeAccessSessions(row.id);
      toast.success(`${row.display_name} のセッションを失効しました`);
      onChanged();
    } catch (err) {
      toast.error(`失効に失敗しました: ${errorMessage(err)}`);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-[12px] text-ink-3">
          <p className="flex-1">
            権限のあるアカウント (管理者・講師・営業) を先に、最終サインインの古い順に並べます。
            使っていないアカウントは無効化して減らします (無効化は
            <Link to="/admin/users" className="mx-1 text-brand underline underline-offset-2">
              ユーザー管理
            </Link>
            から)。
          </p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setReloadKey((k) => k + 1)}
            title="再読み込み"
            aria-label="再読み込み"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </Card>
      {error ? <ErrorBox message={error} /> : null}
      <Card className="overflow-hidden">
        {rows === null ? (
          error ? null : (
            <SkeletonRows rows={6} className="p-4" />
          )
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">アカウントはありません。</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前・メール</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>最終サインイン</TableHead>
                <TableHead>最後の IP・国</TableHead>
                <TableHead className="text-right">30 日のサインイン</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-[160px]">
                    <div className="text-[12.5px]">{row.display_name}</div>
                    <div className="text-[11.5px] text-ink-3">{row.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[12px]">
                    {roleLabel(row.role)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.privileged ? <Badge variant="accent">権限あり</Badge> : null}
                      {row.dormant ? <Badge variant="warning">休眠 (90日)</Badge> : null}
                      {row.disabled ? <Badge variant="danger">無効</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[11.5px] whitespace-nowrap">
                    {row.last_session_at ? formatJst(row.last_session_at, false) : "記録なし"}
                  </TableCell>
                  <TableCell className="text-[11.5px]">
                    <div className="font-mono text-ink-3">{row.last_ip ?? "—"}</div>
                    <div>{row.last_country ? countryLabel(row.last_country) : ""}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-[12px] tabular-nums">
                    {row.sessions_30d}
                  </TableCell>
                  <TableCell>
                    <RevokeButton
                      enabled={sessionRevoke && Boolean(row.email)}
                      reason={
                        !sessionRevoke
                          ? "失効には API の CF_ACCESS_API_TOKEN の設定が必要です"
                          : "メールアドレスの無いアカウントです"
                      }
                      busy={revoking === row.id}
                      onClick={() => void revoke(row)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function RevokeButton({
  enabled,
  reason,
  busy,
  onClick,
}: {
  enabled: boolean;
  reason: string;
  busy: boolean;
  onClick: () => void;
}) {
  const button = (
    <Button size="sm" variant="outline" disabled={!enabled || busy} onClick={onClick}>
      {busy ? "失効中…" : "Access セッションを失効"}
    </Button>
  );
  if (enabled) return button;
  // disabled のボタンはポインタもフォーカスも受けないので、包んだ要素で吹き出しを出す。
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: 無効なボタンの理由をキーボードでも読めるようにする */}
        <span tabIndex={0} className="inline-flex">
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------
// デモ (バックエンド未設定)
// ---------------------------------------------------------------

function SecurityDemo() {
  return (
    <>
      <PageHeader title="セキュリティ" sub="不正アクセスの兆候の検知とアカウントの棚卸し" />
      <div className="rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド未設定のため表示できません。 セキュリティ監視は API が記録した出来事から
        検知します。 <code className="mx-1">VITE_SERVER_URL</code> を設定してください。
      </div>
    </>
  );
}
