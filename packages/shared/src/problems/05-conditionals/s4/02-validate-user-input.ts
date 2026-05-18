import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch05ValidateUserInput: Assignment = {
  id: "S4-Ch05-02-validate-user-input",
  stage: "S4",
  chapterId: "Ch05",
  sequence: 2,
  title: "ガード節で入力を順番に検証する",
  newConcept: "早期 return (guard clause) で異常系を先に弾く",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

ユーザー登録フォームの入力を検証する関数 \`validateUserInput\` を実装してください。 引数 \`input\` をチェックし、 **以下の順番で最初に違反したエラー文字列** を返します。 全部通れば \`"OK"\` を返します。

| 順番 | 条件 | 違反時の戻り値 |
|---|---|---|
| 1 | \`input\` がオブジェクトでない (null も不可) | \`"入力はオブジェクトで指定してください"\` |
| 2 | \`input.name\` が空文字列または文字列以外 | \`"名前は必須です"\` |
| 3 | \`input.age\` が整数でない、 または 0 未満 / 150 超 | \`"年齢は 0 以上 150 以下の整数で指定してください"\` |
| 4 | \`input.email\` が文字列でない、 または "@" を含まない | \`"メールアドレスの形式が正しくありません"\` |
| — | 全部 OK | \`"OK"\` |

\`\`\`js
validateUserInput({ name: "山田", age: 30, email: "y@example.com" });
// → "OK"

validateUserInput(null);
// → "入力はオブジェクトで指定してください"

validateUserInput({ name: "", age: 30, email: "y@example.com" });
// → "名前は必須です"

validateUserInput({ name: "山田", age: -1, email: "y@example.com" });
// → "年齢は 0 以上 150 以下の整数で指定してください"

validateUserInput({ name: "山田", age: 30, email: "no-at-sign" });
// → "メールアドレスの形式が正しくありません"
\`\`\`

## ポイント

- このパターンは **ガード節 (guard clause)** と呼ばれます。 異常系を **早期 return** で先に弾くと、 関数の本体が常に「正常系の処理」 だけに集中できて読みやすくなります。
- 「最初に違反したものだけ返す」 ので、 **チェックの順番がそのまま return の順番** になります。 ネストした if/else を書く必要はありません。
- \`Number.isInteger\` で 「整数か」 を判定できます。 \`typeof x === "string"\` で文字列判定、 \`s.includes("@")\` で \`@\` 判定が便利です。
`,
  starterFiles: singleFile(`function validateUserInput(input) {
  // 早期 return (guard clause) で順に異常系を弾いてください
  // 1. オブジェクトでない → "入力はオブジェクトで指定してください"
  // 2. name が空文字列または文字列以外 → "名前は必須です"
  // 3. age が整数でない / 範囲外 → "年齢は 0 以上 150 以下の整数で指定してください"
  // 4. email が文字列でない / "@" を含まない → "メールアドレスの形式が正しくありません"
  // 全部 OK なら "OK"
}
`),
  entryPoints: ["validateUserInput"],
  demoCall: `console.log(validateUserInput({ name: "山田", age: 30, email: "y@example.com" }));`,
  tests: [
    {
      name: "全項目正常なら OK",
      code: `validateUserInput({ name: "山田", age: 30, email: "y@example.com" }) === "OK"`,
    },
    {
      name: "境界: age=0, age=150 も OK",
      code: `validateUserInput({ name: "A", age: 0, email: "a@b" }) === "OK" && validateUserInput({ name: "A", age: 150, email: "a@b" }) === "OK"`,
    },
    {
      name: "null は入力エラー",
      code: `validateUserInput(null) === "入力はオブジェクトで指定してください"`,
    },
    {
      name: "数値は入力エラー",
      code: `validateUserInput(42) === "入力はオブジェクトで指定してください"`,
    },
    {
      name: "name が空文字は 名前エラー",
      code: `validateUserInput({ name: "", age: 30, email: "y@example.com" }) === "名前は必須です"`,
    },
    {
      name: "name が undefined は 名前エラー",
      code: `validateUserInput({ age: 30, email: "y@example.com" }) === "名前は必須です"`,
    },
    {
      name: "name が数値は 名前エラー",
      code: `validateUserInput({ name: 123, age: 30, email: "y@example.com" }) === "名前は必須です"`,
    },
    {
      name: "age が小数は 年齢エラー",
      code: `validateUserInput({ name: "A", age: 30.5, email: "a@b" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
    {
      name: "age が負数は 年齢エラー",
      code: `validateUserInput({ name: "A", age: -1, email: "a@b" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
    {
      name: "age が 151 は 年齢エラー",
      code: `validateUserInput({ name: "A", age: 151, email: "a@b" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
    {
      name: "age が undefined (未指定) は 年齢エラー",
      code: `validateUserInput({ name: "A", email: "a@b" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
    {
      name: "age が NaN は 年齢エラー",
      code: `validateUserInput({ name: "A", age: NaN, email: "a@b" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
    {
      name: "email に @ が無いと メールエラー",
      code: `validateUserInput({ name: "A", age: 30, email: "no-at-sign" }) === "メールアドレスの形式が正しくありません"`,
    },
    {
      name: "email が文字列でないと メールエラー",
      code: `validateUserInput({ name: "A", age: 30, email: 123 }) === "メールアドレスの形式が正しくありません"`,
    },
    {
      name: "name と email の両方が不正なら 順番で 名前エラーが先",
      code: `validateUserInput({ name: "", age: 30, email: "bad" }) === "名前は必須です"`,
    },
    {
      name: "age と email の両方が不正なら 順番で 年齢エラーが先",
      code: `validateUserInput({ name: "A", age: -1, email: "bad" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
    {
      name: "age (NaN) と email の両方が不正でも 年齢エラーが先",
      code: `validateUserInput({ name: "A", age: NaN, email: "bad" }) === "年齢は 0 以上 150 以下の整数で指定してください"`,
    },
  ],
  hints: [
    "if (異常条件) return エラー文字列; を 4 つ並べ、 最後に return \"OK\"; で締める。",
    "オブジェクト判定は typeof input === \"object\" && input !== null。 null は typeof で \"object\" になるので注意。",
    "解答例:\n```js\nfunction validateUserInput(input) {\n  if (typeof input !== \"object\" || input === null) {\n    return \"入力はオブジェクトで指定してください\";\n  }\n  if (typeof input.name !== \"string\" || input.name === \"\") {\n    return \"名前は必須です\";\n  }\n  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 150) {\n    return \"年齢は 0 以上 150 以下の整数で指定してください\";\n  }\n  if (typeof input.email !== \"string\" || !input.email.includes(\"@\")) {\n    return \"メールアドレスの形式が正しくありません\";\n  }\n  return \"OK\";\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でエラー文字列または OK を返す" },
        { kind: "node", nodeType: "IfStatement", label: "if 文で異常系を弾く" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function validateUserInput(input) {
  if (typeof input !== "object" || input === null) {
    return "入力はオブジェクトで指定してください";
  }
  if (typeof input.name !== "string" || input.name === "") {
    return "名前は必須です";
  }
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 150) {
    return "年齢は 0 以上 150 以下の整数で指定してください";
  }
  if (typeof input.email !== "string" || !input.email.includes("@")) {
    return "メールアドレスの形式が正しくありません";
  }
  return "OK";
}
`,
  badSolutions: [
    {
      code: `function validateUserInput(input) {
  if (typeof input !== "object" || input === null) {
    return "入力はオブジェクトで指定してください";
  }
  if (typeof input.email !== "string" || !input.email.includes("@")) {
    return "メールアドレスの形式が正しくありません";
  }
  if (typeof input.name !== "string" || input.name === "") {
    return "名前は必須です";
  }
  if (!Number.isInteger(input.age) || input.age < 0 || input.age > 150) {
    return "年齢は 0 以上 150 以下の整数で指定してください";
  }
  return "OK";
}
`,
      description: "チェック順序が違うので、 name と email 両方が不正なときに email エラーを返してしまう (テスト失敗)",
    },
    {
      code: `function validateUserInput(input) {
  if (typeof input !== "object" || input === null) return "入力はオブジェクトで指定してください";
  if (input.name === "") return "名前は必須です";
  if (input.age < 0 || input.age > 150) return "年齢は 0 以上 150 以下の整数で指定してください";
  if (!input.email.includes("@")) return "メールアドレスの形式が正しくありません";
  return "OK";
}
`,
      description: "型チェックを省略しており、 name が数値や undefined のときに正しく弾けない (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "return",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return",
      pageTitle: "return",
    },
    {
      heading: "Number.isInteger",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger",
      pageTitle: "Number.isInteger",
    },
  ],
};
