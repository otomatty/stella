import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch05PaymentMethodSwitch: Assignment = {
  id: "S1-Ch05-241-payment-method-switch",
  stage: "S1",
  chapterId: "Ch05",
  sequence: 5,
  title: "支払い方法を switch で分ける",
  newConcept: "候補が決まっている分岐は switch で書く",
  estimatedMinutes: 10,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

支払い方法 \`method\` (型は \`"cash" | "credit" | "qr"\`) によって、 次のように表示する \`switch\` を書いてください。 今回の \`method\` は \`"cash"\` とします。

- \`"cash"\` → 「現金払い」
- \`"credit"\` → 「クレジットカード払い」
- \`"qr"\` → 「QRコード決済」

## 期待する出力

\`\`\`
現金払い
\`\`\`

## ポイント

- \`switch (method) { case "cash": ... break; ... }\` の形です。 \`case\` が入り口、 \`break\` が出口です。
- \`case\` は **等価比較 (\`===\`)** で判定されます。 文字列の綴りが 1 文字でも違うと、 その \`case\` には入りません。
- リテラルのユニオン型 (\`"cash" | "credit" | "qr"\`) で宣言しておくと、 型に存在しない値を \`case\` に書いた時点でコンパイラーが教えてくれます。 候補が決まっている分岐では、 この組み合わせが基本形です。
- \`break\` を書き忘れると、 次の \`case\` の中身まで続けて実行されます。
`,
  starterFiles: singleFile(
    `// 支払い方法をリテラルのユニオン型で宣言する（今回は "cash"）


// switch で 3 つの case に分け、 それぞれの表示を書く（break を忘れずに）

`,
    "main.ts",
  ),
  tests: [
    {
      name: "現金払いが出力される",
      expectedStdout: "現金払い",
    },
  ],
  hints: [
    '変数の宣言は `const method: "cash" | "credit" | "qr" = "cash";` です。 型注釈があることで、 case の綴り間違いを実行前に見つけられます。',
    "`case` のラベルは、 変数に入れた文字列とまったく同じ綴りでなければ当たりません。 当たらないと何も表示されません。",
    '解答例:\n```ts\nconst method: "cash" | "credit" | "qr" = "cash";\n\nswitch (method) {\n  case "cash":\n    console.log("現金払い");\n    break;\n  case "credit":\n    console.log("クレジットカード払い");\n    break;\n  case "qr":\n    console.log("QRコード決済");\n    break;\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const method: "cash" | "credit" | "qr" = "cash";

switch (method) {
  case "cash":
    console.log("現金払い");
    break;
  case "credit":
    console.log("クレジットカード払い");
    break;
  case "qr":
    console.log("QRコード決済");
    break;
}
`,
  badSolutions: [
    {
      code: `const method = "cash";

switch (method) {
  case "cach":
    console.log("現金払い");
    break;
  case "credit":
    console.log("クレジットカード払い");
    break;
  case "qr":
    console.log("QRコード決済");
    break;
}
`,
      description:
        "case のラベルを綴り間違えており、 どの case にも当たらないため何も表示されない",
    },
  ],
  mdnSections: [
    { heading: "switch 文", anchor: "switch_文" },
    { heading: "break 文", anchor: "break_文" },
  ],
};
