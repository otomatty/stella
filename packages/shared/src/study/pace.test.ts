import { describe, expect, it } from "vitest";
import {
  calculateLearningPace,
  isStudyDate,
  parsePaceSettings,
  type PaceStage,
  type PaceTask,
} from "./pace.js";

const task = (id: string, kind: PaceTask["kind"], minutes = 60): PaceTask => ({
  id,
  title: id,
  kind,
  minutes,
  pattern: "same-pattern",
  skills: ["known"],
  status: "not-started",
  passedDate: null,
});
const stage = (tasks: PaceTask[] = [], extra: Partial<PaceStage> = {}): PaceStage => ({
  id: "root",
  slug: "dev-env-basics",
  title: "開発環境",
  prerequisites: [],
  minutes: 180,
  units: [
    {
      id: "unit",
      title: "単元",
      minutes: 180,
      lessons: [{ id: "lesson", title: "コマ", minutes: 60, completed: false }],
      tasks,
    },
  ],
  ...extra,
});
const compute = (
  stages: PaceStage[],
  options: Partial<Parameters<typeof calculateLearningPace>[0]> = {},
) =>
  calculateLearningPace({
    today: "2026-10-05",
    settings: { weeklyHours: 35, startDate: "2026-10-05" },
    stages,
    ...options,
  });

describe("学習ペース", () => {
  it("修了した講座に準備中の残りを置き続けない", () => {
    expect(compute([stage([], { minutes: 2100, completed: true })])).toMatchObject({
      totalMinutes: 2100,
      completedMinutes: 2100,
      remainingWeeks: 0,
      thisWeek: [],
    });
  });
  it.each([
    [30, 42],
    [35, 36],
    [40, 31.5],
  ])("1260時間 / 週%s時間 = %s週 (補習は別枠)", (weeklyHours, weeks) => {
    const result = compute([stage([], { minutes: 1260 * 60, units: [] })], {
      settings: { weeklyHours, startDate: "2026-10-05" },
    });
    expect(result.remainingWeeks).toBe(weeks);
    expect(result.totalMinutes).toBe(1260 * 60);
    expect(result.finishDate).toBe(
      weeklyHours === 30 ? "2027-07-26" : weeklyHours === 35 ? "2027-06-14" : "2027-05-14",
    );
  });
  it.each([
    [30, "2027-07-26"],
    [35, "2027-06-14"],
    [40, "2027-05-14"],
  ] as const)("18講座に分かれていても週%s時間の終了日が1日ずれない", (weeklyHours, finishDate) => {
    const hours = [35, 70, 105, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 35, 70, 35, 140];
    const stages = hours.map((hours, i) =>
      stage([], {
        id: String(i),
        slug: String(i),
        prerequisites: i === 0 ? [] : [String(i - 1)],
        minutes: hours * 60,
        units: [],
      }),
    );
    const result = compute(stages, { settings: { weeklyHours, startDate: "2026-10-05" } });
    expect(result.finishDate).toBe(finishDate);
    expect(result.targets.at(-1)?.targetDate).toBe(finishDate);
  });
  it("開始前は期日を作らず、未来の開始日はその日を使う", () => {
    expect(compute([stage()], { settings: { weeklyHours: 35, startDate: null } })).toMatchObject({
      finishDate: null,
      thisWeek: [],
      expectedMinutes: 0,
    });
    expect(
      compute([stage()], { settings: { weeklyHours: 35, startDate: "2026-11-01" } }),
    ).toMatchObject({ finishDate: "2026-11-02", thisWeek: [], expectedMinutes: 0 });
  });
  it("前提順で目標日を出し、入力配列の順では変わらない", () => {
    const root = stage();
    const next = stage([], { id: "next", slug: "aaa-next", prerequisites: [root.slug], units: [] });
    const result = compute([next, root]);
    expect(result.targets.map((t) => t.stageId)).toEqual(["root", "next"]);
    expect(result).toEqual(compute([root, next]));
  });
  it("進捗は完了した内容の予定時間。手元の合格や提出は合格扱いにしない", () => {
    const passed = { ...task("passed", "basic"), status: "passed" as const };
    const pending = { ...task("pending", "basic"), status: "local-passed" as const };
    const s = stage([passed, pending]);
    s.units[0].lessons[0].completed = true;
    const result = compute([s]);
    expect(result.completedMinutes).toBe(120);
    expect(result.totalMinutes).toBe(180);
    expect(result.targets[0].remainingMinutes).toBe(60);
  });
  it("診断は複数の評価スキルすべてを確認した練習だけ短縮し、A・Bを残す", () => {
    const result = compute(
      [stage([task("practice", "basic"), task("A", "assessment-a"), task("B", "assessment-b")])],
      { confirmedSkills: new Set(["known"]) },
    );
    expect(result.skippedPracticeMinutes).toBe(60);
    expect(result.totalMinutes).toBe(120);
    expect(result.completedMinutes).toBe(0);
    const partial = task("two-skills", "independent");
    partial.skills.push("unconfirmed");
    expect(
      compute([stage([partial])], { confirmedSkills: new Set(["known"]) }).skippedPracticeMinutes,
    ).toBe(0);
  });
  it("診断を後から登録しても、短縮分を進捗として二重に加算しない", () => {
    const passed = { ...task("passed", "basic"), status: "passed" as const };
    expect(compute([stage([passed])], { confirmedSkills: new Set(["known"]) })).toMatchObject({
      completedMinutes: 0,
      totalMinutes: 120,
      skippedPracticeMinutes: 60,
    });
  });
  it("Bは同じ単元・パターンのA合格から7日後。手元合格では予定しない", () => {
    const a = {
      ...task("A", "assessment-a"),
      status: "ai-passed" as const,
      passedDate: "2026-10-04",
    };
    const b = task("B", "assessment-b");
    const result = compute([stage([a, b])]);
    expect(result.assessments).toEqual([
      { taskId: "B", stageId: "root", title: "B", dueDate: "2026-10-11" },
    ]);
    expect(result.finishDate).toBe("2026-10-12");
    expect(compute([stage([{ ...a, status: "local-passed" }, b])]).assessments).toEqual([]);
    expect(compute([stage([a, { ...b, pattern: "other" }])]).assessments).toEqual([]);
  });
  it("7日経つ前のBは今週に入れず、合格済みBは再予定しない", () => {
    const a = { ...task("A", "assessment-a"), status: "passed" as const, passedDate: "2026-10-05" };
    const b = task("B", "assessment-b");
    const result = compute([stage([a, b])]);
    expect(result.thisWeek[0].minutes).toBe(60);
    expect(compute([stage([a, { ...b, status: "passed" }])]).assessments).toEqual([]);
  });
  it("日曜解禁のBは日曜の容量だけを使い、それ以前は別の単元に割り当てる", () => {
    const a = { ...task("A", "assessment-a"), status: "passed" as const, passedDate: "2026-10-04" };
    const first = stage([a, task("B", "assessment-b", 90)], { minutes: 150 });
    first.units[0].minutes = 150;
    const next = { ...stage().units[0], id: "next-unit", minutes: 420 };
    first.units.push(next);
    first.minutes += next.minutes;
    const result = compute([first], { settings: { weeklyHours: 7, startDate: "2026-10-05" } });
    expect(result.thisWeek.map(({ unitId, minutes }) => ({ unitId, minutes }))).toEqual([
      { unitId: "next-unit", minutes: 360 },
      { unitId: "unit", minutes: 60 },
    ]);
  });
  it("同時に解禁する複数のBは終了予定でも今週の容量でも重ならない", () => {
    const units = [0, 1].map((i) => ({
      ...stage().units[0],
      id: `unit-${i}`,
      minutes: 120,
      tasks: [
        { ...task(`A-${i}`, "assessment-a"), status: "passed" as const, passedDate: "2026-10-05" },
        task(`B-${i}`, "assessment-b"),
      ],
    }));
    const result = compute([stage([], { minutes: 240, units })], {
      settings: { weeklyHours: 7, startDate: "2026-10-05" },
    });
    expect(result.finishDate).toBe("2026-10-14");
    expect(result.targets[0].targetDate).toBe("2026-10-14");
    expect(result.thisWeek).toEqual([]);
    const releasedThisWeek = units.map((u) => ({
      ...u,
      tasks: [{ ...u.tasks[0], passedDate: "2026-10-04" }, u.tasks[1]],
    }));
    const sunday = compute([stage([], { minutes: 240, units: releasedThisWeek })], {
      settings: { weeklyHours: 7, startDate: "2026-10-05" },
    });
    expect(sunday.thisWeek.reduce((sum, u) => sum + u.minutes, 0)).toBe(60);
    expect(sunday.finishDate).toBe("2026-10-13");
  });
  describe("講座の残りがBの解禁待ちだけのとき", () => {
    // 週7時間 = 1日60分。親は修了済みで、HTMLとJSのどちらも着手できる。
    const settings = { weeklyHours: 7, startDate: "2026-10-05" };
    const parent = stage([], { id: "parent", completed: true, units: [] });
    const html = (a: PaceTask) => {
      const s = stage([a, task("B", "assessment-b")], {
        id: "html",
        slug: "html-css-basics",
        prerequisites: [parent.slug],
        minutes: 120,
      });
      s.units[0].minutes = 120;
      return s;
    };
    const js = (prerequisites: string[]) => {
      const s = stage([], { id: "js", slug: "javascript-basics", prerequisites, minutes: 600 });
      s.units[0] = { ...s.units[0], id: "js-unit", minutes: 600 };
      return s;
    };
    const passedA = {
      ...task("A", "assessment-a"),
      status: "passed" as const,
      passedDate: "2026-10-05",
    };
    const summary = (result: ReturnType<typeof compute>) => ({
      targets: result.targets.map(({ stageId, targetDate }) => ({ stageId, targetDate })),
      finishDate: result.finishDate,
      thisWeek: result.thisWeek.map(({ unitId, minutes }) => ({ unitId, minutes })),
    });

    it("待つ間は前提を満たした兄弟講座を進め、解禁したBを割り込ませる", () => {
      // HTMLのBは10/12解禁 (420分後)。JSを420分進め、Bの60分のあと残り180分に戻る。
      expect(summary(compute([parent, html(passedA), js([parent.slug])], { settings }))).toEqual({
        targets: [
          { stageId: "parent", targetDate: "2026-10-05" },
          { stageId: "html", targetDate: "2026-10-13" },
          { stageId: "js", targetDate: "2026-10-16" },
        ],
        finishDate: "2026-10-16",
        thisWeek: [{ unitId: "js-unit", minutes: 420 }],
      });
      // Aが未合格なら、Aの60分を終えた時点から7日待つ。その間もJSを進める。
      expect(
        summary(
          compute([parent, html(task("A", "assessment-a")), js([parent.slug])], { settings }),
        ),
      ).toEqual({
        targets: [
          { stageId: "parent", targetDate: "2026-10-05" },
          { stageId: "html", targetDate: "2026-10-14" },
          { stageId: "js", targetDate: "2026-10-17" },
        ],
        finishDate: "2026-10-17",
        thisWeek: [
          { unitId: "unit", minutes: 60 },
          { unitId: "js-unit", minutes: 360 },
        ],
      });
    });
    it("Bを待つ講座の子講座は、Bを終えて講座が完了するまで始めない", () => {
      // JSがHTMLの子なら解放はBの後。待つ7日は空き、終了日は兄弟の場合 (10/16) より遅い。
      expect(
        summary(compute([parent, html(passedA), js(["html-css-basics"])], { settings })),
      ).toEqual({
        targets: [
          { stageId: "parent", targetDate: "2026-10-05" },
          { stageId: "html", targetDate: "2026-10-13" },
          { stageId: "js", targetDate: "2026-10-23" },
        ],
        finishDate: "2026-10-23",
        thisWeek: [],
      });
    });
  });
  it.each([false, true])(
    "未合格AからのB予測は完了・診断済みの練習を足し直さない (%s)",
    (diagnosed) => {
      const s = stage([
        { ...task("practice", "basic"), status: "passed" },
        task("A", "assessment-a", 30),
        task("B", "assessment-b", 30),
      ]);
      s.units[0].lessons[0].completed = true;
      const result = compute([s], {
        settings: { weeklyHours: 7, startDate: "2026-10-05" },
        confirmedSkills: diagnosed ? new Set(["known"]) : undefined,
      });
      expect(result.targets[0].remainingMinutes).toBe(60);
      expect(result.finishDate).toBe("2026-10-13");
      expect(result.thisWeek[0].minutes).toBe(30);
    },
  );
  it("差がちょうど1週なら通知せず、超えたら残りだけ引き直す", () => {
    const s = stage([], { minutes: 1260 * 60, units: [] });
    expect(compute([s], { today: "2026-10-12" })).toMatchObject({
      delayDays: 7,
      needsInstructor: false,
    });
    const result = compute([s], { today: "2026-10-13" });
    expect(result.needsInstructor).toBe(true);
    expect(result.remainingWeeks).toBe(36);
    expect(result.finishDate).toBe("2027-06-22");
  });
  it("時間を変更しても過去の期待時間を改変せず、残りは新しい時間で計算する", () => {
    const result = compute([stage([], { minutes: 1260 * 60, units: [] })], {
      today: "2026-10-19",
      settings: { weeklyHours: 40, startDate: "2026-10-05" },
      changes: [
        { date: "2026-10-12", weeklyHours: 30, previousWeeklyHours: 35 },
        { date: "2026-10-19", weeklyHours: 40, previousWeeklyHours: 30 },
      ],
    });
    expect(result.expectedMinutes).toBe(65 * 60);
    expect(result.remainingWeeks).toBe(31.5);
  });
  it("初回変更より前や開始日を過去に直した期間は、保存した変更前の時間を使う", () => {
    const result = compute([stage([], { minutes: 1260 * 60, units: [] })], {
      today: "2026-10-19",
      settings: { weeklyHours: 40, startDate: "2026-10-05" },
      changes: [{ date: "2026-10-12", weeklyHours: 40, previousWeeklyHours: 30 }],
    });
    expect(result.expectedMinutes).toBe(70 * 60);
  });
  it("準備中のコマを捏造せず、週末は残り1日分だけを目安にする", () => {
    const result = compute([stage()], {
      today: "2026-10-11",
      settings: { weeklyHours: 7, startDate: "2026-10-05" },
    });
    expect(result.thisWeek[0]).toMatchObject({ minutes: 60, sessions: 1 });
    expect(compute([stage([], { minutes: 2100, units: [] })])).toMatchObject({
      incomplete: true,
      thisWeek: [],
    });
  });
});

describe("学習設定の入力", () => {
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "bad"])(
    "実在しない日付%sを拒否する",
    (value) => expect(isStudyDate(value)).toBe(false),
  );
  it("うるう日・null・部分更新を受け付ける", () => {
    expect(isStudyDate("2028-02-29")).toBe(true);
    expect(parsePaceSettings({ weekly_hours: 30 })).toEqual({ weeklyHours: 30 });
    expect(parsePaceSettings({ learning_start_date: null })).toEqual({ startDate: null });
  });
  it.each([0, -1, 81, Infinity, NaN, "35"])("時間%sを拒否する", (weekly_hours) =>
    expect(() => parsePaceSettings({ weekly_hours })).toThrow(),
  );
});
