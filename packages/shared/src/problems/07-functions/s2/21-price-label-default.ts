import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07PriceLabelDefault: Assignment = {
  id: "S2-Ch07-431-price-label-default",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 21,
  title: "デフォルト引数で割引率を省略できるようにする",
  newConcept: "既定値を書けば、 渡されなくても undefined にならない",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

価格と、 **任意の** 割引率を受け取る関数 \`getPriceLabel\` を作ってください。 割引率が省略されたときは \`0\` (割引なし) として扱います。 **デフォルト引数** を使ってください。

- 1 つ目の引数: 価格 (数値)
- 2 つ目の引数: 割引率 (数値・省略可・既定値は \`0\`)

返すのは「割引後の金額 + \`円\`」の文字列です。

\`\`\`ts
getPriceLabel(1000);      // → "1000円"
getPriceLabel(1000, 0.2); // → "800円"
\`\`\`

## 期待する挙動

- 割引率を渡さなければ、 価格がそのまま金額になります。
- 割引率を渡すと「価格 × (1 − 割引率)」の金額になります。
- どの場合も、 金額のうしろに \`円\` が付いた文字列を返します。

## ポイント

- デフォルト引数は \`(price: number, discount = 0)\` のように、 引数のうしろに \`= 既定値\` を書きます。
- 既定値から型が推論されるので、 割引率のほうは型注釈を省略できます。
- オプション引数 (\`discount?: number\`) で書くと、 渡されなかったときに \`undefined\` になるため、 使う前に毎回確認が必要になります。 既定値を入れたいだけならデフォルト引数のほうが素直です。
`,
  starterFiles: singleFile(
    `// 価格と割引率 (省略可・既定値 0) を受け取る関数 getPriceLabel を作る
// 割引後の金額に「円」を付けた文字列を return する

`,
    "main.ts",
  ),
  entryPoints: ["getPriceLabel"],
  demoCall: `console.log(getPriceLabel(1000), getPriceLabel(1000, 0.2));`,
  tests: [
    {
      name: "割引率を省略すると価格そのままになる",
      code: `getPriceLabel(1000) === "1000円"`,
    },
    {
      name: "割引率 0.2 なら 800円",
      code: `getPriceLabel(1000, 0.2) === "800円"`,
    },
    {
      name: "割引率 0.5 なら半額になる",
      code: `getPriceLabel(2000, 0.5) === "1000円"`,
    },
    {
      name: "価格 0 を省略呼び出しすると 0円",
      code: `getPriceLabel(0) === "0円"`,
    },
  ],
  hints: [
    "2 つ目の引数に `= 0` と書くと、 呼び出し側が渡さなかったときにその値が使われます。",
    "割引後の金額は「価格 × (1 − 割引率)」です。 割引率が 0 なら価格がそのまま残ります。",
    '解答例:\n```ts\nconst getPriceLabel = (price: number, discount = 0): string => {\n  const final = price * (1 - discount);\n  return `${final}円`;\n};\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const getPriceLabel = (price: number, discount = 0): string => {
  const final = price * (1 - discount);
  return \`\${final}円\`;
};
`,
  badSolutions: [
    {
      code: `const getPriceLabel = (price: number, discount?: number): string => {
  const final = price * (1 - discount);
  return \`\${final}円\`;
};
`,
      description:
        "既定値を書かずオプション引数にしたため、 省略して呼ぶと discount が undefined になり金額が NaN になる",
    },
  ],
  mdnSections: [{ heading: "デフォルト引数" }, { heading: "関数の引数" }],
};
