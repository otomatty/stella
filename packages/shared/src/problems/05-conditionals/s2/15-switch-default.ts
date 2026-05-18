import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05SwitchDefault: Assignment = {
  id: "S2-Ch05-15-switch-default",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 15,
  title: "switch の default で予期しない値に備える",
  newConcept: "想定外の値には default で備える",
  estimatedMinutes: 8,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const role = "guest";\` を switch で判定し、 以下のメッセージを出力してください。

- \`"admin"\` → \`"管理者です"\`
- \`"user"\` → \`"一般ユーザーです"\`
- それ以外 → \`"権限がありません"\`

## 期待する出力

\`\`\`
権限がありません
\`\`\`

## ポイント

- いずれの \`case\` にも該当しないときは \`default:\` のブロックが実行されます。
- 全ケースに \`break;\` を入れます。
`,
  starterFiles: singleFile(`// 権限を表す文字列を const の変数に入れる


// switch でその変数を分岐し、 case でメッセージを console.log で出力する
// (どの case にも当てはまらない場合は default 節で処理する)

`),
  tests: [
    {
      name: "stdout が 権限がありません になる",
      expectedStdout: "権限がありません",
    },
  ],
  hints: [
    "switch の case に \"admin\" / \"user\" を書き、 default にそれ以外の処理を書きます。",
    "各ケースの最後に `break;` を忘れずに。",
    "解答例:\n```js\nconst role = \"guest\";\nswitch (role) {\n  case \"admin\":\n    console.log(\"管理者です\");\n    break;\n  case \"user\":\n    console.log(\"一般ユーザーです\");\n    break;\n  default:\n    console.log(\"権限がありません\");\n    break;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "SwitchStatement", label: "switch 文を使う" },
        { kind: "node", nodeType: "BreakStatement", label: "各 case の末尾に break を入れる" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `const role = "guest";
switch (role) {
  case "admin":
    console.log("管理者です");
    break;
  case "user":
    console.log("一般ユーザーです");
    break;
  default:
    console.log("権限がありません");
    break;
}
`,
  badSolutions: [
    {
      code: `console.log("権限がありません");
`,
      description: "switch を使わず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "switch", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/switch", pageTitle: "switch" },
  ],
};
