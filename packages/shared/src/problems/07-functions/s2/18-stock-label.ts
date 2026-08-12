import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07StockLabel: Assignment = {
  id: "S2-Ch07-412-stock-label",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 18,
  title: "早期リターンで在庫ラベルを返す",
  newConcept: "return の「終える」働きを使って else を書かない",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

在庫数を受け取り、 次の文字列を返す関数 \`getStockLabel\` を作ってください。 **早期リターン** を使い、 \`else\` を書かずに実装します。

| 在庫数 | 返す文字列 |
| --- | --- |
| 0 | \`"在庫切れ"\` |
| 1 〜 4 | \`"残りわずか"\` |
| 5 以上 | \`"在庫あり"\` |

## 期待する挙動

- 条件に当てはまった時点で \`return\` し、 そこで関数を抜けます。
- 境目 (\`0\` / \`1\` / \`4\` / \`5\`) でも表のとおりに分かれます。

## ポイント

- \`return\` には「値を返す」と「処理を終える」の 2 つの働きがあります。 この 2 つ目を利用したのが早期リターンです。
- 先に \`0\` かどうかを判定してから、 次に「5 未満か」を判定します。 順番を逆にすると \`0\` も「残りわずか」に入ってしまいます。
- \`if\` / \`else if\` / \`else\` で書いても同じ結果になりますが、 早期リターンのほうがネストが浅く読みやすくなります。
`,
  starterFiles: singleFile(
    `// 在庫数 (数値) を受け取る関数 getStockLabel を作る
// 早期リターンで 3 段階のラベルを return する (else は書かない)

`,
    "main.ts",
  ),
  entryPoints: ["getStockLabel"],
  demoCall: `console.log(getStockLabel(3));`,
  tests: [
    { name: "0 なら 在庫切れ", code: `getStockLabel(0) === "在庫切れ"` },
    { name: "1 なら 残りわずか", code: `getStockLabel(1) === "残りわずか"` },
    { name: "4 なら 残りわずか", code: `getStockLabel(4) === "残りわずか"` },
    { name: "5 なら 在庫あり", code: `getStockLabel(5) === "在庫あり"` },
    { name: "120 なら 在庫あり", code: `getStockLabel(120) === "在庫あり"` },
  ],
  hints: [
    "最初に「在庫が無い」場合だけを取り出して、 その場で `return` してください。 そこを抜けた先では在庫が 1 以上だと分かっています。",
    "2 つ目の判定は「5 より少ないか」です。 そこも `return` で抜ければ、 最後は条件を書かずに残りのラベルを返せます。",
    '解答例:\n```ts\nfunction getStockLabel(stock: number): string {\n  if (stock === 0) {\n    return "在庫切れ";\n  }\n  if (stock < 5) {\n    return "残りわずか";\n  }\n  return "在庫あり";\n}\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `function getStockLabel(stock: number): string {
  if (stock === 0) {
    return "在庫切れ";
  }
  if (stock < 5) {
    return "残りわずか";
  }
  return "在庫あり";
}
`,
  badSolutions: [
    {
      code: `function getStockLabel(stock: number): string {
  if (stock < 5) {
    return "残りわずか";
  }
  if (stock === 0) {
    return "在庫切れ";
  }
  return "在庫あり";
}
`,
      description:
        "広いほうの条件を先に書いたため、 0 も「5 未満」に当たってしまい「在庫切れ」に到達しない",
    },
  ],
  mdnSections: [{ heading: "関数の定義" }, { heading: "関数の呼び出し" }],
};
