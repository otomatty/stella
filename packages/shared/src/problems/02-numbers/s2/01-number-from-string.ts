import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch02NumberFromString: Assignment = {
  id: "S2-Ch02-01-number-from-string",
  stage: "S2",
  chapterId: "Ch02",
  sequence: 1,
  title: "Number() で文字列を数値に変換する",
  newConcept: "文字列を数値に変換してから計算する",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

文字列 \`"42"\` を \`Number()\` で数値に変換し、 \`8\` を足した結果を出力してください。

\`\`\`js
const text = "42";
\`\`\`

## 期待する出力

\`\`\`
50
\`\`\`

## ポイント

- ユーザー入力など **文字列として届く数値** はそのままでは計算できません (\`"42" + 8\` は \`"428"\` という文字列連結になる)。
- \`Number(値)\` で数値に変換できます。
`,
  starterFiles: singleFile(`// 数字を表す文字列を const の変数に入れる


// その変数を Number() で数値に変換し、 別の const の変数に入れる


// 変換後の値に説明文の数値を + で足した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が 50 になる",
      expectedStdout: "50",
    },
  ],
  hints: [
    "`Number(\"42\")` で `42` (数値) になります。",
    "数値同士で足し算すると `+` は加算になります。",
    "解答例:\n```js\nconst text = \"42\";\nconst n = Number(text);\nconsole.log(n + 8);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "const-declaration", name: "text", label: "const text を宣言する" },
        { kind: "const-declaration", name: "n", label: "const n を宣言する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "number", value: 50 }, label: "答えを数値リテラルで直接書かない" },
      ],
    },
  },
  solution: `const text = "42";
const n = Number(text);
console.log(n + 8);
`,
  badSolutions: [
    {
      code: `console.log(50);
`,
      description: "Number() を使わず結果を直接書いている",
    },
    {
      code: `const text = "42";
console.log(text + 8);
`,
      description: "文字列のまま + を使い \"428\" になってしまう (= テスト fail)",
    },
  ],
  mdnSections: [
    { heading: "Number()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number/Number", pageTitle: "Number() コンストラクター" },
  ],
};
