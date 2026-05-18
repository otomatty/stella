import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch05OrderStatusTransition: Assignment = {
  id: "S4-Ch05-01-order-status-transition",
  stage: "S4",
  chapterId: "Ch05",
  sequence: 1,
  title: "switch で注文ステータスの遷移を判定する",
  newConcept: "switch で状態 (state) ごとに許可される遷移を整理する",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

注文の **現在のステータス** \`current\` と **操作** \`action\` を受け取り、 遷移先のステータス文字列を返す関数 \`nextOrderStatus\` を実装してください。 遷移が定義されていない組み合わせの場合は **\`current\` をそのまま返します** (状態は変わらない)。

ステータスは次の 5 種類です。

- \`"pending"\` (未支払い)
- \`"paid"\` (支払い済み)
- \`"shipped"\` (発送済み)
- \`"delivered"\` (配達完了)
- \`"cancelled"\` (キャンセル済み)

遷移ルールは以下の通りです。

| current | action | 遷移先 |
|---|---|---|
| \`"pending"\` | \`"pay"\` | \`"paid"\` |
| \`"pending"\` | \`"cancel"\` | \`"cancelled"\` |
| \`"paid"\` | \`"ship"\` | \`"shipped"\` |
| \`"paid"\` | \`"cancel"\` | \`"cancelled"\` |
| \`"shipped"\` | \`"deliver"\` | \`"delivered"\` |
| 上記以外 | — | \`current\` のまま (変化なし) |

\`\`\`js
nextOrderStatus("pending", "pay");        // → "paid"
nextOrderStatus("paid", "ship");          // → "shipped"
nextOrderStatus("shipped", "deliver");    // → "delivered"
nextOrderStatus("delivered", "cancel");   // → "delivered"  (配達後はキャンセル不可)
nextOrderStatus("cancelled", "pay");      // → "cancelled"  (キャンセル後は何もできない)
nextOrderStatus("pending", "deliver");    // → "pending"    (未支払いから配達はできない)
\`\`\`

## ポイント

- 各 **状態** \`current\` ごとに「どの \`action\` を受け入れるか」 が決まります。 これは **switch で状態を分け、 中で if を 1-2 個書く** とすっきり整理できます。
- 「許可されない操作はすべて現状維持」 という方針なので、 **\`default\` と各 case の末尾で \`return current\`** にすれば自然に書けます。
- AST で **\`SwitchStatement\` の使用** を必須にしているので、 if/else if の連鎖だけで書く実装は通りません。
`,
  starterFiles: singleFile(`function nextOrderStatus(current, action) {
  // switch (current) で状態ごとに分岐し、 action に応じた遷移先を返してください
  // 該当しない組み合わせは current をそのまま返してください
}
`),
  entryPoints: ["nextOrderStatus"],
  demoCall: `console.log(nextOrderStatus("pending", "pay"));`,
  tests: [
    {
      name: "pending + pay → paid",
      code: `nextOrderStatus("pending", "pay") === "paid"`,
    },
    {
      name: "pending + cancel → cancelled",
      code: `nextOrderStatus("pending", "cancel") === "cancelled"`,
    },
    {
      name: "paid + ship → shipped",
      code: `nextOrderStatus("paid", "ship") === "shipped"`,
    },
    {
      name: "paid + cancel → cancelled",
      code: `nextOrderStatus("paid", "cancel") === "cancelled"`,
    },
    {
      name: "shipped + deliver → delivered",
      code: `nextOrderStatus("shipped", "deliver") === "delivered"`,
    },
    {
      name: "delivered からの遷移は無視される",
      code: `nextOrderStatus("delivered", "cancel") === "delivered"`,
    },
    {
      name: "cancelled からの遷移は無視される",
      code: `nextOrderStatus("cancelled", "pay") === "cancelled"`,
    },
    {
      name: "pending から deliver は不可 (current のまま)",
      code: `nextOrderStatus("pending", "deliver") === "pending"`,
    },
    {
      name: "shipped から ship を再実行しても current のまま",
      code: `nextOrderStatus("shipped", "ship") === "shipped"`,
    },
    {
      name: "未知の action は無視される",
      code: `nextOrderStatus("paid", "unknown") === "paid"`,
    },
  ],
  hints: [
    "switch (current) で状態を分け、 case の中で if (action === ...) return ...; を書く。",
    "default と各 case の末尾は return current; で「変化なし」 を表す。",
    "解答例:\n```js\nfunction nextOrderStatus(current, action) {\n  switch (current) {\n    case \"pending\":\n      if (action === \"pay\") return \"paid\";\n      if (action === \"cancel\") return \"cancelled\";\n      return current;\n    case \"paid\":\n      if (action === \"ship\") return \"shipped\";\n      if (action === \"cancel\") return \"cancelled\";\n      return current;\n    case \"shipped\":\n      if (action === \"deliver\") return \"delivered\";\n      return current;\n    default:\n      return current;\n  }\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "SwitchStatement", label: "switch 文で状態を分ける" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で遷移先を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function nextOrderStatus(current, action) {
  switch (current) {
    case "pending":
      if (action === "pay") {
        return "paid";
      }
      if (action === "cancel") {
        return "cancelled";
      }
      return current;
    case "paid":
      if (action === "ship") {
        return "shipped";
      }
      if (action === "cancel") {
        return "cancelled";
      }
      return current;
    case "shipped":
      if (action === "deliver") {
        return "delivered";
      }
      return current;
    default:
      return current;
  }
}
`,
  badSolutions: [
    {
      code: `function nextOrderStatus(current, action) {
  if (current === "pending" && action === "pay") return "paid";
  if (current === "pending" && action === "cancel") return "cancelled";
  if (current === "paid" && action === "ship") return "shipped";
  if (current === "paid" && action === "cancel") return "cancelled";
  if (current === "shipped" && action === "deliver") return "delivered";
  return current;
}
`,
      description: "if の連鎖で書いていて switch を使っていない (AST required 違反)",
    },
    {
      code: `function nextOrderStatus(current, action) {
  switch (current) {
    case "pending":
      if (action === "pay") return "paid";
      if (action === "cancel") return "cancelled";
      return current;
    case "paid":
      if (action === "ship") return "shipped";
      return current;
    case "shipped":
      if (action === "deliver") return "delivered";
      return current;
    default:
      return current;
  }
}
`,
      description: "paid + cancel の遷移が抜けている (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "switch",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/switch",
      pageTitle: "switch",
    },
  ],
};
