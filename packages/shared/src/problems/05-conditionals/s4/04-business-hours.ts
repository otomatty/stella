import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch05BusinessHours: Assignment = {
  id: "S4-Ch05-04-business-hours",
  stage: "S4",
  chapterId: "Ch05",
  sequence: 4,
  title: "曜日と時刻から営業中か判定する",
  newConcept: "&& と || を組み合わせた複合条件と短絡評価",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

\`day\` (0=日, 1=月, ..., 6=土) と \`hour\` (0-23 の整数) を受け取り、 店が **営業中なら \`true\`**、 そうでなければ \`false\` を返す関数 \`isOpen\` を実装してください。

### 営業時間

- **平日 (月-金、 day が 1-5)**: 9 時から 21 時 (9 ≤ hour < 21)
- **土曜 (day === 6)**: 10 時から 16 時 (10 ≤ hour < 16)
- **日曜 (day === 0)**: 終日 **休業**

### 入力検証

- \`day\` が 0-6 の整数でない場合は \`false\`
- \`hour\` が 0-23 の整数でない場合は \`false\`

\`\`\`js
isOpen(1, 9);    // → true   (月 9 時、 オープン直後)
isOpen(1, 20);   // → true   (月 20 時)
isOpen(1, 21);   // → false  (月 21 時、 クローズ後)
isOpen(1, 8);    // → false  (月 8 時、 オープン前)
isOpen(6, 10);   // → true   (土 10 時)
isOpen(6, 16);   // → false  (土 16 時、 クローズ後)
isOpen(0, 12);   // → false  (日曜は終日休業)
isOpen(7, 12);   // → false  (day が範囲外)
isOpen(1, 24);   // → false  (hour が範囲外)
\`\`\`

## ポイント

- まず **入力検証** で範囲外を弾き、 その後で **曜日ごとの営業時間** を判定すると整理しやすいです。
- 平日判定は \`day >= 1 && day <= 5\` のように **&& で範囲を合成** します。 短絡評価により左が偽なら右は評価されません。
- 「営業中の条件を式 1 つにまとめて return する」 形でも、 「曜日ごとに早期 return する」 形でも書けます。 どちらでも読みやすければ OK です。
`,
  starterFiles: singleFile(`function isOpen(day, hour) {
  // 1. 入力検証 (day, hour が範囲外なら false)
  // 2. 曜日ごとに営業時間を判定して true / false を返す
}
`),
  entryPoints: ["isOpen"],
  demoCall: `console.log(isOpen(1, 12));`,
  tests: [
    { name: "月 9 時はオープン", code: `isOpen(1, 9) === true` },
    { name: "月 20 時はオープン", code: `isOpen(1, 20) === true` },
    { name: "月 21 時はクローズ", code: `isOpen(1, 21) === false` },
    { name: "月 8 時はクローズ", code: `isOpen(1, 8) === false` },
    { name: "金 12 時はオープン", code: `isOpen(5, 12) === true` },
    { name: "土 10 時はオープン", code: `isOpen(6, 10) === true` },
    { name: "土 15 時はオープン", code: `isOpen(6, 15) === true` },
    { name: "土 16 時はクローズ", code: `isOpen(6, 16) === false` },
    { name: "土 9 時はクローズ", code: `isOpen(6, 9) === false` },
    { name: "日 12 時は終日休業", code: `isOpen(0, 12) === false` },
    { name: "日 10 時も休業", code: `isOpen(0, 10) === false` },
    { name: "day=7 は範囲外", code: `isOpen(7, 12) === false` },
    { name: "day=-1 は範囲外", code: `isOpen(-1, 12) === false` },
    { name: "hour=24 は範囲外", code: `isOpen(1, 24) === false` },
    { name: "hour=-1 は範囲外", code: `isOpen(1, -1) === false` },
    { name: "day が小数は範囲外", code: `isOpen(1.5, 12) === false` },
    { name: "hour が小数は範囲外", code: `isOpen(1, 12.5) === false` },
  ],
  hints: [
    "入力検証は Number.isInteger と範囲チェックを && で連結する。",
    "平日判定は (day >= 1 && day <= 5)、 営業時間判定は (hour >= 9 && hour < 21) のように && で範囲を合成。",
    "解答例:\n```js\nfunction isOpen(day, hour) {\n  if (!Number.isInteger(day) || day < 0 || day > 6) {\n    return false;\n  }\n  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {\n    return false;\n  }\n  if (day === 0) {\n    return false;\n  }\n  if (day === 6) {\n    return hour >= 10 && hour < 16;\n  }\n  return hour >= 9 && hour < 21;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
        { kind: "node", nodeType: "LogicalExpression", label: "&& または || で条件を合成する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isOpen(day, hour) {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    return false;
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return false;
  }
  if (day === 0) {
    return false;
  }
  if (day === 6) {
    return hour >= 10 && hour < 16;
  }
  return hour >= 9 && hour < 21;
}
`,
  badSolutions: [
    {
      code: `function isOpen(day, hour) {
  if (day === 0) return false;
  if (day === 6) return hour >= 10 && hour <= 16;
  return hour >= 9 && hour <= 21;
}
`,
      description: "クローズ時刻に <= を使っており、 21 時 / 16 時ちょうどに営業中扱いになる。 入力検証も無い (テスト失敗)",
    },
    {
      code: `function isOpen(day, hour) {
  if (!Number.isInteger(day) || day < 0 || day > 6) return false;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return false;
  return hour >= 9 && hour < 21;
}
`,
      description: "曜日に関係なく平日扱いになっており、 土日の判定が抜けている (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "論理積 (&&)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Logical_AND",
      pageTitle: "論理積 (&&)",
    },
    {
      heading: "短絡評価",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators",
      pageTitle: "演算子",
    },
  ],
};
