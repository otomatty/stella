import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02ToFixed: Assignment = {
  id: "S2-Ch02-10-tofixed",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 10,
  title: "toFixed で小数桁数を固定する",
  newConcept: "toFixed(n) は小数点以下 n 桁の文字列を返す",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`1.2345\` を **小数点以下 2 桁** に丸めて出力してください。 \`(1.2345).toFixed(2)\` を使います。

## 期待する出力

\`\`\`
1.23
\`\`\`

## ポイント

- \`(値).toFixed(桁数)\` の形で呼び出します。
- 戻り値は **文字列** です (見た目は数値ですが、 加算したい場合は再度 \`Number()\` で変換します)。
`,
  starterFiles: singleFile(`// 説明文の小数を const の変数に入れる


// その変数に対して toFixed を呼んで小数第 2 位までに丸めた結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 1.23 になる",
      expectedStdout: "1.23",
    },
  ],
  hints: [
    "`value.toFixed(2)` の形で呼び出します。",
    "結果は `\"1.23\"` という **文字列**。 `console.log` はそのまま出力できます。",
    "解答例:\n```js\nconst value = 1.2345;\nconsole.log(value.toFixed(2));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "toFixed", label: "toFixed を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const value = 1.2345;
console.log(value.toFixed(2));
`,
  badSolutions: [
    {
      code: `console.log("1.23");
`,
      description: "toFixed を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Number.prototype.toFixed()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed", pageTitle: "Number.prototype.toFixed()" },
  ],
};
