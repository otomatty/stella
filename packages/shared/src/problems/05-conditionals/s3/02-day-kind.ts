import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch05DayKind: Assignment = {
  id: "S3-Ch05-02-day-kind",
  stage: "S3",
  chapterId: "Ch05",
  sequence: 2,
  title: "曜日番号から 平日 / 休日 を返す",
  newConcept: "数値の集合判定で文字列を返す",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "function",
  description: `## やること

曜日番号 \`day\` (0=日, 1=月, ..., 6=土) を受け取り、 **土日 (0 または 6)** なら \`"休日"\`、 それ以外なら \`"平日"\` を返す関数 \`dayKind\` を実装してください。

\`\`\`js
dayKind(0);   // → "休日"   (日)
dayKind(1);   // → "平日"   (月)
dayKind(5);   // → "平日"   (金)
dayKind(6);   // → "休日"   (土)
\`\`\`

## ポイント

- 「0 か 6 ならば」 は \`day === 0 || day === 6\` で表現します。
- \`||\` (OR) で複数条件をまとめます。
`,
  starterFiles: singleFile(`function dayKind(day) {
  // ここを実装してください
}
`),
  entryPoints: ["dayKind"],
  demoCall: `console.log(dayKind(0));`,
  tests: [
    { name: 'dayKind(0) は "休日"', code: `dayKind(0) === "休日"` },
    { name: 'dayKind(1) は "平日"', code: `dayKind(1) === "平日"` },
    { name: 'dayKind(2) は "平日"', code: `dayKind(2) === "平日"` },
    { name: 'dayKind(5) は "平日"', code: `dayKind(5) === "平日"` },
    { name: 'dayKind(6) は "休日"', code: `dayKind(6) === "休日"` },
  ],
  hints: [
    "(day === 0 || day === 6) で土日判定。",
    "解答例:\n```js\nfunction dayKind(day) {\n  if (day === 0 || day === 6) return \"休日\";\n  return \"平日\";\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で文字列を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function dayKind(day) {
  if (day === 0 || day === 6) {
    return "休日";
  }
  return "平日";
}
`,
  badSolutions: [
    {
      code: `function dayKind(day) {
  return "平日";
}
`,
      description: "常に '平日' を返している",
    },
    {
      code: `function dayKind(day) {
  if (day === 0 && day === 6) return "休日";
  return "平日";
}
`,
      description: "&& で書いていて条件が常に false になる",
    },
  ],
  mdnSections: [
    {
      heading: "論理和 (||)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_OR",
      pageTitle: "論理和 (||)",
    },
  ],
};
