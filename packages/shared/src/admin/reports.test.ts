import { describe, expect, it } from "vitest";

import {
  REPORT_META,
  formatReportDate,
  formatReportDateTime,
  isInvalidPeriod,
  isReportType,
  reportFileName,
  reportPeriodFromPreset,
  reportPeriodToIso,
  reportDayBoundaryToIso,
  reportRowToCells,
  reportRowsToCells,
  type AuditReportRow,
  type CertificateReportRow,
  type EnrollmentReportRow,
  type GradeReportRow,
} from "./reports.js";

// 2026-03-15 10:00 JST (= 2026-03-15T01:00:00Z)。
const NOW = new Date("2026-03-15T01:00:00.000Z");

describe("isReportType", () => {
  it("既知の種別のみ受け付ける", () => {
    expect(isReportType("enrollments")).toBe(true);
    expect(isReportType("audit")).toBe(true);
    expect(isReportType("unknown")).toBe(false);
    expect(isReportType(undefined)).toBe(false);
  });
});

describe("reportPeriodFromPreset", () => {
  it("今月は月初〜今日", () => {
    expect(reportPeriodFromPreset("this_month", NOW)).toEqual({
      from: "2026-03-01",
      to: "2026-03-15",
    });
  });

  it("先月は前月の月初〜月末", () => {
    expect(reportPeriodFromPreset("last_month", NOW)).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("1月の先月は前年12月", () => {
    const jan = new Date("2026-01-05T01:00:00.000Z");
    expect(reportPeriodFromPreset("last_month", jan)).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("直近30日 / 90日は今日を含む", () => {
    expect(reportPeriodFromPreset("last_30_days", NOW)).toEqual({
      from: "2026-02-14",
      to: "2026-03-15",
    });
    expect(reportPeriodFromPreset("last_90_days", NOW)).toEqual({
      from: "2025-12-16",
      to: "2026-03-15",
    });
  });

  it("年初来は 1/1 〜 今日", () => {
    expect(reportPeriodFromPreset("this_year", NOW)).toEqual({
      from: "2026-01-01",
      to: "2026-03-15",
    });
  });

  it("全期間 / 期間指定は無制限を返す", () => {
    expect(reportPeriodFromPreset("all", NOW)).toEqual({ from: null, to: null });
    expect(reportPeriodFromPreset("custom", NOW)).toEqual({ from: null, to: null });
  });

  it("日付境界は JST で切る (UTC では前日でも JST の当日になる)", () => {
    // 2026-03-01T00:30:00Z = JST 09:30 → JST では 3/1。
    expect(reportPeriodFromPreset("this_month", new Date("2026-03-01T00:30:00.000Z"))).toEqual({
      from: "2026-03-01",
      to: "2026-03-01",
    });
    // 2026-02-28T16:00:00Z = JST 3/1 01:00 → JST では 3 月扱い。
    expect(reportPeriodFromPreset("this_month", new Date("2026-02-28T16:00:00.000Z"))).toEqual({
      from: "2026-03-01",
      to: "2026-03-01",
    });
  });
});

describe("reportPeriodToIso", () => {
  it("from は JST 00:00、 to は JST 23:59:59.999 に丸める", () => {
    expect(reportPeriodToIso({ from: "2026-03-01", to: "2026-03-31" })).toEqual({
      from: "2026-02-28T15:00:00.000Z",
      to: "2026-03-31T14:59:59.999Z",
    });
  });

  it("null / 不正値は null のまま", () => {
    expect(reportPeriodToIso({ from: null, to: null })).toEqual({ from: null, to: null });
    expect(reportPeriodToIso({ from: "2026-3-1", to: "" })).toEqual({ from: null, to: null });
  });
});

describe("reportDayBoundaryToIso", () => {
  it("日付だけの値を JST の日境界として解釈する", () => {
    expect(reportDayBoundaryToIso("2026-03-01", false)).toBe("2026-02-28T15:00:00.000Z");
    expect(reportDayBoundaryToIso("2026-03-01", true)).toBe("2026-03-01T14:59:59.999Z");
  });

  it("日付以外 (ISO 日時 / 空) は null を返し、 呼び出し側の解釈に委ねる", () => {
    expect(reportDayBoundaryToIso("2026-03-01T10:00:00.000Z", false)).toBeNull();
    expect(reportDayBoundaryToIso("", false)).toBeNull();
    expect(reportDayBoundaryToIso(null, false)).toBeNull();
    expect(reportDayBoundaryToIso("2026-3-1", false)).toBeNull();
  });
});

describe("isInvalidPeriod", () => {
  it("from > to のときのみ true", () => {
    expect(isInvalidPeriod({ from: "2026-03-02", to: "2026-03-01" })).toBe(true);
    expect(isInvalidPeriod({ from: "2026-03-01", to: "2026-03-01" })).toBe(false);
    expect(isInvalidPeriod({ from: null, to: "2026-03-01" })).toBe(false);
  });
});

describe("formatReportDateTime / formatReportDate", () => {
  it("JST の日時に変換する", () => {
    expect(formatReportDateTime("2026-03-14T15:30:00.000Z")).toBe("2026-03-15 00:30");
    expect(formatReportDate("2026-03-14T15:30:00.000Z")).toBe("2026-03-15");
  });

  it("空値は空文字、 不正値はそのまま返す", () => {
    expect(formatReportDateTime(null)).toBe("");
    expect(formatReportDateTime("")).toBe("");
    expect(formatReportDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("reportRowToCells", () => {
  const enrollment: EnrollmentReportRow = {
    user_id: "u1",
    user_name: "山田 太郎",
    email: "taro@example.com",
    course_id: "c1",
    course_title: "Web 基礎",
    status: "active",
    required: true,
    enrolled_at: "2026-03-01T00:00:00.000Z",
    due_at: "2026-03-31T14:59:59.000Z",
    completed_at: null,
    completed_lessons: 3,
    total_lessons: 10,
    progress_pct: 30,
  };

  it("受講状況の列数と見出しが一致する", () => {
    const cells = reportRowToCells("enrollments", enrollment);
    expect(cells).toHaveLength(REPORT_META.enrollments.headers.length);
    expect(cells[0]).toBe("山田 太郎");
    expect(cells[3]).toBe("受講中");
    expect(cells[4]).toBe("必須");
    expect(cells[7]).toBe(""); // 未完了は空
    expect(cells[10]).toBe("30");
  });

  it("成績 (小テスト / 課題) を同じ列に揃える", () => {
    const quiz: GradeReportRow = {
      kind: "quiz",
      user_id: "u1",
      user_name: "山田 太郎",
      email: null,
      course_title: "Web 基礎",
      item_title: "第1章 小テスト",
      score: 8,
      max_score: 10,
      score_pct: 80,
      result: "passed",
      submitted_at: "2026-03-02T01:00:00.000Z",
      reviewed_at: null,
    };
    const assignment: GradeReportRow = {
      ...quiz,
      kind: "assignment",
      item_title: "課題1",
      score: null,
      max_score: null,
      score_pct: null,
      result: "pending",
      reviewed_at: "2026-03-03T01:00:00.000Z",
    };
    const quizCells = reportRowToCells("grades", quiz);
    const assignmentCells = reportRowToCells("grades", assignment);
    expect(quizCells).toHaveLength(REPORT_META.grades.headers.length);
    expect(assignmentCells).toHaveLength(REPORT_META.grades.headers.length);
    expect(quizCells[0]).toBe("小テスト");
    expect(quizCells[8]).toBe("合格");
    expect(assignmentCells[0]).toBe("課題");
    expect(assignmentCells[5]).toBe("");
    expect(assignmentCells[8]).toBe("未レビュー");
  });

  it("修了証 / 監査の列数が見出しと一致する", () => {
    const cert: CertificateReportRow = {
      cert_code: "CERT-001",
      user_id: "u1",
      user_name: "山田 太郎",
      email: null,
      course_title: "Web 基礎",
      issued_at: "2026-03-04T01:00:00.000Z",
      issued_by: "admin1",
      revoked: true,
    };
    const audit: AuditReportRow = {
      created_at: "2026-03-05T01:00:00.000Z",
      actor_id: "admin1",
      actor_name: "",
      actor_role: "admin",
      action: "user_role_change",
      target_type: "user",
      target_id: "u1",
      ip: null,
    };
    const certCells = reportRowToCells("certificates", cert);
    const auditCells = reportRowToCells("audit", audit);
    expect(certCells).toHaveLength(REPORT_META.certificates.headers.length);
    expect(certCells[6]).toBe("失効");
    expect(auditCells).toHaveLength(REPORT_META.audit.headers.length);
    // actor_name が空なら actor_id で補完する。
    expect(auditCells[1]).toBe("admin1");
    // 操作は日本語ラベル + 生の操作コードの両方を出す (監査ログ画面の CSV と同じ)。
    expect(auditCells[4]).toBe("ロール変更");
    expect(auditCells[5]).toBe("user_role_change");
  });

  it("未知のステータスはそのまま出す", () => {
    const cells = reportRowToCells("enrollments", { ...enrollment, status: "paused" });
    expect(cells[3]).toBe("paused");
  });

  it("複数行をまとめて変換できる", () => {
    expect(reportRowsToCells("enrollments", [enrollment, enrollment])).toHaveLength(2);
  });
});

describe("reportFileName", () => {
  it("期間をファイル名に含める", () => {
    expect(reportFileName("enrollments", { from: "2026-03-01", to: "2026-03-31" })).toBe(
      "report-enrollments-2026-03-01_2026-03-31.csv",
    );
    expect(reportFileName("audit", { from: null, to: null })).toBe("report-audit-all.csv");
    expect(reportFileName("grades", { from: "2026-03-01", to: null })).toBe(
      "report-grades-2026-03-01_all.csv",
    );
  });
});
