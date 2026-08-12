import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch09FilterHighPrices: Assignment = {
  id: "S2-Ch09-452-filter-high-prices",
  stage: "S2",
  chapterId: "Ch09",
  sequence: 2,
  title: "filter で条件に合う要素だけ取り出す",
  newConcept: "filter のコールバックは真偽値を返す",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

金額の配列を受け取り、 **1000 円以上** のものだけを取り出した新しい配列を返す関数 \`highPrices\` を作ってください。 \`filter\` を使ってください。

\`\`\`ts
highPrices([1200, 800, 1500, 400]);
// → [1200, 1500]
\`\`\`

## 期待する挙動

- 条件に合った要素だけが、 元の並び順のまま残ります。
- ちょうど 1000 円のものは **残ります** (「以上」なので)。
- 1 件も条件に合わなければ、 空の配列を返します。

## ポイント

- \`filter\` のコールバックは \`boolean\` を返します。 \`true\` を返した要素だけが残ります。
- 比較演算子の結果はそのまま \`true\` / \`false\` になるので、 条件式をそのまま返せます。
- 返るのは **残った要素の配列** です。 真偽値の配列にはなりません。 真偽値の配列を作ってしまうのは \`map\` を使ったときです。
`,
  starterFiles: singleFile(
    `// 数値の配列を受け取り、 1000 以上の要素だけを取り出した新しい配列を返す関数 highPrices を作る
// filter を使うこと

`,
    "main.ts",
  ),
  entryPoints: ["highPrices"],
  demoCall: `console.log(highPrices([1200, 800, 1500, 400]));`,
  tests: [
    {
      name: "1000 円以上だけが残る",
      code: `JSON.stringify(highPrices([1200, 800, 1500, 400])) === "[1200,1500]"`,
    },
    {
      name: "ちょうど 1000 円は残る",
      code: `JSON.stringify(highPrices([999, 1000, 1001])) === "[1000,1001]"`,
    },
    {
      name: "1 件も合わなければ空の配列",
      code: `(() => { const r = highPrices([100, 200]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "元の配列は変更されない",
      code: `(() => { const src = [1200, 800]; highPrices(src); return JSON.stringify(src) === "[1200,800]"; })()`,
    },
  ],
  hints: [
    "配列に対してドットで `filter` を呼び、 かっこの中に「残すかどうか」を判定する関数を渡します。",
    "判定は比較演算子 1 つで書けます。 その結果をそのまま返せば、 `true` の要素だけが残ります。",
    "解答例:\n```ts\nconst highPrices = (prices: number[]): number[] => {\n  return prices.filter((price) => price >= 1000);\n};\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "filter", label: "filter を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const highPrices = (prices: number[]): number[] => {
  return prices.filter((price) => price >= 1000);
};
`,
  badSolutions: [
    {
      code: `const highPrices = (prices: number[]) => {
  return prices.map((price) => price >= 1000);
};
`,
      description:
        "filter ではなく map を使ったため、 残った金額ではなく true / false の配列が返る",
    },
  ],
  mdnSections: [{ heading: "反復処理メソッド" }, { heading: "インスタンスメソッド" }],
};
