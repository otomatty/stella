import type { Assignment } from "../../../../../types.js";

/**
 * 線形探索の課題 (#133)。
 * レッスン 2-1 でトレースした手順を、そのまま擬似言語で書き下す。
 */
export const s0FePseudoCh00LinearSearch: Assignment = {
  id: "S0-FePseudo-Ch00-05-linear-search",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 105,
  title: "擬似言語: 線形探索",
  newConcept: "見つかった位置を返し、見つからなければ -1 を返す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["線形探索"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* data の先頭から順に target を探し、見つかった位置 (1 から数える) を返してください。
   最後まで見つからなければ -1 を返します。 */
○整数型: 線形探索(整数型の配列: data, 整数型: target)
  /* ここに処理を書く */
  return -1
`,
    },
  ],
  description: `## やること

\`線形探索(data, target)\` を完成させてください。

- \`data\` を**先頭から順に**見て、\`target\` と等しい要素の**位置**を返す
- 位置は 1 から数える
- 最後まで見つからなければ \`-1\` を返す

## 例

\`\`\`text
data ← {24, 11, 35, 8, 42}
線形探索(data, 8)    → 4
線形探索(data, 24)   → 1
線形探索(data, 99)   → -1
\`\`\`

レッスン 2-1 で紙の上にトレースした手順を、そのまま擬似言語で書き下すだけです。

> 等しいかの比較は \`=\` です (\`==\` と書いても通ります)。
`,
  tests: [
    { name: "途中で見つかる", code: "線形探索([24, 11, 35, 8, 42], 8) === 4" },
    { name: "先頭で見つかる", code: "線形探索([24, 11, 35, 8, 42], 24) === 1" },
    { name: "末尾で見つかる", code: "線形探索([24, 11, 35, 8, 42], 42) === 5" },
    { name: "見つからなければ -1", code: "線形探索([24, 11, 35, 8, 42], 99) === -1" },
    { name: "同じ値があれば前の位置", code: "線形探索([7, 7, 7], 7) === 1" },
  ],
  hints: [
    "`for (i を 1 から dataの要素数 まで 1 ずつ増やす)` で先頭から順に見ます。",
    "`if (data[i] = target)` が真になったら、その場で `return i` します。",
    "ループを抜けたということは見つからなかったということなので、最後に `return -1` を書きます。",
  ],
  solution: `○整数型: 線形探索(整数型の配列: data, 整数型: target)
  整数型: i
  for (i を 1 から dataの要素数 まで 1 ずつ増やす)
    if (data[i] = target)
      return i
    endif
  endfor
  return -1
`,
};
