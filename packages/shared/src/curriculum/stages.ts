import type { StageInfo } from "../types.js";

export const stages: StageInfo[] = [
  {
    id: "S0",
    label: "S0 セットアップ",
    shortLabel: "はじめての一行",
    description: "エディタを開き、 console.log で結果を表示する最初の段階。",
    defaultTestKind: "stdout",
    estimatedMinutesRange: [3, 5],
    targetProblemCount: [6, 6],
  },
  {
    id: "S1",
    label: "S1 文法体験",
    shortLabel: "1 問 1 構文",
    description:
      "1 問につき 1 つの構文だけに絞って、 変数・数値・文字列・配列を一度ずつ体験する。",
    defaultTestKind: "stdout",
    estimatedMinutesRange: [5, 10],
    targetProblemCount: [60, 80],
  },
  {
    id: "S2",
    label: "S2 文法定着",
    shortLabel: "構文を組み合わせる",
    description:
      "既に習った構文を組み合わせ、 条件分岐・ループ・関数まで広げて使えるようにする。",
    defaultTestKind: "stdout",
    estimatedMinutesRange: [10, 15],
    targetProblemCount: [80, 100],
  },
  {
    id: "S3",
    label: "S3 ロジック入門",
    shortLabel: "関数を組み立てる",
    description:
      "関数を作って値を返す、 短いプログラムを自力で組み立てられるようにする。",
    defaultTestKind: "function",
    estimatedMinutesRange: [15, 25],
    targetProblemCount: [60, 80],
  },
  {
    id: "S4",
    label: "S4 アルゴリズム",
    shortLabel: "効率を意識する",
    description:
      "計算量やデータ構造を意識して、 複数の手順を組み合わせた処理を解く。",
    defaultTestKind: "function",
    estimatedMinutesRange: [25, 45],
    targetProblemCount: [40, 60],
  },
  {
    id: "S5",
    label: "S5 設計演習",
    shortLabel: "全体を設計する",
    description:
      "複数の概念を統合し、 少し大きな仕様を自分で分割して実装する。",
    defaultTestKind: "function",
    estimatedMinutesRange: [45, 90],
    targetProblemCount: [20, 40],
  },
];
