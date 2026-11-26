import { describe, expect, it } from "vitest";

import {
  peerHiddenBubble,
  peerNow,
  peerStageBubble,
  peerStageShortLabels,
  stripSharedTitlePrefix,
} from "./group-peers";

const stage = (title: string, percent: number, cleared = false) => ({ title, percent, cleared });

describe("peerNow", () => {
  const stages = [
    stage("00章 導入", 100, true),
    stage("06章 クラス", 0),
    stage("07章 継承", 45),
    stage("08章 応用", 10),
  ];

  it("並び順で最初の、修了でなく進んでいるステージを割合なしで出す", () => {
    expect(peerNow(stages, true, true)).toEqual({ kind: "stage", title: "07章 継承" });
  });

  it("進んでいるステージが無く先に進んでいれば題名を伏せる", () => {
    expect(peerNow([stage("06章 クラス", 0)], true, true)).toEqual({ kind: "ahead" });
  });

  it("まだ始めていなければ最初のステージを出す", () => {
    expect(peerNow([stage("00章", 0), stage("01章", 0)], false, true)).toEqual({
      kind: "stage",
      title: "00章",
    });
  });

  it("修了したステージの次があれば、修了ではなく次のステージを出す", () => {
    expect(peerNow([stage("00章", 100, true), stage("01章", 0)], false, false)).toEqual({
      kind: "stage",
      title: "01章",
    });
  });

  it("途中に未修了があり後ろに続きが無ければ、並び順で最初の未修了を出す", () => {
    expect(
      peerNow([stage("00章", 100, true), stage("01章", 0), stage("02章", 100, true)], false, false),
    ).toEqual({ kind: "stage", title: "01章" });
  });

  it("見えるステージをすべて修了し、見えないステージがあれば題名を伏せる", () => {
    expect(peerNow([stage("00章", 100, true), stage("01章", 100, true)], false, true)).toEqual({
      kind: "ahead",
    });
  });

  it("グループのステージをすべて修了したら「まで修了」と出す", () => {
    expect(peerNow([stage("00章", 100, true), stage("01章", 100, true)], false, false)).toEqual({
      kind: "done",
      label: "✓ 01章まで修了",
    });
  });

  it("ステージが無ければ何も出さない", () => {
    expect(peerNow([], false, false)).toEqual({ kind: "empty" });
  });
});

describe("peerStageShortLabels", () => {
  it("題名がすべて章番号を含むときはその数字にする", () => {
    expect(
      peerStageShortLabels(["開発ラボG 第1部 00章 導入", "開発ラボG 第1部 06章 クラス"]),
    ).toEqual(["00", "06"]);
  });

  it("1 つでも章番号が無ければ並び順の番号にする", () => {
    expect(peerStageShortLabels(["06章 クラス", "確認A"])).toEqual(["1", "2"]);
  });

  it("3 桁の数字に続く章は 2 桁の章番号にしない", () => {
    expect(peerStageShortLabels(["100章", "06章"])).toEqual(["1", "2"]);
  });
});

describe("stripSharedTitlePrefix", () => {
  it("共通する先頭の語を除く", () => {
    expect(
      stripSharedTitlePrefix(["開発ラボG 第1部 06章 クラス", "開発ラボG 第1部 07章 継承"]),
    ).toEqual(["06章 クラス", "07章 継承"]);
  });

  it("共通部分が無ければ題名のまま", () => {
    expect(stripSharedTitlePrefix(["A  B", "C D"])).toEqual(["A  B", "C D"]);
  });

  it("1 件のときは題名のまま", () => {
    expect(stripSharedTitlePrefix(["開発ラボG 第1部 06章 クラス"])).toEqual([
      "開発ラボG 第1部 06章 クラス",
    ]);
  });

  it("除くと空になる題名があるときは除かない", () => {
    expect(stripSharedTitlePrefix(["Intro", "Intro"])).toEqual(["Intro", "Intro"]);
    expect(stripSharedTitlePrefix(["開発ラボG 第1部", "開発ラボG 第1部 06章"])).toEqual([
      "第1部",
      "第1部 06章",
    ]);
  });
});

describe("吹き出し", () => {
  it("修了は割合の代わりに修了と読む", () => {
    expect(peerStageBubble(stage("06章 クラス", 100, true))).toBe("06章 クラス 修了");
    expect(peerStageBubble(stage("06章 クラス", 45))).toBe("06章 クラス 45%");
  });

  it("その先は題名を出さない", () => {
    expect(peerHiddenBubble(false)).toBe("まだ開いていないステージ");
    expect(peerHiddenBubble(true)).toBe("先に進んでいます");
  });
});
