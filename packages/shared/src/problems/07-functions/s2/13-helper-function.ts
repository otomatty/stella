import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07HelperFunction: Assignment = {
  id: "S2-Ch07-13-helper-function",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 13,
  title: "ヘルパー関数で重複処理をまとめる",
  newConcept: "繰り返す処理を関数として切り出す",
  estimatedMinutes: 9,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

ヘルパー関数 \`function tax(price)\` を作り、 \`Math.round(price * 1.1)\` (税込価格を四捨五入) を返します。 その関数を使って 2 つの商品 \`100\` 円と \`250\` 円の **税込価格** を出力してください。

## 期待する出力

\`\`\`
110
275
\`\`\`

## ポイント

- 同じ計算式を何度も書くより、 関数にしておくと **変更に強い**。
- 例えば消費税率が変わったときに関数の中だけ直せば済みます。
- 小数の浮動小数点誤差を避けるため \`Math.round\` で丸めます。
`,
  starterFiles: singleFile(`// 引数の価格を 1.1 倍して Math.round で四捨五入した結果を return する function 文の関数を宣言する


// 関数に説明文の 1 つ目の値を渡して呼び出した結果を console.log で出力する


// 関数に説明文の 2 つ目の値を渡して呼び出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 110/275 の 2 行になる",
      expectedStdout: "110\n275",
    },
  ],
  hints: [
    "`function tax(price) { return Math.round(price * 1.1); }` で関数を作ります。",
    "それを 2 回呼んで結果を 1 行ずつ出力します。",
    "解答例:\n```js\nfunction tax(price) {\n  return Math.round(price * 1.1);\n}\nconsole.log(tax(100));\nconsole.log(tax(250));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function tax(price) {
  return Math.round(price * 1.1);
}
console.log(tax(100));
console.log(tax(250));
`,
  badSolutions: [
    {
      code: `console.log(110);
console.log(275);
`,
      description: "関数を作らず数値を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
  ],
};
