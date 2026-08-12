import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01FixStringToNumber: Assignment = {
  id: "S1-Ch01-122-fix-string-to-number",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 16,
  title: "number 型の変数に入れる値を直す",
  newConcept: "クォートで囲むと数値ではなく文字列になる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードには型に関する間違いが 1 か所あります。 エラーメッセージを手がかりに見つけて、 **型注釈は変えずに** 代入する値の側を直してください。

\`\`\`ts
const userName: string = "高橋";
let loginCount: number = "3";
console.log(userName);
console.log(loginCount);
console.log(loginCount + 1);
\`\`\`

最後の行は「次にログインしたら何回目になるか」を出しています。 値が数値として入っていれば \`4\` になりますが、 文字列のままだと \`31\` になります。 この行は消さずに残してください。

## 期待する出力

\`\`\`
高橋
3
4
\`\`\`

## ポイント

- \`"3"\` はダブルクォートで囲まれているため文字列 (\`string\` 型) です。 \`number\` 型の変数には入れられず、「Type 'string' is not assignable to type 'number'.」というエラーになります。
- エラーメッセージは、 前に出てくる型が「入れようとした型」、 後ろが「受け入れ側の型」です。
- クォートを外して数値の \`3\` にすれば解決します。
- \`console.log(loginCount)\` の表示だけでは、 文字列の \`"3"\` か数値の \`3\` か見分けが付きません。 \`+ 1\` してみると、 足し算になるか連結になるかで正体がわかります。
`,
  starterFiles: singleFile(
    `// 型注釈は変えずに、 代入する値の側を直してください
const userName: string = "高橋";
let loginCount: number = "3";
console.log(userName);
console.log(loginCount);
console.log(loginCount + 1);
`,
    "main.ts",
  ),
  tests: [
    {
      name: "名前・ログイン回数・次の回数が順に出力される",
      expectedStdout: "高橋\n3\n4",
    },
  ],
  hints: [
    "エラーが出ているのは 2 行目です。 `number` 型の変数に何を入れているか見てください。",
    "直すのは値の側です。 `: number` はそのまま残し、 `\"3\"` からクォートを外します。 最後の行が `31` のままなら、 まだ文字列です。",
    '解答例:\n```ts\nconst userName: string = "高橋";\nlet loginCount: number = 3;\nconsole.log(userName);\nconsole.log(loginCount);\nconsole.log(loginCount + 1);\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const userName: string = "高橋";
let loginCount: number = 3;
console.log(userName);
console.log(loginCount);
console.log(loginCount + 1);
`,
  badSolutions: [
    {
      code: `const userName: string = "高橋";
let loginCount: string = "3";
console.log(userName);
console.log(loginCount);
console.log(loginCount + 1);
`,
      description:
        "値ではなく型注釈のほうを string に変えて通してしまい、 最後の行が連結の 31 になる",
    },
  ],
  mdnSections: [{ heading: "データ型" }, { heading: "文字列リテラル" }],
};
