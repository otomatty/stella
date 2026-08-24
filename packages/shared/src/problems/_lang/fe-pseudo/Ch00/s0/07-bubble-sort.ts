import type { Assignment } from "../../../../../types.js";

/**
 * バブルソートの課題 (#133)。
 * 戻り値ではなく引数の配列を書き換える (in-place) 形。科目B の整列問題と同じ形。
 */
export const s0FePseudoCh00BubbleSort: Assignment = {
  id: "S0-FePseudo-Ch00-07-bubble-sort",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 107,
  title: "擬似言語: バブルソート",
  newConcept: "隣どうしを比べて交換し、配列をその場で並べ替える",
  estimatedMinutes: 15,
  difficulty: 3,
  testKind: "function",
  language: "fe-pseudo",
  entryFile: "main.fe",
  entryPoints: ["バブルソート"],
  starterFiles: [
    {
      path: "main.fe",
      content: `/* data を昇順に並べ替えてください。
   新しい配列を作るのではなく、data そのものを書き換えます (戻り値はありません)。 */
○バブルソート(整数型の配列: data)
  /* ここに処理を書く */
`,
    },
  ],
  description: `## やること

\`バブルソート(data)\` を完成させてください。

- \`data\` を**昇順**に並べ替える
- **戻り値はありません**。\`data\` そのものを書き換えます (in-place)

## バブルソートの考え方

隣どうしを比べて、順序が逆なら交換します。これを繰り返すと、大きい値が末尾から順に確定していきます。

\`\`\`text
{5, 3, 8, 1}
 ↑  ↑          5 > 3 なので交換 → {3, 5, 8, 1}
    ↑  ↑       5 < 8 なのでそのまま
       ↑  ↑    8 > 1 なので交換 → {3, 5, 1, 8}   ← 末尾の 8 が確定
\`\`\`

## 値の交換

擬似言語には「2 つの変数を同時に入れ替える」書き方はありません。作業用の変数を経由します。

\`\`\`text
整数型: tmp
tmp ← data[j]
data[j] ← data[j + 1]
data[j + 1] ← tmp
\`\`\`

> 内側のループは、確定済みの末尾を除いて \`dataの要素数 - i\` まで回します。
`,
  tests: [
    { name: "ばらばらの配列", code: "(() => { const a = [5, 3, 8, 1]; バブルソート(a); return a.join(',') === '1,3,5,8'; })()" },
    { name: "すでに昇順", code: "(() => { const a = [1, 2, 3]; バブルソート(a); return a.join(',') === '1,2,3'; })()" },
    { name: "降順", code: "(() => { const a = [4, 3, 2, 1]; バブルソート(a); return a.join(',') === '1,2,3,4'; })()" },
    { name: "1 要素", code: "(() => { const a = [7]; バブルソート(a); return a.join(',') === '7'; })()" },
    { name: "同じ値を含む", code: "(() => { const a = [3, 1, 3, 2]; バブルソート(a); return a.join(',') === '1,2,3,3'; })()" },
    { name: "負の数を含む", code: "(() => { const a = [0, -5, 9, -1]; バブルソート(a); return a.join(',') === '-5,-1,0,9'; })()" },
  ],
  hints: [
    "外側のループは `for (i を 1 から dataの要素数 - 1 まで 1 ずつ増やす)` です。1 周ごとに末尾が 1 つ確定します。",
    "内側のループは `for (j を 1 から dataの要素数 - i まで 1 ずつ増やす)` として、`data[j]` と `data[j + 1]` を比べます。",
    "交換には作業用の変数が要ります。`tmp ← data[j]` → `data[j] ← data[j + 1]` → `data[j + 1] ← tmp` の順です。",
  ],
  commonMistakes: [
    { pattern: "data[j] ← data[j + 1]", message: "先に `tmp` へ退避しないと、元の `data[j]` の値が失われます。" },
  ],
  solution: `○バブルソート(整数型の配列: data)
  整数型: i, j, tmp
  for (i を 1 から dataの要素数 - 1 まで 1 ずつ増やす)
    for (j を 1 から dataの要素数 - i まで 1 ずつ増やす)
      if (data[j] > data[j + 1])
        tmp ← data[j]
        data[j] ← data[j + 1]
        data[j + 1] ← tmp
      endif
    endfor
  endfor
`,
};
