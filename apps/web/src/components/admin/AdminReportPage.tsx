/**
 * `/admin/report` — レポート (Issue #75)。
 *
 * KPI ダッシュボード (#28) が「今の状態」、 成績台帳 (#26) がステージ単位の一覧であるのに対し、
 * ここは期間を指定して明細を CSV に書き出すための横断エクスポート画面。 受講状況 / 成績 /
 * 修了証 / 監査 の 4 種別を同じ期間指定・同じ表で扱う。
 *
 * 表示はプレビュー (先頭 200 件) にとどめ、 CSV 出力時は条件に一致する全件をページングで
 * 取得する。 列定義は `@falcon/shared/admin/reports` に集約しており、 プレビュー表と CSV は
 * 同じ変換関数を通るため列がずれない。
 *
 * バックエンド未設定時 (fixtures デモ経路): 実データが無いため、 デモ行は出さず案内のみ表示する。
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  REPORT_META,
  REPORT_PERIOD_PRESET_LABELS,
  REPORT_TYPES,
  isInvalidPeriod,
  reportFileName,
  reportPeriodFromPreset,
  reportRowToCells,
  reportRowsToCells,
  type ReportPeriod,
  type ReportPeriodPreset,
  type ReportType,
} from "@falcon/shared/admin/reports";

import { Download, RefreshCw } from "@/lib/icons";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useReport } from "@/hooks/useReport";
import { REPORT_PREVIEW_LIMIT, fetchAllReportRows } from "@/lib/reports-api";
import { downloadCsv, toCsv } from "@/lib/csv";

const PRESET_OPTIONS: ReportPeriodPreset[] = [
  "this_month",
  "last_month",
  "last_30_days",
  "last_90_days",
  "this_year",
  "all",
  "custom",
];

interface Props {
  tenantId: string;
  backendEnabled: boolean;
}

export function AdminReportPage({ tenantId, backendEnabled }: Props) {
  if (!backendEnabled) {
    return <ReportUnavailable />;
  }
  return <ReportLive tenantId={tenantId} />;
}

function ReportLive({ tenantId }: { tenantId: string }) {
  const [type, setType] = useState<ReportType>("enrollments");
  const [preset, setPreset] = useState<ReportPeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const period: ReportPeriod = useMemo(
    () =>
      preset === "custom"
        ? { from: customFrom || null, to: customTo || null }
        : reportPeriodFromPreset(preset, new Date()),
    [customFrom, customTo, preset],
  );

  const invalidPeriod = isInvalidPeriod(period);
  const { report, loading, error, refetch } = useReport(tenantId, type, period, true);

  const meta = REPORT_META[type];
  const rows = report?.rows ?? [];
  const total = report?.total ?? 0;
  const truncated = total > rows.length;

  // プリセット表示中に日付を触ったら「期間を指定」へ切り替え、 表示中の期間を初期値にする。
  const onDateChange = (bound: "from" | "to", value: string) => {
    if (preset !== "custom") {
      setCustomFrom(period.from ?? "");
      setCustomTo(period.to ?? "");
      setPreset("custom");
    }
    if (bound === "from") setCustomFrom(value);
    else setCustomTo(value);
  };

  const onExport = async () => {
    setExporting(true);
    try {
      // プレビュー上限に縛られず、 期間に一致する全件を書き出す。
      const all = await fetchAllReportRows(type, period);
      downloadCsv(reportFileName(type, period), toCsv(meta.headers, reportRowsToCells(type, all)));
      toast.success(`${all.length} 件をエクスポートしました`);
    } catch (err) {
      toast.error(`CSV出力に失敗しました: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="レポート"
        sub="期間を指定して受講状況・成績・修了証・監査ログを CSV 出力できます"
        actions={
          <Button
            onClick={() => void onExport()}
            disabled={exporting || invalidPeriod || total === 0}
          >
            <Download size={14} />
            {exporting ? "出力中…" : "CSV出力"}
          </Button>
        }
      />

      <Card className="mb-4">
        <div className="px-4 py-3 flex items-end gap-3 flex-wrap">
          <FilterField label="レポート種別">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              className="h-9 w-full min-w-[160px] rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_META[t].label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="期間">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as ReportPeriodPreset)}
              className="h-9 w-full min-w-[140px] rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
            >
              {PRESET_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {REPORT_PERIOD_PRESET_LABELS[p]}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="開始日">
            <input
              type="date"
              value={period.from ?? ""}
              max={period.to || undefined}
              onChange={(e) => onDateChange("from", e.target.value)}
              className="h-9 w-full rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
            />
          </FilterField>
          <FilterField label="終了日">
            <input
              type="date"
              value={period.to ?? ""}
              min={period.from || undefined}
              onChange={(e) => onDateChange("to", e.target.value)}
              className="h-9 w-full rounded-sm border border-input bg-card px-2 text-[12.5px] sm:w-auto"
            />
          </FilterField>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-[12.5px] text-ink-3">{total} 件</span>
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
        <div className="px-4 pb-3 text-[11.5px] text-ink-3">{meta.description}</div>
      </Card>

      {invalidPeriod ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          開始日が終了日より後になっています。 期間を修正してください。
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-md border border-destructive bg-danger-soft px-3 py-2 text-[12.5px] text-destructive">
          {error}
        </div>
      ) : null}

      {truncated ? (
        <div className="mb-4 rounded-md border border-border bg-warning-soft px-3 py-2 text-[12.5px] text-warning">
          全 {total} 件のうち先頭 {REPORT_PREVIEW_LIMIT} 件を表示しています。
          全件は「CSV出力」で取得してください。
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading && rows.length === 0 ? (
          <SkeletonRows rows={6} className="p-4" />
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink-3">
            {invalidPeriod
              ? "期間を修正すると結果が表示されます。"
              : `この期間に該当する${meta.label}データはありません。`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {meta.headers.map((h) => (
                    <TableHead key={h} className="whitespace-nowrap">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  // 行に安定した一意キーが無い種別 (成績は複数テーブルの混成) があるため index を使う。
                  // biome-ignore lint/suspicious/noArrayIndexKey: 混成行に安定キーが無い
                  <TableRow key={i}>
                    {reportRowToCells(type, row).map((cell, j) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: セルは列位置が同一性
                      <TableCell key={j} className="whitespace-nowrap">
                        {cell || "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // 狭幅では 2 列に収まるよう最小幅つきで伸縮させる (input の既定幅で溢れさせない)。
    <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:flex-none">
      <span className="text-[11px] text-ink-3">{label}</span>
      {children}
    </div>
  );
}

// fixtures デモ経路では集計対象の実データが無いため、 デモ行を作らず案内のみ出す。
function ReportUnavailable() {
  return (
    <>
      <PageHeader title="レポート" sub="期間を指定した CSV エクスポート" />
      <Card className="p-10 text-center text-[13px] text-ink-3">
        レポートはバックエンド接続時に実データで動作します。 実データの集計・CSV出力には
        <code className="mx-1">VITE_SERVER_URL</code> を設定してください。
      </Card>
    </>
  );
}
