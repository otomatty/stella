import { describe, expect, it } from "vitest";

import {
  DISCOVERY_PASS_SCORE,
  gradeDiscovery,
  hasUsableCorrectOptions,
  isDiscoveryVisible,
  normalizeDiscoveryQuestions,
  toDiscoveryPaper,
  type DiscoveryQuestion,
} from "./types.js";

describe("isDiscoveryVisible (公開条件)", () => {
  it("進行中とクリア済みだけに出す", () => {
    expect(isDiscoveryVisible("active")).toBe(true);
    expect(isDiscoveryVisible("cleared")).toBe(true);
  });

  it("開いただけ / ロック / 未知の状態には出さない", () => {
    expect(isDiscoveryVisible("unlocked")).toBe(false);
    expect(isDiscoveryVisible("locked")).toBe(false);
    expect(isDiscoveryVisible(undefined)).toBe(false);
  });
});

function question(id: string, correct: string[]): DiscoveryQuestion {
  return {
    id,
    prompt: `${id} の問題文`,
    options: [
      { id: `${id}o1`, label: "選択肢 1", correct: correct.includes(`${id}o1`) },
      { id: `${id}o2`, label: "選択肢 2", correct: correct.includes(`${id}o2`) },
      { id: `${id}o3`, label: "選択肢 3", correct: correct.includes(`${id}o3`) },
    ],
  };
}

describe("normalizeDiscoveryQuestions", () => {
  it("問題文の無い設問と選択肢 2 つ未満の設問を捨てる", () => {
    const rows = normalizeDiscoveryQuestions([
      { prompt: "", options: [{ label: "a" }, { label: "b" }] },
      { prompt: "選択肢が 1 つ", options: [{ label: "a", correct: true }] },
      { prompt: "正しい設問", options: [{ label: "a", correct: true }, { label: "b" }] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.prompt).toBe("正しい設問");
  });

  it("id が無ければ位置から振る (採点の突き合わせに使うため必ず入る)", () => {
    const rows = normalizeDiscoveryQuestions([
      { prompt: "問 1", options: [{ label: "a", correct: true }, { label: "b" }] },
    ]);
    expect(rows[0]?.id).toBe("q1");
    expect(rows[0]?.options.map((o) => o.id)).toEqual(["q1o1", "q1o2"]);
  });

  it("配列でない値は空配列 (壊れた JSON 列を読んでも落ちない)", () => {
    expect(normalizeDiscoveryQuestions(null)).toEqual([]);
    expect(normalizeDiscoveryQuestions("[]")).toEqual([]);
  });

  it("選択肢 id が重複していたら位置ベースへ振り直す", () => {
    const rows = normalizeDiscoveryQuestions([
      {
        id: "q1",
        prompt: "重複した選択肢 id",
        options: [
          { id: "same", label: "正しい", correct: true },
          { id: "same", label: "誤り", correct: false },
        ],
      },
    ]);
    expect(rows[0]?.options.map((o) => o.id)).toEqual(["q1o1", "q1o2"]);
  });

  it("設問 id が重複していたら位置ベースへ振り直す", () => {
    const rows = normalizeDiscoveryQuestions([
      { id: "dup", prompt: "問 1", options: [{ label: "a", correct: true }, { label: "b" }] },
      { id: "dup", prompt: "問 2", options: [{ label: "a", correct: true }, { label: "b" }] },
    ]);
    expect(rows.map((q) => q.id)).toEqual(["q1", "q2"]);
  });

  it("重複が無ければ id は動かさない (受験中の突き合わせを変えない)", () => {
    const rows = normalizeDiscoveryQuestions([
      {
        id: "keep-me",
        prompt: "問 1",
        options: [
          { id: "o-a", label: "a", correct: true },
          { id: "o-b", label: "b" },
        ],
      },
    ]);
    expect(rows[0]?.id).toBe("keep-me");
    expect(rows[0]?.options.map((o) => o.id)).toEqual(["o-a", "o-b"]);
  });

  it("誤答が正答と同じ id を持っていても、誤答を選んで満点にはならない", () => {
    // 採点は id の集合一致で決まる。id を共有したままだと「誤りを選んだのに
    // 正答 id を選んだ」ことになり、何を選んでも合格してしまう。
    const questions = normalizeDiscoveryQuestions([
      {
        id: "q1",
        prompt: "正しいのはどれ?",
        options: [
          { id: "same", label: "正しい", correct: true },
          { id: "same", label: "誤り", correct: false },
        ],
      },
    ]);
    const wrongId = questions[0]?.options[1]?.id ?? "";
    const grade = gradeDiscovery(questions, [
      { question_id: "q1", selected_option_ids: [wrongId] },
    ]);
    expect(grade.score).toBe(0);
    expect(grade.passed).toBe(false);
  });
});

describe("hasUsableCorrectOptions (承認の条件)", () => {
  it("全問に正答があれば true", () => {
    expect(hasUsableCorrectOptions([question("q1", ["q1o1"]), question("q2", ["q2o2"])])).toBe(
      true,
    );
  });

  it("正答の無い設問が 1 つでもあれば false", () => {
    expect(hasUsableCorrectOptions([question("q1", ["q1o1"]), question("q2", [])])).toBe(false);
  });

  it("設問 0 問は false (空の教材を承認させない)", () => {
    expect(hasUsableCorrectOptions([])).toBe(false);
  });
});

describe("toDiscoveryPaper", () => {
  it("正答も解説も落とす", () => {
    const paper = toDiscoveryPaper([
      { ...question("q1", ["q1o1"]), explanation: "ここが理由です" },
    ]);
    const serialized = JSON.stringify(paper);
    expect(serialized).not.toContain("correct");
    expect(serialized).not.toContain("explanation");
    expect(serialized).not.toContain("理由");
  });

  it("正答が 2 つ以上なら複数選択として渡す", () => {
    expect(toDiscoveryPaper([question("q1", ["q1o1", "q1o2"])])[0]?.kind).toBe("multiple");
    expect(toDiscoveryPaper([question("q1", ["q1o1"])])[0]?.kind).toBe("single");
  });
});

describe("gradeDiscovery", () => {
  const questions = [
    question("q1", ["q1o1"]),
    question("q2", ["q2o2"]),
    question("q3", ["q3o1", "q3o2"]),
    question("q4", ["q4o3"]),
  ];

  it("正解集合との完全一致で 1 問ぶん (部分点なし)", () => {
    const grade = gradeDiscovery(questions, [
      { question_id: "q1", selected_option_ids: ["q1o1"] },
      { question_id: "q2", selected_option_ids: ["q2o1"] },
      // 複数正答の片方だけは不正解。
      { question_id: "q3", selected_option_ids: ["q3o1"] },
      { question_id: "q4", selected_option_ids: ["q4o3"] },
    ]);
    expect(grade.maxScore).toBe(4);
    expect(grade.score).toBe(2);
    expect(grade.percent).toBe(50);
    expect(grade.passed).toBe(false);
  });

  it("受験票に無い設問 id を混ぜても得点は動かない", () => {
    const grade = gradeDiscovery(questions, [
      ...questions.map((q) => ({
        question_id: q.id,
        selected_option_ids: q.options.filter((o) => o.correct).map((o) => o.id),
      })),
      { question_id: "other", selected_option_ids: ["x"] },
    ]);
    expect(grade.score).toBe(4);
    expect(grade.percent).toBe(100);
    expect(grade.passed).toBe(true);
  });

  it("正答を持たない設問は満点にも数えない", () => {
    const grade = gradeDiscovery(
      [question("q1", ["q1o1"]), question("q2", [])],
      [{ question_id: "q1", selected_option_ids: ["q1o1"] }],
    );
    expect(grade.maxScore).toBe(1);
    expect(grade.score).toBe(1);
    expect(grade.passed).toBe(true);
  });

  it("満点 0 は不合格 (空の教材で合格させない)", () => {
    const grade = gradeDiscovery([], []);
    expect(grade.maxScore).toBe(0);
    expect(grade.percent).toBe(0);
    expect(grade.passed).toBe(false);
  });

  it(`合格ラインは ${DISCOVERY_PASS_SCORE}%`, () => {
    const answers = (n: number) =>
      questions.slice(0, n).map((q) => ({
        question_id: q.id,
        selected_option_ids: q.options.filter((o) => o.correct).map((o) => o.id),
      }));
    expect(gradeDiscovery(questions, answers(2)).passed).toBe(false);
    expect(gradeDiscovery(questions, answers(3)).passed).toBe(true);
  });
});
