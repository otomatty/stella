/**
 * `/admin/audit` — 監査ログ (Issue #27)。
 *
 * 認証・権限変更・削除など重要操作の証跡を実データで一覧する。 期間 / 実行者 / 操作種別で
 * 絞り込み、 表示中の内容を CSV 出力できる。 audit_logs は append-only (read 専用) のため
 * このページは閲覧とエクスポートのみを行う。
 *
 * バックエンド未設定時 (dev fixtures フロー): DB が無いため、 デモ用の固定サンプルを表示する。
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Download, RefreshCw } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useProfiles } from "@/hooks/useProfiles";
import { useAuditLogs, type AuditFilters } from "@/hooks/useAuditLogs";
import {
  DEFAULT_LIST_LIMIT,
  listAllAuditLogs,
  type AuditLogRow,
} from "@/lib/audit-logs-api";
import { downloadCsv, toCsv } from "@/lib/csv";

// 操作種別の表示ラベルと配色。 未知の action は素のまま表示する。
const ACTION_META: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "accent" }
> = {
  role_change: { label: "ロール変更", variant: "warning" },
  user_invite: { label: "ユーザー招待", variant: "info" },
  user_disable: { label: "ユーザー無効化", variant: "danger" },
  user_enable: { label: "ユーザー復帰", variant: "success" },
  course_publish: { label: "コース公開", variant: "success" },
  course_unpublish: { label: "コース非公開", variant: "default" },
  course_status_change: { label: "コース状態変更", variant: "default" },
  course_delete: { label: "コース削除", variant: "danger" },
  org_create: { label: "組織作成", variant: "info" },
  org_update: { label: "組織更新", variant: "warning" },
  login: { label: "ログイン", variant: "default" },
};

// 操作種別フィルタの選択肢。 ACTION_META のキー順を踏襲する。
const ACTION_OPTIONS = Object.keys(ACTION_META);

function actionLabel(action: string): string {
  return ACTION_META[action]?.label ?? action;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** <input type="date"> の値 → ISO。 from は 0 時、 to は 23:59:59.999 に丸める。 */
function dateInputToIso(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
  tenantId: string;
  backendEnabled: boolean;
}

export function AdminAuditPage({ tenantId, backendEnabled }: Props) {
  if (!backendEnabled) {
    return <AuditDemo />;
  }
  return <AuditLive tenantId={tenantId} />;
}

function AuditLive({ tenantId }: { tenantId: string }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");

  const { profiles } = useProfiles(tenantId);

  const filters: AuditFilters = useMemo(
    () => ({
      from: dateInputToIso(fromDate, false),
      to: dateInputToIso(toDate, true),
      actorId: actorId || null,
      action: action || null,
    }),
    [fromDate, toDate, actorId, action],
  );

  const { logs, loading, error, refetch } = useAuditLogs(tenantId, filters);
  const [exporting, setExporting] = useState(false);

  // 表示上限に達している = 古い証跡が表示から漏れている可能性がある。
  const truncated = logs.length >= DEFAULT_LIST_LIMIT;

  // 実行者名: denormalize 済みの actor_name を優先し、 空なら profiles から補完。
  const profileName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, p.display_name);
    return map;
  }, [profiles]);

  const displayActor = (log: AuditLogRow): string =>
    log.actor_name ||
    (log.actor_id ? profileName.get(log.actor_id) : "") ||
    log.actor_id ||
    "—";

  const displayTarget = (log: AuditLogRow): string =>
    log.target_id ? `${log.target_type}/${log.target_id}` : log.target_type || "—";

  const onExport = async () => {
    setExporting(true);
    try {
      // 表示上限に縛られず、 絞り込み条件に一致する全件をエクスポートする。
      const all = await listAllAuditLogs({ tenantId, ...filters });
      const headers = [
        "日時",
        "実行者",
        "実行者ID",
        "ロール",
        "操作",
        "操作コード",
        "対象種別",
        "対象ID",
        "IP",
        "詳細",
      ];
      const rows = all.map((l) => [
        formatDateTime(l.created_at),
        displayActor(l),
        l.actor_id ?? "",
        l.actor_role ?? "",
        actionLabel(l.action),
        l.action,
        l.target_type,
        l.target_id ?? "",
        l.ip ?? "",
        l.metadata,
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCsv(`audit-logs-${stamp}.csv`, toCsv(headers, rows));
      toast.success(`${all.length} 件をエクスポートしました`);
    } catch (err) {
      toast.error(
        `CSV出力に失敗しました: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = Boolean(fromDate || toDate || actorId || action);
  const onReset = () => {
    setFromDate("");
    setToDate("");
    setActorId("");
    setAction("");
  };

  return (
    <>
      <PageHeader
        title="監査ログ"
        sub="認証・権限変更・削除操作 — 1年以上保管"
        actions={
          <Button
            onClick={() => void onExport()}
            disabled={exporting || logs.length === 0}
          >
            <Download size={14} />
            {exporting ? "出力中…" : "CSV出力"}
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="px-4 py-3 flex items-end gap-3 flex-wrap">
          <FilterField label="開始日">
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-sm border border-input bg-card px-2 text-[12.5px]"
            />
          </FilterField>
          <FilterField label="終了日">
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-sm border border-input bg-card px-2 text-[12.5px]"
            />
          </FilterField>
          <FilterField label="実行者">
            <select
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="h-9 min-w-[180px] rounded-sm border border-input bg-card px-2 text-[12.5px]"
            >
              <option value="">すべて</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="操作種別">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 min-w-[160px] rounded-sm border border-input bg-card px-2 text-[12.5px]"
            >
              <option value="">すべて</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {actionLabel(a)}
                </option>
              ))}
            </select>
          </FilterField>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={onReset}>
              条件クリア
            </Button>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12.5px] text-ink-3">{logs.length} 件</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void refetch()}
              disabled={loading}
              title="再読み込み"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      {truncated ? (
        <div className="mb-4 rounded-md border border-border bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
          最新 {DEFAULT_LIST_LIMIT} 件のみ表示しています。 条件を絞り込むか、 全件は「CSV出力」で取得してください。
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">読み込み中…</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">
            {hasFilters
              ? "条件に一致する監査ログはありません。"
              : "監査ログはまだありません。 ロール変更・コース公開・削除などの操作が記録されます。"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>実行者</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>対象</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                const meta = ACTION_META[l.action];
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-[11.5px] whitespace-nowrap">
                      {formatDateTime(l.created_at)}
                    </TableCell>
                    <TableCell>{displayActor(l)}</TableCell>
                    <TableCell>
                      <Badge variant={meta?.variant ?? "default"}>
                        {actionLabel(l.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[11.5px] text-ink-3">
                      {displayTarget(l)}
                    </TableCell>
                    <TableCell className="font-mono text-[11.5px] text-ink-3">
                      {l.ip ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-ink-3">{label}</span>
      {children}
    </label>
  );
}

// dev fixtures フロー用のデモ表示。 DB が無いため固定サンプルを出す。
const DEMO_ROWS = [
  { t: "2026-04-18 14:28:05", a: "中村 理恵", ac: "role_change", tg: "user/u_142", ip: "10.0.3.5" },
  { t: "2026-04-18 13:05:44", a: "sys_admin", ac: "course_publish", tg: "course/web-fundamentals", ip: "10.0.0.1" },
  { t: "2026-04-18 12:18:30", a: "堀江メンター", ac: "course_delete", tg: "course/legacy-sql", ip: "10.0.3.22" },
  { t: "2026-04-18 11:02:09", a: "中村 理恵", ac: "user_invite", tg: "user/u_310", ip: "10.0.3.5" },
];

function AuditDemo() {
  return (
    <>
      <PageHeader title="監査ログ" sub="認証・権限変更・削除操作 — 1年以上保管" />
      <div className="mb-4 rounded-md border border-border bg-sunken px-3 py-2 text-[12.5px] text-ink-3">
        バックエンド未設定のため、 以下はデモ表示です。 実データの記録・閲覧・CSV出力には
        <code className="mx-1">VITE_SERVER_URL</code> を設定してください。
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>実行者</TableHead>
              <TableHead>操作</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEMO_ROWS.map((l, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-[11.5px]">{l.t}</TableCell>
                <TableCell>{l.a}</TableCell>
                <TableCell>
                  <Badge variant={ACTION_META[l.ac]?.variant ?? "default"}>
                    {actionLabel(l.ac)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11.5px] text-ink-3">{l.tg}</TableCell>
                <TableCell className="font-mono text-[11.5px] text-ink-3">{l.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
