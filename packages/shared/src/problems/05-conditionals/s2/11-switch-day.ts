import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch05SwitchDay: Assignment = {
  id: "S2-Ch05-11-switch-day",
  stage: "S2",
  chapterId: "Ch05",
  sequence: 11,
  title: "switch で曜日を判定する",
  newConcept: "switch は値の一致を一気に複数候補と比較できる",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  description: `## やること

\`const day = 3;\` のとき、 \`switch\` 文で曜日名を出力してください。

- \`0\`: \`"日"\`
- \`1\`: \`"月"\`
- \`2\`: \`"火"\`
- \`3\`: \`"水"\`
- \`4\`: \`"木"\`
- \`5\`: \`"金"\`
- \`6\`: \`"土"\`
- それ以外: \`"?"\`

## 期待する出力

\`\`\`
水
\`\`\`

## ポイント

- 各 \`case\` の最後に \`break;\` を付けないと **下に流れます (fallthrough)**。
- 該当しないときの **\`default:\`** を必ず書く習慣をつけます。
`,
  starterFiles: singleFile(`// 曜日番号の数値を const の変数に入れる


// switch でその変数を分岐し、 case ごとに対応する曜日名を console.log で出力する
// (各 case の最後に break を忘れない)

`),
  tests: [
    {
      name: "stdout が 水 になる",
      expectedStdout: "水",
    },
  ],
  hints: [
    "`switch (day) { case 3: console.log(\"水\"); break; default: ...; }` の形で書きます。",
    "全ケースを書いて `break;` を忘れないように。",
    "解答例:\n```js\nconst day = 3;\nswitch (day) {\n  case 0: console.log(\"日\"); break;\n  case 1: console.log(\"月\"); break;\n  case 2: console.log(\"火\"); break;\n  case 3: console.log(\"水\"); break;\n  case 4: console.log(\"木\"); break;\n  case 5: console.log(\"金\"); break;\n  case 6: console.log(\"土\"); break;\n  default: console.log(\"?\"); break;\n}\n```",
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
  solution: `const day = 3;
switch (day) {
  case 0: console.log("日"); break;
  case 1: console.log("月"); break;
  case 2: console.log("火"); break;
  case 3: console.log("水"); break;
  case 4: console.log("木"); break;
  case 5: console.log("金"); break;
  case 6: console.log("土"); break;
  default: console.log("?"); break;
}
`,
  badSolutions: [
    {
      code: `console.log("水");
`,
      description: "switch を使わず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "switch", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/switch", pageTitle: "switch" },
  ],
};
