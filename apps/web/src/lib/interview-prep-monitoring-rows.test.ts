/**
 * Issue #236 — 割当保存後の一覧行の楽観更新。
 *
 * 回帰の起点: 割当カテゴリを変えても集計値 (準備率・内訳) が旧割当のまま残り、
 * 「案件・割当は Java なのに準備率は PHP のときの値」という食い違いが居座っていた。
 * 準備率の分母は割当範囲の A 必修なので、 カテゴリが変わったら再集計まで「未算出」に落とす。
 */

import { describe, expect, it } from "vitest";

import { monitoringRisk } from "@falcon/shared/interview/monitoring";
import {
  applyAssignmentSave,
  mergeAssignmentAggregates,
  monitoringRowsOf,
  monitoringSummaryOf,
  restoreAssignmentRow,
  type InterviewPrepAssignmentRow,
} from "./interview-prep-api";

const TODAY = "2026-09-10";

function row(over: Partial<InterviewPrepAssignmentRow> = {}): InterviewPrepAssignmentRow {
  return {
    profile_id: "seed-learner",
    display_name: "Learner A",
    email: "learner-a@example.local",
    categories: ["PHP"],
    interviewDate: "2026-09-14",
    note: "EC 保守案件",
    prepRate: 80,
    prepTotal: 28,
    breakdown: { confident: 22, drafted: 3, read: 2, none: 1 },
    lastPracticedAt: "2026-09-09T00:00:00.000Z",
    ...over,
  };
}

describe("applyAssignmentSave — 割当カテゴリの変更", () => {
  it("カテゴリを変えたら準備率・分母・内訳を落とす (旧割当の値を残さない)", () => {
    const [next] = applyAssignmentSave([row()], "seed-learner", { categories: ["JS"] });

    expect(next.categories).toEqual(["JS"]);
    expect(next.prepRate).toBeUndefined();
    expect(next.prepTotal).toBeUndefined();
    expect(next.breakdown).toBeUndefined();
  });

  it("最終練習日は割当に依存しないので残す", () => {
    const [next] = applyAssignmentSave([row()], "seed-learner", { categories: ["JS"] });

    expect(next.lastPracticedAt).toBe("2026-09-09T00:00:00.000Z");
  });

  it("同じ集合を保存し直しただけなら集計値を落とさない (順序違いも同じ扱い)", () => {
    const base = row({ categories: ["PHP", "SQL"] });

    expect(
      applyAssignmentSave([base], "seed-learner", { categories: ["PHP", "SQL"] })[0].prepRate,
    ).toBe(80);
    expect(
      applyAssignmentSave([base], "seed-learner", { categories: ["SQL", "PHP"] })[0].prepRate,
    ).toBe(80);
  });

  it("面談日・メモの保存では集計値を落とさない (準備率の分母に効かない)", () => {
    const [next] = applyAssignmentSave([row()], "seed-learner", {
      interviewDate: "2026-09-20",
      note: "別案件",
    });

    expect(next.interviewDate).toBe("2026-09-20");
    expect(next.note).toBe("別案件");
    expect(next.prepRate).toBe(80);
    expect(next.breakdown).toEqual({ confident: 22, drafted: 3, read: 2, none: 1 });
  });

  it("他の受講者の行には触らない", () => {
    const rows = [row(), row({ profile_id: "seed-learner-b", display_name: "Learner B" })];

    const next = applyAssignmentSave(rows, "seed-learner", { categories: ["JS"] });
    const other = next.find((r) => r.profile_id === "seed-learner-b");

    expect(other?.categories).toEqual(["PHP"]);
    expect(other?.prepRate).toBe(80);
  });

  it("面談日を変えたら面談日順に並べ直す", () => {
    const rows = [
      row({ profile_id: "a", display_name: "A", interviewDate: "2026-09-12" }),
      row({ profile_id: "b", display_name: "B", interviewDate: "2026-09-20" }),
    ];

    const next = applyAssignmentSave(rows, "b", { interviewDate: "2026-09-11" }, TODAY);

    expect(next.map((r) => r.profile_id)).toEqual(["b", "a"]);
  });
});

describe("未算出の準備率の扱い", () => {
  it("集計待ちの行は 0% ではなく未算出として渡す", () => {
    const [pending] = applyAssignmentSave([row()], "seed-learner", { categories: ["JS"] });

    expect(monitoringSummaryOf(pending).prepPercent).toBeNull();
  });

  it("集計待ちの行を偽の「要フォロー」にしない", () => {
    // 面談は 4 日後。 0% 扱いなら alert になってしまう組み合わせ。
    const [pending] = applyAssignmentSave([row({ interviewDate: "2026-09-14" })], "seed-learner", {
      categories: ["JS"],
    });

    expect(monitoringRisk(monitoringSummaryOf(pending), TODAY)).toBe("none");
  });

  it("再集計後の値が届けば通常どおり判定する", () => {
    const refreshed = row({ categories: ["JS"], prepRate: 20, prepTotal: 10 });

    expect(monitoringRisk(monitoringSummaryOf(refreshed), TODAY)).toBe("alert");
  });
});

describe("mergeAssignmentAggregates — 再取得と保存の競合", () => {
  /** 再取得が飛んでいる最中に別の行で面談日を保存した、 という状況を作る。 */
  it("再取得中に保存した面談日・メモを巻き戻さない", () => {
    const fetched = [
      row({ profile_id: "a", display_name: "A", interviewDate: "2026-09-14", note: "旧メモ" }),
      row({ profile_id: "b", display_name: "B", interviewDate: "2026-09-20", note: "旧メモ" }),
    ];
    // b の予定を保存 (楽観更新) → その後に、 保存前を読んだ再取得が返ってくる
    const current = applyAssignmentSave(fetched, "b", {
      interviewDate: "2026-09-01",
      note: "新メモ",
    });

    const merged = mergeAssignmentAggregates(current, fetched);
    const b = merged.find((r) => r.profile_id === "b");

    expect(b?.interviewDate).toBe("2026-09-01");
    expect(b?.note).toBe("新メモ");
  });

  it("割当が一致する行には集計値を取り込む", () => {
    const current = [row({ prepRate: undefined, prepTotal: undefined, breakdown: undefined })];
    const fetched = [
      row({
        prepRate: 45,
        prepTotal: 20,
        breakdown: { confident: 9, drafted: 1, read: 0, none: 10 },
      }),
    ];

    const [merged] = mergeAssignmentAggregates(current, fetched);

    expect(merged.prepRate).toBe(45);
    expect(merged.prepTotal).toBe(20);
    expect(merged.breakdown).toEqual({ confident: 9, drafted: 1, read: 0, none: 10 });
  });

  it("割当が食い違う行の集計は取り込まない (もっと新しい保存が進行中)", () => {
    // クライアントは JS へ変更済み。 返ってきたのは PHP のときの集計。
    const current = applyAssignmentSave([row({ categories: ["PHP"] })], "seed-learner", {
      categories: ["JS"],
    });
    const fetched = [row({ categories: ["PHP"], prepRate: 80, prepTotal: 28 })];

    const [merged] = mergeAssignmentAggregates(current, fetched);

    expect(merged.categories).toEqual(["JS"]);
    expect(merged.prepRate).toBeUndefined();
    expect(merged.prepTotal).toBeUndefined();
  });

  it("利用者が編集する値 (割当) をレスポンスで上書きしない", () => {
    const current = [row({ categories: ["PHP"] })];
    const fetched = [
      row({ categories: ["PHP"], interviewDate: "2026-12-31", note: "サーバ側メモ" }),
    ];

    const [merged] = mergeAssignmentAggregates(current, fetched);

    expect(merged.interviewDate).toBe("2026-09-14");
    expect(merged.note).toBe("EC 保守案件");
  });

  it("レスポンスに無い行はそのまま残す", () => {
    const current = [row({ profile_id: "a", display_name: "A" })];

    const [merged] = mergeAssignmentAggregates(current, []);

    expect(merged.profile_id).toBe("a");
    expect(merged.prepRate).toBe(80);
  });
});

describe("restoreAssignmentRow — 保存失敗のロールバック", () => {
  it("集計値も含めて保存前の行に戻す (「集計中…」で固まらせない)", () => {
    const original = row({ categories: ["PHP"] });
    // 楽観更新で JS に変え、 集計値が落ちた状態
    const optimistic = applyAssignmentSave([original], "seed-learner", { categories: ["JS"] });
    expect(optimistic[0].prepRate).toBeUndefined();

    const [restored] = restoreAssignmentRow(optimistic, original);

    expect(restored.categories).toEqual(["PHP"]);
    expect(restored.prepRate).toBe(80);
    expect(restored.prepTotal).toBe(28);
    expect(restored.breakdown).toEqual({ confident: 22, drafted: 3, read: 2, none: 1 });
  });

  it("他の受講者の行には触らない", () => {
    const original = row({ profile_id: "a", display_name: "A" });
    const other = row({ profile_id: "b", display_name: "B", categories: ["SQL"] });
    const optimistic = applyAssignmentSave([original, other], "a", { categories: ["JS"] });

    const restored = restoreAssignmentRow(optimistic, original);

    expect(restored.find((r) => r.profile_id === "b")?.categories).toEqual(["SQL"]);
  });
});

describe("monitoringRowsOf — モニタリングに並べる行", () => {
  it("受講者は割当前でも並べる (未割当であること自体が合図)", () => {
    const rows = [row({ role: "student", categories: [], interviewDate: null })];

    expect(monitoringRowsOf(rows)).toHaveLength(1);
  });

  it("割当も面談予定も無い管理者は並べない (「練習なし」で埋まらせない)", () => {
    const rows = [
      row({ profile_id: "seed-admin", role: "admin", categories: [], interviewDate: null }),
    ];

    expect(monitoringRowsOf(rows)).toHaveLength(0);
  });

  it("割当か面談予定が入った管理者は受講者と同じように並べる", () => {
    const assigned = row({ profile_id: "seed-admin", role: "admin", interviewDate: null });
    const scheduled = row({
      profile_id: "seed-admin-b",
      role: "admin",
      categories: [],
      interviewDate: "2026-09-14",
    });

    expect(monitoringRowsOf([assigned, scheduled])).toHaveLength(2);
  });

  it("role が無い応答 (旧レスポンス) は落とさない", () => {
    const rows = [row({ role: undefined, categories: [], interviewDate: null })];

    expect(monitoringRowsOf(rows)).toHaveLength(1);
  });
});
