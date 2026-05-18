import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch03CharAt: Assignment = {
  id: "S2-Ch03-12-charAt",
  stage: "S2",
  chapterId: "Ch03",
  sequence: 12,
  title: "charAt で 1 文字を取り出す",
  newConcept: "charAt は指定位置 (0 始まり) の 1 文字を返す",
  estimatedMinutes: 5,
  difficulty: 1,
  testKind: "stdout",
  description: `## やること

\`"JavaScript"\` の **5 文字目** (\`J\`, \`a\`, \`v\`, \`a\`, **\`S\`**) を \`charAt\` で取り出して出力してください。 添字は 0 始まりなので位置は \`4\`。

## 期待する出力

\`\`\`
S
\`\`\`

## ポイント

- \`"JavaScript".charAt(4)\` → \`"S"\`
- \`text[4]\` でもほぼ同じですが、 範囲外指定時の挙動が違います (\`charAt\` は空文字、 \`[i]\` は \`undefined\`)。
`,
  starterFiles: singleFile(`// 文字列を const の変数に入れる


// その変数に対して charAt で指定位置の 1 文字を取り出した結果を console.log で出力する

`),
  tests: [
    {
      name: "stdout が S になる",
      expectedStdout: "S",
    },
  ],
  hints: [
    "`text.charAt(4)` で 5 文字目 (添字 4) を取り出します。",
    "添字は 0 始まり: `J=0, a=1, v=2, a=3, S=4`。",
    "解答例:\n```js\nconst text = \"JavaScript\";\nconsole.log(text.charAt(4));\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "charAt", label: "charAt を使う" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const text = "JavaScript";
console.log(text.charAt(4));
`,
  badSolutions: [
    {
      code: `console.log("S");
`,
      description: "charAt を使わず結果を直接書いている",
    },
  ],
  mdnSections: [
    { heading: "String.prototype.charAt()", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/charAt", pageTitle: "String.prototype.charAt()" },
  ],
};
