import { describe, expect, it } from "vitest";

import {
  PRACTICE_SET_SIZE,
  type PracticeCandidate,
  practiceBucket,
  nextUnratedIndex,
  practiceSetProgress,
  remainingPracticeQuestions,
  selectPracticeSet,
  summarizePracticeSet,
} from "./practice-set";

const TODAY = "2026-08-24";

function candidate(no: number, over: Partial<PracticeCandidate> = {}): PracticeCandidate {
  return { no, freq: "A", is_reverse: false, ...over };
}

describe("practiceBucket", () => {
  it("A 必修以外と逆質問は出題対象にしない", () => {
    expect(practiceBucket(candidate(1, { freq: "B" }), TODAY)).toBeNull();
    expect(practiceBucket(candidate(2, { freq: "C" }), TODAY)).toBeNull();
    expect(practiceBucket(candidate(3, { is_reverse: true }), TODAY)).toBeNull();
  });

  it("自己評価がまだ無い質問は fresh", () => {
    expect(practiceBucket(candidate(1), TODAY)).toBe("fresh");
    // 「型を読んだ」だけでは練習していないので fresh のまま
    expect(practiceBucket(candidate(1, { status: "read" }), TODAY)).toBe("fresh");
  });

  it("「もう一度」で期日を迎えたものが again", () => {
    expect(
      practiceBucket(candidate(1, { lastResult: "again", srsDueDate: "2026-08-23" }), TODAY),
    ).toBe("again");
    expect(practiceBucket(candidate(1, { lastResult: "again", srsDueDate: TODAY }), TODAY)).toBe(
      "again",
    );
  });

  it("期日が未来なら「もう一度」でも ahead (同じ日に何度も出さない)", () => {
    expect(
      practiceBucket(candidate(1, { lastResult: "again", srsDueDate: "2026-08-25" }), TODAY),
    ).toBe("ahead");
    expect(
      practiceBucket(
        candidate(1, { status: "confident", lastResult: "good", srsDueDate: "2026-09-10" }),
        TODAY,
      ),
    ).toBe("ahead");
  });

  it("SM-2 列より前の行は status / 練習回数から復元する", () => {
    // Issue #232 の行は last_result も期日も持たない。 練習OK を「未練習」に落とすと
    // 一度も触っていない質問より先に並んでしまう
    expect(practiceBucket(candidate(1, { status: "confident" }), TODAY)).toBe("due");
    // 「もう一度」だけ押した行 (status は read のまま練習回数だけ増える)
    expect(practiceBucket(candidate(2, { status: "read", practicedCount: 2 }), TODAY)).toBe(
      "again",
    );
    // 開いただけ (型を読んだ) は未練習のまま
    expect(practiceBucket(candidate(3, { status: "read", practicedCount: 0 }), TODAY)).toBe(
      "fresh",
    );
  });

  it("練習OK でも期日を過ぎていれば due", () => {
    expect(
      practiceBucket(
        candidate(1, { status: "confident", lastResult: "good", srsDueDate: "2026-08-20" }),
        TODAY,
      ),
    ).toBe("due");
  });
});

describe("selectPracticeSet", () => {
  it("もう一度 → 未練習 → due の順に詰める", () => {
    const nos = selectPracticeSet(
      [
        candidate(5, { status: "confident", lastResult: "good", srsDueDate: "2026-08-01" }),
        candidate(3),
        candidate(1, { lastResult: "again", srsDueDate: "2026-08-23" }),
      ],
      TODAY,
      3,
    );
    expect(nos).toEqual([1, 3, 5]);
  });

  it("10 問で打ち切る", () => {
    const nos = selectPracticeSet(
      Array.from({ length: 40 }, (_, i) => candidate(i + 1)),
      TODAY,
    );
    expect(nos).toHaveLength(PRACTICE_SET_SIZE);
    expect(nos[0]).toBe(1);
  });

  it("期日前の得意な質問は不足分の補充にだけ使う", () => {
    const ahead = Array.from({ length: 5 }, (_, i) =>
      candidate(100 + i, { status: "confident", lastResult: "good", srsDueDate: "2026-12-31" }),
    );
    const withFresh = selectPracticeSet([...ahead, candidate(1), candidate(2)], TODAY, 3);
    expect(withFresh.slice(0, 2)).toEqual([1, 2]);
    expect(withFresh).toHaveLength(3);

    // 対象が期日前しか無ければ、 期日の近い順に補充する
    expect(selectPracticeSet(ahead, TODAY, 2)).toEqual([100, 101]);
  });

  it("バケット内は期日の古い順 → 質問番号順で決定的に並ぶ", () => {
    const nos = selectPracticeSet(
      [
        candidate(9, { lastResult: "again", srsDueDate: "2026-08-23" }),
        candidate(4, { lastResult: "again", srsDueDate: "2026-08-23" }),
        candidate(7, { lastResult: "again", srsDueDate: "2026-08-10" }),
      ],
      TODAY,
    );
    expect(nos).toEqual([7, 4, 9]);
  });

  it("SM-2 以前の 練習OK が未着手を押しのけない", () => {
    const nos = selectPracticeSet(
      [
        candidate(1, { status: "confident" }), // 旧データ: 期日なしの 練習OK
        candidate(9, { status: "read" }), // 未練習
      ],
      TODAY,
      2,
    );
    expect(nos).toEqual([9, 1]);
  });

  it("対象外しか無ければ空", () => {
    expect(
      selectPracticeSet([candidate(1, { freq: "B" }), candidate(2, { is_reverse: true })], TODAY),
    ).toEqual([]);
  });
});

describe("practiceSetProgress", () => {
  it("残りと次の質問を返す", () => {
    const p = practiceSetProgress([1, 2, 3], [2]);
    expect(p).toMatchObject({ total: 3, completed: 1, remaining: 2, nextNo: 1, finished: false });
  });

  it("全問終えたら finished", () => {
    const p = practiceSetProgress([1, 2], [2, 1]);
    expect(p).toMatchObject({ completed: 2, remaining: 0, nextNo: null, finished: true });
  });

  it("セットに無い番号は数えない", () => {
    expect(practiceSetProgress([1, 2], [9]).completed).toBe(0);
  });
});

describe("remainingPracticeQuestions", () => {
  it("完了済みを除き、 セットの順番は保つ", () => {
    expect(remainingPracticeQuestions([1, 2, 3, 4], [2])).toEqual([1, 3, 4]);
  });

  it("パスした質問 (未評価) は残り、 評価済みだけが消える", () => {
    // 1 をパス → 未評価なので残る。 3 は評価済みなので再開時には出さない
    expect(remainingPracticeQuestions([1, 2, 3], [3])).toEqual([1, 2]);
  });

  it("手元にない質問は出題しない", () => {
    expect(remainingPracticeQuestions([1, 2, 3], [], [1, 3])).toEqual([1, 3]);
  });

  it("全問終えていれば空", () => {
    expect(remainingPracticeQuestions([1, 2], [2, 1])).toEqual([]);
  });
});

describe("nextUnratedIndex", () => {
  it("後ろの未評価へ進む", () => {
    expect(nextUnratedIndex([1, 2, 3], 0, [])).toBe(1);
  });

  it("評価済みは飛ばす", () => {
    expect(nextUnratedIndex([1, 2, 3], 0, [2])).toBe(2);
  });

  it("末尾まで来たらパスした質問へ戻る (置き去りにしない)", () => {
    // 1 をパス → 2, 3 は評価済み → 末尾から 1 へ戻る
    expect(nextUnratedIndex([1, 2, 3], 2, [2, 3])).toBe(0);
  });

  it("いま離れる質問には戻らない", () => {
    // 3 をパスした直後。 他が全部評価済みなら終了 (同じ質問に留まらない)
    expect(nextUnratedIndex([1, 2, 3], 2, [1, 2])).toBeNull();
  });

  it("全問評価済みなら終了", () => {
    expect(nextUnratedIndex([1, 2, 3], 2, [1, 2, 3])).toBeNull();
  });
});

describe("summarizePracticeSet", () => {
  it("できた / もう一度 / 未回答 と準備率の伸びを出す", () => {
    const s = summarizePracticeSet({
      questionNos: [1, 2, 3, 4],
      completedNos: [1, 2, 3],
      confidentNos: [1, 3],
      startedPercent: 40,
      currentPercent: 55,
    });
    expect(s).toEqual({
      total: 4,
      confident: 2,
      again: 1,
      skipped: 1,
      startedPercent: 40,
      currentPercent: 55,
      gainedPercent: 15,
    });
  });

  it("セット外の番号は集計に混ぜない", () => {
    const s = summarizePracticeSet({
      questionNos: [1],
      completedNos: [1, 99],
      confidentNos: [99],
      startedPercent: 0,
      currentPercent: 0,
    });
    expect(s).toMatchObject({ total: 1, confident: 0, again: 1, skipped: 0, gainedPercent: 0 });
  });
});
