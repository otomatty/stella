/**
 * 管理レポートのデータアクセス層 (Issue #75)。
 *
 * 読み取り専用。 認可はサーバ側で「同テナントの admin のみ」。 テナントは caller から
 * 決まるためクエリには載せない。
 */

import type {
  ReportPeriod,
  ReportResult,
  ReportRow,
  ReportType,
} from "@falcon/shared/admin/reports";
import { reportPeriodToIso } from "@falcon/shared/admin/reports";

import { apiFetch } from "./api-client";

/** プレビュー表の取得上限。 全件は CSV 出力で取得する。 */
export const REPORT_PREVIEW_LIMIT = 200;

/** CSV 全件取得時の 1 ページあたり件数 (API の MAX_LIMIT と同値)。 */
const EXPORT_PAGE_SIZE = 1000;

function buildQuery(period: ReportPeriod, limit: number, offset: number): string {
  const { from, to } = reportPeriodToIso(period);
  const p = new URLSearchParams();
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  p.set("limit", String(limit));
  p.set("offset", String(offset));
  return p.toString();
}

/** 1 ページ分のレポート明細。 */
export async function fetchReport(
  type: ReportType,
  period: ReportPeriod,
  limit = REPORT_PREVIEW_LIMIT,
  offset = 0,
  signal?: AbortSignal,
): Promise<ReportResult> {
  const qs = buildQuery(period, limit, offset);
  const { report } = await apiFetch<{ report: ReportResult }>(
    `/api/reports/${type}?${qs}`,
    signal ? { signal } : {},
  );
  return report;
}

/**
 * 期間に一致する明細を全件取得する (CSV 出力用)。
 * プレビュー上限では書き出しが欠落するため、 ページングで total 件まで辿る。
 */
export async function fetchAllReportRows(
  type: ReportType,
  period: ReportPeriod,
): Promise<ReportRow[]> {
  const all: ReportRow[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
    const report = await fetchReport(type, period, EXPORT_PAGE_SIZE, offset);
    all.push(...report.rows);
    if (report.rows.length < EXPORT_PAGE_SIZE || all.length >= report.total) break;
  }
  return all;
}
