import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02NumberIsNaN: Assignment = {
  id: "S2-Ch02-09-number-isnan",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 9,
  title: "Number.isNaN で NaN を判定する",
  newConcept: "計算が破綻したときの NaN を検出する",
  estimatedMinutes: 6,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

文字列 \`"abc"\` を \`Number()\` で数値化すると \`NaN\` (Not a Number) になります。 これを \`Number.isNaN\` で判定し、 結果 (\`true\`) を出力してください。

## 期待する出力

\`\`\`
true
\`\`\`

## ポイント

- \`Number("abc")\` → \`NaN\`
- \`Number.isNaN(NaN)\` → \`true\`
- グローバルな \`isNaN(値)\` は罠が多いので、 **\`Number.isNaN\` を使う** のが現代の流儀です。
`,
  starterFiles: singleFile(`// 数字に変換できない文字列を Number() で変換した結果を、 const の変数に入れる


// その変数を Number.isNaN に渡した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が true になる",
      expectedStdout: "true",
    },
  ],
  hints: [
    "`Number(\"abc\")` を変数 `v` に入れます。 これは `NaN` です。",
    "`Number.isNaN(v)` で「v は NaN か?」 を `true`/`false` で得られます。",
    "解答例:\n```js\nconst v = Number(\"abc\");\nconsole.log(Number.isNaN(v));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "isNaN", label: "Number.isNaN を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const v = Number("abc");
console.log(Number.isNaN(v));
`,
  badSolutions: [
    {
      code: `console.log(true);
`,
      description: "Number.isNaN を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "Number.isNaN()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN", pageTitle: "Number.isNaN()" },
  ],
};
