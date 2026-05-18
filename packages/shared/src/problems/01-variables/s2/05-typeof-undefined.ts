import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01TypeofUndefined: Assignment = {
  id: "S2-Ch01-05-typeof-undefined",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 5,
  title: "未代入の let は undefined になる",
  newConcept: "let で宣言だけして値を代入しないと undefined",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`let value;\` のように **初期値を与えずに let で宣言** すると、 中身は \`undefined\` になります。 これを \`typeof\` で確認してください。

\`console.log(typeof value);\` を実行して \`"undefined"\` を出力します。

## 期待する出力

\`\`\`
undefined
\`\`\`

## ポイント

- \`undefined\` は「まだ値が入っていない」 という意味の特別な値です。
- 後で代入するつもりの変数を **先に名前だけ用意** したいときに \`let value;\` のように書きます。
`,
  starterFiles: singleFile(`// let で変数を宣言する (初期値は入れない)


// その変数の型を typeof 演算子で取り出し、 console.log で出力する

`),
  tests: [
    {
      name: "stdout が undefined になる",
      expectedStdout: "undefined",
    },
  ],
  hints: [
    "`let value;` のように **初期値なし** で宣言すると、 中身は `undefined` です。",
    "`typeof undefined` は文字列 `\"undefined\"` を返します (値そのものと型名が同じ綴り)。",
    "解答例:\n```js\nlet value;\nconsole.log(typeof value);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [
        { kind: "var", label: "var を使わない" },
        {
          kind: "console-log",
          argument: { kind: "string", value: "undefined" },
          label: "答えを文字列リテラルで直接書かない",
        },
        {
          kind: "console-log",
          argument: { kind: "identifier", name: "undefined" },
          label: "undefined を直接渡さない (typeof で確認する)",
        },
        {
          kind: "console-log",
          argument: { kind: "binary", operator: "+" },
          label: "文字列連結で答えを組み立てない",
        },
      ],
    },
  },
  solution: `let value;
console.log(typeof value);
`,
  badSolutions: [
    {
      code: `console.log("undefined");
`,
      description: "typeof を使わずに答えを直接出力している",
    },
  ],
  mdnSections: [
    { heading: "undefined", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/undefined", pageTitle: "undefined" },
  ],
};
