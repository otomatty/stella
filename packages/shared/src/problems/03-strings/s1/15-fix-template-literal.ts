import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch03FixTemplateLiteral: Assignment = {
  id: "S1-Ch03-142-fix-template-literal",
  stage: "S1",
  chapterId: "Ch03",
  sequence: 15,
  title: "埋め込みが働かない文字列を直す",
  newConcept: "${ } が働くのはバッククォートで囲んだときだけ",
  estimatedMinutes: 6,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 意図した表示になりません。 エラーは出ません。 原因を確かめて直してください。

\`\`\`ts
const shopName = "青山コーヒー店";
console.log("ようこそ\${shopName}へ");
// 期待: ようこそ青山コーヒー店へ
\`\`\`

## 期待する出力

\`\`\`
ようこそ青山コーヒー店へ
\`\`\`

## ポイント

- \`\${ }\` が働くのはバッククォート \`\` \` \`\` で囲んだときだけです。 ダブルクォートの中では、 ただの文字として扱われます。
- エラーが出ないため、 画面を見るまで気づけない「静かなバグ」です。
- バッククォートはキーボードの左上あたり、 \`Shift\` + \`@\` の近くにあります (キーボードの配列によって位置は異なります)。
`,
  starterFiles: singleFile(
    `// エラーは出ませんが、 意図した表示になりません。 直してください
const shopName = "青山コーヒー店";
console.log("ようこそ\${shopName}へ");
`,
    "main.ts",
  ),
  tests: [
    {
      name: "店名が埋め込まれた 1 行が出力される",
      expectedStdout: "ようこそ青山コーヒー店へ",
    },
  ],
  hints: [
    "出力をよく見ると、 `${shopName}` がそのまま文字として出ています。",
    "囲んでいるクォートの種類を変えます。 ダブルクォートをバッククォートにします。",
    '解答例:\n```ts\nconst shopName = "青山コーヒー店";\nconsole.log(`ようこそ${shopName}へ`);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const shopName = "青山コーヒー店";
console.log(\`ようこそ\${shopName}へ\`);
`,
  badSolutions: [
    {
      code: `const shopName = "青山コーヒー店";
console.log("ようこそ\${shopName}へ");
`,
      description:
        "ダブルクォートのままなので ${shopName} が文字としてそのまま表示される",
    },
  ],
  mdnSections: [{ heading: "テンプレートリテラル" }, { heading: "文字列リテラル" }],
};
