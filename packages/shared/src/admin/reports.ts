/**
 * 管理レポート (Issue #75) の型・期間解決・CSV 整形。
 *
 * 管理画面「レポート」は KPI ダッシュボード (#28) や成績台帳 (#26) のような
 * 単一画面向けの集計ではなく、 「期間で切って書き出す」ことを目的とした横断
 * エクスポートである。 API (`GET /api/reports/:type`) とフロントの双方が
 * 同じ列定義を使うよう、 列見出しと行 → セルの変換をここに集約する
 * (プレビュー表と CSV が食い違わないようにするため)。
 *
 * 日付境界は学習アクティビティ (#73) と同じアプリ基準 TZ (Asia/Tokyo) で切る。
 * I/O は持たない純粋モジュール。
 */

import { STUDY_TZ_OFFSET_MIN, addStudyDays, toStudyDate } from "../study/activity.js";
import { auditActionLabel } from "./audit-actions.js";

/** レポート種別。 */
export type ReportType = "enrollments" | "grades" | "certificates" | "audit";

export const REPORT_TYPES: readonly ReportType[] = [
  "enrollments",
  "grades",
  "certificates",
  "audit",
] as const;

export function isReportType(value: unknown): value is ReportType {
  return typeof value === "string" && (REPORT_TYPES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------
// 期間
// ---------------------------------------------------------------

/** 期間プリセット。 `custom` は from/to を利用者が直接指定する。 */
export type ReportPeriodPreset =
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "this_year"
  | "all"
  | "custom";

/** 期間 (アプリ基準 TZ の `YYYY-MM-DD`)。 null は無制限。 */
export interface ReportPeriod {
  from: string | null;
  to: string | null;
}

export const REPORT_PERIOD_PRESET_LABELS: Record<ReportPeriodPreset, string> = {
  this_month: "今月",
  last_month: "先月",
  last_30_days: "直近30日",
  last_90_days: "直近90日",
  this_year: "年初来",
  all: "全期間",
  custom: "期間を指定",
};

/** `YYYY-MM-DD` を年 / 月 / 日に分解する。 不正値は null。 */
function splitDate(date: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 月末日 (1-12 の month)。 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * プリセットから期間を解決する。 基準日 `now` はアプリ基準 TZ で日付に落とす。
 * `custom` は呼び出し側が入力値を使うため、 ここでは無制限 (null/null) を返す。
 */
export function reportPeriodFromPreset(
  preset: ReportPeriodPreset,
  now: Date | number = new Date(),
): ReportPeriod {
  const today = toStudyDate(now);
  const parts = splitDate(today);
  if (!parts) return { from: null, to: null };
  const { y, m } = parts;

  switch (preset) {
    case "this_month":
      return { from: `${y}-${pad2(m)}-01`, to: today };
    case "last_month": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return {
        from: `${py}-${pad2(pm)}-01`,
        to: `${py}-${pad2(pm)}-${pad2(lastDayOfMonth(py, pm))}`,
      };
    }
    case "last_30_days":
      return { from: addStudyDays(today, -29), to: today };
    case "last_90_days":
      return { from: addStudyDays(today, -89), to: today };
    case "this_year":
      return { from: `${y}-01-01`, to: today };
    case "all":
    case "custom":
      return { from: null, to: null };
    default:
      return assertNeverPreset(preset);
  }
}

/** 種別を増やしたときに switch の取りこぼしをコンパイルエラーにするための番人。 */
function assertNeverPreset(preset: never): ReportPeriod {
  void preset;
  return { from: null, to: null };
}

/**
 * 期間 (`YYYY-MM-DD`) を API へ渡す ISO 文字列に変換する。
 * `from` はその日の 00:00:00.000、 `to` は 23:59:59.999 (どちらもアプリ基準 TZ) 。
 */
export function reportPeriodToIso(period: ReportPeriod): {
  from: string | null;
  to: string | null;
} {
  return {
    from: reportDayBoundaryToIso(period.from, false),
    to: reportDayBoundaryToIso(period.to, true),
  };
}

/**
 * `YYYY-MM-DD` をアプリ基準 TZ の日境界 ISO にする。 `endOfDay` なら 23:59:59.999。
 * `YYYY-MM-DD` 以外 / null は null (呼び出し側で日時としての解釈にフォールバックする)。
 *
 * API 側も同じ変換を使うことで、 クエリに日付だけを直接渡された場合でも
 * 画面から渡した場合と同じ「カレンダー日 inclusive」の意味になる。
 */
export function reportDayBoundaryToIso(
  date: string | null | undefined,
  endOfDay: boolean,
): string | null {
  if (!date) return null;
  const parts = splitDate(date);
  if (!parts) return null;
  const base = Date.UTC(parts.y, parts.m - 1, parts.d);
  const withinDay = endOfDay ? 86_400_000 - 1 : 0;
  return new Date(base - STUDY_TZ_OFFSET_MIN * 60_000 + withinDay).toISOString();
}

/** from > to のような矛盾した期間か。 */
export function isInvalidPeriod(period: ReportPeriod): boolean {
  return Boolean(period.from && period.to && period.from > period.to);
}

// ---------------------------------------------------------------
// 行の型
// ---------------------------------------------------------------

/** 受講状況レポート 1 行 (enrollment 単位)。 */
export interface EnrollmentReportRow {
  user_id: string;
  user_name: string;
  email: string | null;
  stage_id: string;
  stage_title: string;
  status: string;
  required: boolean;
  enrolled_at: string;
  due_at: string | null;
  completed_at: string | null;
  completed_lessons: number;
  total_lessons: number;
  progress_pct: number;
}

/** 成績レポート 1 行 (小テスト受験 / 課題提出をまとめた形)。 */
export interface GradeReportRow {
  kind: "quiz" | "assignment";
  user_id: string | null;
  user_name: string;
  email: string | null;
  stage_title: string;
  item_title: string;
  score: number | null;
  max_score: number | null;
  score_pct: number | null;
  result: string;
  submitted_at: string;
  reviewed_at: string | null;
}

/** 修了証レポート 1 行。 */
export interface CertificateReportRow {
  cert_code: string;
  user_id: string;
  user_name: string;
  email: string | null;
  stage_title: string;
  issued_at: string;
  issued_by: string | null;
  revoked: boolean;
}

/** 監査レポート 1 行 (`audit_logs` の期間切り出し)。 */
export interface AuditReportRow {
  created_at: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  ip: string | null;
}

export type ReportRow =
  | EnrollmentReportRow
  | GradeReportRow
  | CertificateReportRow
  | AuditReportRow;

/** `GET /api/reports/:type` の戻り値。 */
export interface ReportResult<T extends ReportRow = ReportRow> {
  type: ReportType;
  /** 適用された期間 (ISO, null は無制限)。 */
  from: string | null;
  to: string | null;
  /** 期間に一致する総件数 (rows は limit/offset で切り出したもの)。 */
  total: number;
  rows: T[];
  generated_at: string;
}

// ---------------------------------------------------------------
// 表示メタ (列見出し / ラベル)
// ---------------------------------------------------------------

export interface ReportMeta {
  label: string;
  description: string;
  /** CSV ヘッダ兼プレビュー表の列見出し。 */
  headers: string[];
  /** ファイル名に使う接頭辞。 */
  fileBase: string;
}

export const REPORT_META: Record<ReportType, ReportMeta> = {
  enrollments: {
    label: "受講状況",
    description: "受講登録ごとの進捗・期限・完了状況",
    fileBase: "report-enrollments",
    headers: [
      "受講者",
      "メール",
      "ステージ",
      "受講状態",
      "必須",
      "登録日時",
      "期限",
      "完了日時",
      "完了レッスン",
      "総レッスン",
      "進捗率(%)",
    ],
  },
  grades: {
    label: "成績",
    description: "小テスト受験と課題提出の結果",
    fileBase: "report-grades",
    headers: [
      "種別",
      "受講者",
      "メール",
      "ステージ",
      "対象",
      "スコア",
      "満点",
      "得点率(%)",
      "結果",
      "提出日時",
      "レビュー日時",
    ],
  },
  certificates: {
    label: "修了証",
    description: "発行された修了証の一覧",
    fileBase: "report-certificates",
    headers: ["認定番号", "受講者", "メール", "ステージ", "発行日時", "発行者ID", "状態"],
  },
  audit: {
    label: "監査",
    description: "権限変更・公開・削除などの操作証跡",
    fileBase: "report-audit",
    headers: [
      "日時",
      "実行者",
      "実行者ID",
      "ロール",
      "操作",
      "操作コード",
      "対象種別",
      "対象ID",
      "IP",
    ],
  },
};

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  active: "受講中",
  completed: "完了",
  expired: "期限切れ",
};

const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  pending: "未レビュー",
  passed: "合格",
  resubmit: "再提出",
  failed: "不合格",
};

/** ISO 日時をアプリ基準 TZ の `YYYY-MM-DD HH:mm` にする。 空値は空文字。 */
export function formatReportDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return String(iso);
  const d = new Date(t + STUDY_TZ_OFFSET_MIN * 60_000);
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}` +
    ` ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
  );
}

/** ISO 日時をアプリ基準 TZ の `YYYY-MM-DD` にする。 空値は空文字。 */
export function formatReportDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return formatReportDateTime(iso).slice(0, 10);
}

/**
 * 行を CSV / プレビュー表のセル列に変換する。 `REPORT_META[type].headers` と同じ順・
 * 同じ長さを返す (プレビューと CSV の列ずれを防ぐため 1 箇所に集約する)。
 */
export function reportRowToCells(type: ReportType, row: ReportRow): string[] {
  switch (type) {
    case "enrollments": {
      const r = row as EnrollmentReportRow;
      return [
        r.user_name,
        r.email ?? "",
        r.stage_title,
        ENROLLMENT_STATUS_LABEL[r.status] ?? r.status,
        r.required ? "必須" : "任意",
        formatReportDateTime(r.enrolled_at),
        formatReportDate(r.due_at),
        formatReportDateTime(r.completed_at),
        String(r.completed_lessons),
        String(r.total_lessons),
        String(r.progress_pct),
      ];
    }
    case "grades": {
      const r = row as GradeReportRow;
      return [
        r.kind === "quiz" ? "小テスト" : "課題",
        r.user_name,
        r.email ?? "",
        r.stage_title,
        r.item_title,
        r.score === null ? "" : String(r.score),
        r.max_score === null ? "" : String(r.max_score),
        r.score_pct === null ? "" : String(r.score_pct),
        SUBMISSION_STATUS_LABEL[r.result] ?? r.result,
        formatReportDateTime(r.submitted_at),
        formatReportDateTime(r.reviewed_at),
      ];
    }
    case "certificates": {
      const r = row as CertificateReportRow;
      return [
        r.cert_code,
        r.user_name,
        r.email ?? "",
        r.stage_title,
        formatReportDateTime(r.issued_at),
        r.issued_by ?? "",
        r.revoked ? "失効" : "有効",
      ];
    }
    case "audit": {
      const r = row as AuditReportRow;
      return [
        formatReportDateTime(r.created_at),
        r.actor_name || r.actor_id || "",
        r.actor_id ?? "",
        r.actor_role ?? "",
        auditActionLabel(r.action),
        r.action,
        r.target_type,
        r.target_id ?? "",
        r.ip ?? "",
      ];
    }
    default:
      return assertNeverType(type);
  }
}

/** 種別を増やしたときに switch の取りこぼしをコンパイルエラーにするための番人。 */
function assertNeverType(type: never): string[] {
  void type;
  return [];
}

/** 行配列を CSV 用の二次元セルにする。 */
export function reportRowsToCells(type: ReportType, rows: ReportRow[]): string[][] {
  return rows.map((row) => reportRowToCells(type, row));
}

/** `report-enrollments-2026-01-01_2026-01-31.csv` のようなファイル名を組み立てる。 */
export function reportFileName(type: ReportType, period: ReportPeriod): string {
  const range = period.from || period.to ? `${period.from ?? "all"}_${period.to ?? "all"}` : "all";
  return `${REPORT_META[type].fileBase}-${range}.csv`;
}
