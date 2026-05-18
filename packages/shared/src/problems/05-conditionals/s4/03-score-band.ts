import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch05ScoreBand: Assignment = {
  id: "S4-Ch05-03-score-band",
  stage: "S4",
  chapterId: "Ch05",
  sequence: 3,
  title: "2 科目の平均からスコア帯を判定する",
  newConcept: "範囲判定 (スコア帯) と異常値ガードを 1 つの関数に組み合わせる",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

数学のスコア \`math\` と 英語のスコア \`english\` を受け取り、 評価バンド (\`"S"\` / \`"A"\` / \`"B"\` / \`"C"\` / \`"D"\` / \`"F"\` / \`"Invalid"\`) を返す関数 \`scoreBand\` を実装してください。

### 入力検証

\`math\` と \`english\` は **0 以上 100 以下の整数** でなければなりません。 どちらかが整数でない、 または範囲外なら \`"Invalid"\` を返します。

### バンド判定

入力が正常なら、 平均 \`avg = (math + english) / 2\` を計算し、 以下の範囲に応じてバンドを返します。

| 平均 | バンド |
|---|---|
| 90 以上 | \`"S"\` |
| 80 以上 90 未満 | \`"A"\` |
| 70 以上 80 未満 | \`"B"\` |
| 60 以上 70 未満 | \`"C"\` |
| 50 以上 60 未満 | \`"D"\` |
| 50 未満 | \`"F"\` |

\`\`\`js
scoreBand(95, 95);   // → "S"   (avg 95)
scoreBand(80, 80);   // → "A"   (avg 80)
scoreBand(70, 80);   // → "B"   (avg 75)
scoreBand(50, 50);   // → "D"   (avg 50)
scoreBand(49, 49);   // → "F"   (avg 49)
scoreBand(-1, 80);   // → "Invalid"
scoreBand(80, 101);  // → "Invalid"
scoreBand(80.5, 80); // → "Invalid"  (整数のみ)
\`\`\`

## ポイント

- まず **ガード節で異常値を弾き**、 そのあと **平均値の範囲判定** を上から else if (またはガード節) で並べると読みやすいです。
- 境界は \`>=\` で書きます。 \`(avg >= 90)\` の順に書いていけば、 上の条件が偽だったときは「89 以下」 が確定するので二重にチェックする必要はありません。
- 「整数か」 は \`Number.isInteger\` で判定します。 \`typeof x === "number"\` だけだと小数や \`NaN\` も通ってしまいます。
`,
  starterFiles: singleFile(`function scoreBand(math, english) {
  // 1. 異常値 (整数でない / 範囲外) なら "Invalid"
  // 2. avg = (math + english) / 2 の範囲で S / A / B / C / D / F を返す
}
`),
  entryPoints: ["scoreBand"],
  demoCall: `console.log(scoreBand(85, 75));`,
  tests: [
    { name: "avg 95 は S", code: `scoreBand(95, 95) === "S"` },
    { name: "avg 90 ちょうどは S (境界)", code: `scoreBand(90, 90) === "S"` },
    { name: "avg 89 は A", code: `scoreBand(89, 89) === "A"` },
    { name: "avg 80 ちょうどは A (境界)", code: `scoreBand(80, 80) === "A"` },
    { name: "avg 75 は B", code: `scoreBand(70, 80) === "B"` },
    { name: "avg 70 ちょうどは B (境界)", code: `scoreBand(70, 70) === "B"` },
    { name: "avg 65 は C", code: `scoreBand(60, 70) === "C"` },
    { name: "avg 60 ちょうどは C (境界)", code: `scoreBand(60, 60) === "C"` },
    { name: "avg 50 ちょうどは D (境界)", code: `scoreBand(50, 50) === "D"` },
    { name: "avg 49 は F", code: `scoreBand(49, 49) === "F"` },
    { name: "avg 0 は F", code: `scoreBand(0, 0) === "F"` },
    { name: "avg 89.5 は A (S にしない)", code: `scoreBand(89, 90) === "A"` },
    { name: "avg 79.5 は B (A にしない)", code: `scoreBand(79, 80) === "B"` },
    { name: "avg 90.5 は S (90 ちょうどではない)", code: `scoreBand(90, 91) === "S"` },
    { name: "負数は Invalid", code: `scoreBand(-1, 80) === "Invalid"` },
    { name: "english が 101 は Invalid", code: `scoreBand(80, 101) === "Invalid"` },
    { name: "math が 101 は Invalid", code: `scoreBand(101, 80) === "Invalid"` },
    { name: "小数は Invalid", code: `scoreBand(80.5, 80) === "Invalid"` },
    { name: "NaN は Invalid", code: `scoreBand(NaN, 80) === "Invalid"` },
    { name: "english が小数は Invalid", code: `scoreBand(80, 80.5) === "Invalid"` },
    { name: "english が NaN は Invalid", code: `scoreBand(80, NaN) === "Invalid"` },
    { name: "math だけでも片方が異常なら Invalid", code: `scoreBand(50, -5) === "Invalid"` },
  ],
  hints: [
    "最初にガード節で異常値を全部 \"Invalid\" として弾く。 そのあと avg を計算して >= で上から判定。",
    "Number.isInteger(x) && x >= 0 && x <= 100 を 2 つ並べる。 1 つでも崩れたら \"Invalid\"。",
    "解答例:\n```js\nfunction scoreBand(math, english) {\n  const valid = (n) => Number.isInteger(n) && n >= 0 && n <= 100;\n  if (!valid(math) || !valid(english)) {\n    return \"Invalid\";\n  }\n  const avg = (math + english) / 2;\n  if (avg >= 90) return \"S\";\n  if (avg >= 80) return \"A\";\n  if (avg >= 70) return \"B\";\n  if (avg >= 60) return \"C\";\n  if (avg >= 50) return \"D\";\n  return \"F\";\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でバンド文字列を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if 文で範囲を分岐する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function scoreBand(math, english) {
  const valid = (n) => Number.isInteger(n) && n >= 0 && n <= 100;
  if (!valid(math) || !valid(english)) {
    return "Invalid";
  }
  const avg = (math + english) / 2;
  if (avg >= 90) {
    return "S";
  }
  if (avg >= 80) {
    return "A";
  }
  if (avg >= 70) {
    return "B";
  }
  if (avg >= 60) {
    return "C";
  }
  if (avg >= 50) {
    return "D";
  }
  return "F";
}
`,
  badSolutions: [
    {
      code: `function scoreBand(math, english) {
  const avg = (math + english) / 2;
  if (avg >= 90) return "S";
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
}
`,
      description: "入力検証を省略しており、 負数や 101 でも判定してしまう (テスト失敗)",
    },
    {
      code: `function scoreBand(math, english) {
  if (math < 0 || math > 100 || english < 0 || english > 100) {
    return "Invalid";
  }
  const avg = (math + english) / 2;
  if (avg > 90) return "S";
  if (avg > 80) return "A";
  if (avg > 70) return "B";
  if (avg > 60) return "C";
  if (avg > 50) return "D";
  return "F";
}
`,
      description: "境界の比較が >= ではなく > なので、 90 や 80 ちょうどのときに 1 ランク下になる (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "比較演算子",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators",
      pageTitle: "演算子",
    },
    {
      heading: "Number.isInteger",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger",
      pageTitle: "Number.isInteger",
    },
  ],
};
