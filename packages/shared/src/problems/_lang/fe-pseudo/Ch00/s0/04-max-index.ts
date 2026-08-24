import type { Assignment } from "../../../../../types.js";

/**
 * 1 起点の添字を「答えとして返す」課題 (#133)。
 * 値ではなく位置を返させることで、0 起点との差が採点結果に直接現れる。
 */
export const s0FePseudoCh00MaxIndex: Assignment = {
  id: "S0-FePseudo-Ch00-04-max-index",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 104,
  title: "擬似言語: 最大値の位置",
  newConcept: "位置 (添字) を答えとして返す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["最大値の位置"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* data の中で最も大きい値が入っている位置を返してください。
   位置は 1 から数えます。同じ値が複数あるときは、最も前の位置を返します。 */
○整数型: 最大値の位置(整数型の配列: data)
  /* ここに処理を書く */
  return 0
`,
    },
  ],
  description: `## やること

\`最大値の位置(data)\` を完成させてください。

- \`data\` の中で最も大きい値が入っている**位置**を返す
- **位置は 1 から数えます** (先頭の要素の位置は \`1\`)
- 同じ値が複数あるときは、最も前の位置を返す

## 例

\`\`\`text
data ← {3, 9, 2}     → 9 は 2 番目なので 2 を返す
data ← {5}           → 1 を返す
data ← {9, 1, 9}     → 前の方をとって 1 を返す
\`\`\`

> 返すのは**値ではなく位置**です。0 から数えてしまうと、すべてのテストが 1 ずれます。
`,
  tests: [
    { name: "2 番目が最大", code: "最大値の位置([3, 9, 2]) === 2" },
    { name: "1 要素なら 1", code: "最大値の位置([5]) === 1" },
    { name: "末尾が最大", code: "最大値の位置([1, 2, 3]) === 3" },
    { name: "同じ値なら前の位置", code: "最大値の位置([9, 1, 9]) === 1" },
    { name: "負の数だけ", code: "最大値の位置([-5, -2, -9]) === 2" },
  ],
  hints: [
    "「今までで最大の位置」を覚える変数を用意し、`1` で初期化します (例: `整数型: p ← 1`)。",
    "`for (i を 2 から dataの要素数 まで 1 ずつ増やす)` と 2 番目から比べていくと書きやすくなります。",
    "`if (data[i] > data[p])` が真のときだけ `p ← i` と更新します。`>` にすると同じ値では更新されず、前の位置が残ります。",
  ],
  solution: `○整数型: 最大値の位置(整数型の配列: data)
  整数型: p ← 1
  整数型: i
  for (i を 2 から dataの要素数 まで 1 ずつ増やす)
    if (data[i] > data[p])
      p ← i
    endif
  endfor
  return p
`,
};
