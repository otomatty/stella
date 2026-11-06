import { describe, expect, it } from "vitest";
import type { CertificateRow, StageCompletion } from "@stella/shared/cms/types";
import type { Lesson, Stage } from "@/data/types";
import type { LessonProgressMap } from "@/lib/lesson-progress";
import { buildCertificateOverview, continueTarget } from "./certificate-overview";

describe("continueTarget", () => {
  const lesson = (id: string): Lesson => ({
    id,
    title: id,
    type: "slides",
    duration: "3分",
    status: "todo",
  });
  const stage: Stage = {
    id: "a",
    title: "ステージA",
    category: "カテゴリ",
    color: "indigo",
    progress: 0,
    lessonsCount: 2,
    sections: [{ id: "m0", title: "M0", lessons: [lesson("a"), lesson("b")] }],
  };
  const done = { completed: true, updatedAt: "2026-11-06T00:00:00.000Z" };

  it("未完了のレッスンがあればそのレッスンへ進む", () => {
    const map: LessonProgressMap = { a: done };
    expect(continueTarget(stage, map)).toEqual({ kind: "lesson", lessonId: "b" });
  });

  it("全レッスン完了ならステージへ進む", () => {
    const map: LessonProgressMap = { a: done, b: done };
    expect(continueTarget(stage, map)).toEqual({ kind: "stage" });
  });

  it("レッスンが無ければステージへ進む", () => {
    expect(continueTarget({ ...stage, sections: [], lessonsCount: 0 }, {})).toEqual({
      kind: "stage",
    });
  });

  it("ステージ情報が無ければステージへ進む", () => {
    expect(continueTarget(undefined, {})).toEqual({ kind: "stage" });
  });
});

function completion(overrides: Partial<StageCompletion> = {}): StageCompletion {
  return {
    stage_id: "a",
    stage_title: "ステージA",
    user_id: "u",
    completed_lessons: 2,
    total_lessons: 4,
    passed_quizzes: 0,
    total_quizzes: 0,
    passed_assignments: 0,
    total_assignments: 0,
    criteria: {
      require_all_lessons: true,
      require_quiz_pass: true,
      require_assignment_pass: true,
      auto_issue_certificate: true,
    },
    met: false,
    has_certificate: false,
    cert_code: null,
    ...overrides,
  };
}
function certificate(id: string, issued_at: string, revoked = false): CertificateRow {
  return {
    id,
    stage_id: id,
    issued_at,
    revoked,
    user_id: "u",
    cert_code: id,
    issued_by: null,
    criteria_snapshot: {},
    recipient_name: "名前",
    stage_title: id,
    issuer_name: "STELLA",
  };
}
const overview = (completions: StageCompletion[]) =>
  buildCertificateOverview({ stages: [], certificates: [], completions });

describe("buildCertificateOverview", () => {
  it("取り消し済みを除き、発行日の新しい順にする", () => {
    const certificates = [
      certificate("a", "2026-10-01"),
      certificate("b", "2026-11-01"),
      certificate("c", "2026-12-01", true),
    ];
    expect(
      buildCertificateOverview({ stages: [], certificates, completions: [] }).issued.map(
        (c) => c.id,
      ),
    ).toEqual(["b", "a"]);
    expect(certificates.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
  it("条件にない項目と total 0 を除き、残りと達成を集計する", () => {
    const result = overview([
      completion({
        passed_quizzes: 10,
        total_quizzes: 10,
        criteria: { ...completion().criteria, require_quiz_pass: false },
        total_assignments: 1,
        passed_assignments: 1,
      }),
    ]).near[0];
    expect(result.items.map((i) => [i.label, i.met])).toEqual([
      ["レッスン", false],
      ["課題", true],
    ]);
    expect(result.percent).toBe(60);
    expect(result.remainingText).toBe("あと 2 件（レッスン 2）");
    expect(overview([completion()]).near[0].items).toHaveLength(1);
  });
  it("残りの少ない順、同数は題名順", () => {
    const result = overview([
      completion({ stage_id: "c", stage_title: "C" }),
      completion({ stage_id: "b", stage_title: "B", completed_lessons: 3 }),
      completion({ stage_id: "a", stage_title: "A", completed_lessons: 3 }),
    ]);
    expect(result.near.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("未達成の百分率は99まで", () => {
    expect(overview([completion({ completed_lessons: 4 })]).near[0].percent).toBe(99);
  });
  it("達成済みで未発行のものだけを発行待ちにする", () => {
    const result = overview([
      completion({ met: true }),
      completion({
        stage_id: "b",
        met: true,
        criteria: { ...completion().criteria, auto_issue_certificate: false },
      }),
      completion({ stage_id: "c", met: true, has_certificate: true }),
    ]);
    expect(result.pending.map((s) => [s.id, s.autoIssue])).toEqual([
      ["a", true],
      ["b", false],
    ]);
    expect(result.near).toEqual([]);
    expect(
      buildCertificateOverview({
        stages: [],
        certificates: [certificate("a", "2026-10-01")],
        completions: [completion({ met: true })],
      }).pending,
    ).toEqual([]);
  });
  it("修了済みで修了証も集計もないステージは表示しない", () => {
    const stage: Stage = {
      id: "completed",
      title: "手動で修了したステージ",
      category: "カテゴリ",
      color: "indigo",
      progress: 100,
      completed: true,
      lessonsCount: 0,
      sections: [],
    };
    const result = buildCertificateOverview({
      stages: [stage],
      certificates: [],
      completions: [],
    });
    expect(result).toEqual({ issued: [], pending: [], near: [], idle: [] });
  });
  it("未着手、測れないもの、集計のないステージは idle", () => {
    const stage: Stage = {
      id: "missing",
      title: "集計なし",
      category: "カテゴリ",
      color: "indigo",
      progress: 0,
      lessonsCount: 0,
      sections: [],
    };
    const result = buildCertificateOverview({
      stages: [stage],
      certificates: [],
      completions: [
        completion({ completed_lessons: 0 }),
        completion({ stage_id: "empty", total_lessons: 0 }),
      ],
    });
    expect(result.idle.map((s) => s.id)).toEqual(["missing", "a", "empty"]);
    expect(result.idle[1]).toMatchObject({ title: "ステージA", category: "" });
  });
});
