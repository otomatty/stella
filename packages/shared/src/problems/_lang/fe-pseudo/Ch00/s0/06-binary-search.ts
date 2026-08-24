import type { Assignment } from "../../../../../types.js";

/**
 * 二分探索の課題 (#133)。
 * `÷` が整数どうしでは商 (切り捨て) になることを、中央の添字の計算で体感させる。
 */
export const s0FePseudoCh00BinarySearch: Assignment = {
  id: "S0-FePseudo-Ch00-06-binary-search",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 106,
  title: "擬似言語: 二分探索",
  newConcept: "整数の除算 (÷) で中央を求めて探索範囲を半分にする",
  estimatedMinutes: 15,
  difficulty: 3,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["二分探索"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* 昇順に並んだ data から target を二分探索し、
   見つかった位置 (1 から数える) を返してください。
   見つからなければ -1 を返します。 */
○整数型: 二分探索(整数型の配列: data, 整数型: target)
  /* ここに処理を書く */
  return -1
`,
    },
  ],
  description: `## やること

\`二分探索(data, target)\` を完成させてください。\`data\` は**昇順に並んでいます**。

- 探索範囲の**中央**と \`target\` を比べ、範囲を半分ずつ狭める
- 見つかった**位置** (1 から数える) を返す
- 見つからなければ \`-1\` を返す

## 擬似言語の除算

**整数どうしの \`÷\` は商 (小数点以下を切り捨てた値) になります。**

\`\`\`text
7 ÷ 2     → 3     (3.5 ではない)
(1 + 5) ÷ 2 → 3
\`\`\`

中央の位置はこれを使って求めます。

\`\`\`text
mid ← (low + high) ÷ 2
\`\`\`

> \`÷\` は \`/\` と書いても同じです。

## 例

\`\`\`text
data ← {8, 11, 24, 35, 42}
二分探索(data, 35)   → 4
二分探索(data, 8)    → 1
二分探索(data, 20)   → -1
\`\`\`
`,
  tests: [
    { name: "中央より後ろ", code: "二分探索([8, 11, 24, 35, 42], 35) === 4" },
    { name: "先頭", code: "二分探索([8, 11, 24, 35, 42], 8) === 1" },
    { name: "末尾", code: "二分探索([8, 11, 24, 35, 42], 42) === 5" },
    { name: "中央", code: "二分探索([8, 11, 24, 35, 42], 24) === 3" },
    { name: "見つからない (範囲内)", code: "二分探索([8, 11, 24, 35, 42], 20) === -1" },
    { name: "見つからない (範囲外)", code: "二分探索([8, 11, 24, 35, 42], 99) === -1" },
    { name: "1 要素", code: "二分探索([5], 5) === 1" },
    { name: "偶数個でも正しい", code: "二分探索([2, 4, 6, 8], 8) === 4" },
  ],
  hints: [
    "探索範囲の下端と上端を覚える変数を用意します (`整数型: low ← 1`、`整数型: high ← dataの要素数`)。",
    "`while (low ≦ high)` の中で `mid ← (low + high) ÷ 2` と中央を求め、`data[mid]` と `target` を比べます。",
    "`data[mid] < target` なら下半分は不要なので `low ← mid + 1`、そうでなければ `high ← mid - 1` にします。ループを抜けたら `-1` を返します。",
  ],
  commonMistakes: [
    { pattern: "low ← mid", message: "`low ← mid` にすると範囲が狭まらず終わりません。`low ← mid + 1` とします。" },
  ],
  solution: `○整数型: 二分探索(整数型の配列: data, 整数型: target)
  整数型: low ← 1
  整数型: high ← dataの要素数
  整数型: mid
  while (low ≦ high)
    mid ← (low + high) ÷ 2
    if (data[mid] = target)
      return mid
    elseif (data[mid] < target)
      low ← mid + 1
    else
      high ← mid - 1
    endif
  endwhile
  return -1
`,
};
