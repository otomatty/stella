import { describe, expect, it } from "vitest";

import {
  peerHiddenBubble,
  peerLegendTitles,
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

  it("並び順で最初の、修了でなく進んでいるステージを出す", () => {
    expect(peerNow(stages, true)).toEqual({
      kind: "progress",
      title: "07章 継承",
      percent: 45,
      compact: "07章 継承 · 45%",
    });
  });

  it("修了で割合が 100 のステージは受講中にしない", () => {
    expect(peerNow([stage("06章 クラス", 100, true)], false)).toEqual({
      kind: "cleared",
      title: "06章 クラス",
      label: "✓ 06章 クラスまで修了",
      compact: "✓ 06章 クラスまで修了",
    });
  });

  it("進んでいるステージが無く先に進んでいればその旨を出す", () => {
    expect(peerNow([stage("06章 クラス", 0)], true)).toEqual({
      kind: "ahead",
      label: "›› 先に進んでいます",
      compact: "›› 先に進んでいます",
    });
  });

  it("先に進んでいなければ、並び順で最後に修了したステージを出す", () => {
    expect(
      peerNow([stage("00章", 100, true), stage("01章", 0), stage("02章", 100, true)], false),
    ).toEqual({
      kind: "cleared",
      title: "02章",
      label: "✓ 02章まで修了",
      compact: "✓ 02章まで修了",
    });
  });

  it("どれも無ければまだ始めていない", () => {
    expect(peerNow([stage("06章 クラス", 0)], false)).toEqual({
      kind: "not-started",
      label: "まだ始めていません",
      compact: "まだ始めていません",
    });
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

describe("peerLegendTitles", () => {
  it("章番号のラベルのときは先頭の章番号と続く空白を除く", () => {
    expect(peerLegendTitles(["00章 環境の確認", "01章 はじめてのファイル"], ["00", "01"])).toEqual([
      "環境の確認",
      "はじめてのファイル",
    ]);
    expect(peerLegendTitles(["00章   環境の確認"], ["00"])).toEqual(["環境の確認"]);
  });

  it("並び順の番号のときは題名のまま", () => {
    expect(peerLegendTitles(["06章 クラス", "確認A"], ["1", "2"])).toEqual([
      "06章 クラス",
      "確認A",
    ]);
  });

  it("並び順の番号が題名の章番号と一致しても除かない", () => {
    expect(peerLegendTitles(["確認A", "10章 応用"], ["1", "10"])).toEqual(["確認A", "10章 応用"]);
  });

  it("章番号が先頭に無いときと、除くと空になるときは題名のまま", () => {
    expect(peerLegendTitles(["導入 00章 環境の確認"], ["00"])).toEqual(["導入 00章 環境の確認"]);
    expect(peerLegendTitles(["00章"], ["00"])).toEqual(["00章"]);
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
