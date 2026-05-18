import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch07ValidatorCapstone: Assignment = {
  id: "S4-Ch07-05-validator-capstone",
  stage: "S4",
  chapterId: "Ch07",
  sequence: 5,
  title: "[卒業課題] combineChecks: 検証関数を組み合わせて 1 つにまとめる",
  newConcept: "複数の小さな検証関数を残余引数で受け、 早期 return で最初のエラーだけ返す合成",
  estimatedMinutes: 40,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

これは S4 卒業課題のひとつです。 「**値 \`value\` を受け取り、 問題がなければ \`null\`、 問題があればエラーメッセージ文字列を返す**」 形の小さな検証関数 (チェック関数) を **任意個数** 受け取り、 それらを **左から順番に** 適用して 「**最初に見つかったエラー** か、 全部通過したら \`null\`」 を返す関数を返す関数 \`combineChecks\` を実装してください。

### チェック関数の型

\`\`\`js
const notEmpty = (s) => s.length === 0 ? "空にできません" : null;
const minThree = (s) => s.length < 3 ? "3 文字以上にしてください" : null;
const noSpace  = (s) => s.includes(" ") ? "空白を含めないでください" : null;
\`\`\`

### combineChecks の振る舞い

\`\`\`js
const validate = combineChecks(notEmpty, minThree, noSpace);

validate("alice");      // → null            (全部通る)
validate("");           // → "空にできません" (notEmpty で落ちる)
validate("ab");         // → "3 文字以上にしてください" (minThree で落ちる)
validate("a b c");      // → "空白を含めないでください" (noSpace で落ちる)

// チェックなしは常に null
combineChecks()("anything");   // → null
\`\`\`

## ポイント

- 検証関数は **任意個数** なので **残余引数** \`(...checks)\` で受けます。
- 返す関数の中で \`checks\` を **for...of** で順番に試し、 **最初に非 null が返った時点で return** します (早期 return)。
- 全部通ったら最後に \`return null;\`。
- **順序が重要**: combineChecks に渡した順に試され、 最初に失敗したエラーだけが返ります。
- 1 つの大きな関数で全部判定するのではなく、 **小さなチェック関数を組み合わせる** ことで読みやすくなる、 という S4 のテーマを実感する課題です。
`,
  starterFiles: singleFile(`function combineChecks() {
  // ...checks を残余引数で受け、 value を順番に各 check に渡して
  // 最初に非 null を返したものを返し、 全部通ったら null を返す関数を return してください
}
`),
  entryPoints: ["combineChecks"],
  demoCall: `console.log(combineChecks((s) => s.length === 0 ? "empty" : null)("hi"));`,
  tests: [
    {
      name: "全チェック通過なら null",
      code: `combineChecks(
        (s) => s.length === 0 ? "空" : null,
        (s) => s.length < 3 ? "短い" : null,
      )("alice") === null`,
    },
    {
      name: "最初のチェックで落ちる",
      code: `combineChecks(
        (s) => s.length === 0 ? "空" : null,
        (s) => s.length < 3 ? "短い" : null,
      )("") === "空"`,
    },
    {
      name: "2 つ目のチェックで落ちる",
      code: `combineChecks(
        (s) => s.length === 0 ? "空" : null,
        (s) => s.length < 3 ? "短い" : null,
      )("ab") === "短い"`,
    },
    {
      name: "両方落ちる入力でも先のエラーだけ返る (早期 return)",
      code: `combineChecks(
        (s) => s.length === 0 ? "空" : null,
        (s) => s.length < 3 ? "短い" : null,
      )("") === "空"`,
    },
    {
      name: "チェック 0 個なら常に null",
      code: `combineChecks()("anything") === null`,
    },
    {
      name: "3 つ目のチェックでも落ちる",
      code: `combineChecks(
        (s) => s.length === 0 ? "空" : null,
        (s) => s.length < 3 ? "短い" : null,
        (s) => s.includes(" ") ? "空白あり" : null,
      )("a b c") === "空白あり"`,
    },
    {
      name: "数値の検証にも使える",
      code: `combineChecks(
        (n) => n < 0 ? "負の数" : null,
        (n) => n > 100 ? "100 超" : null,
      )(150) === "100 超"`,
    },
  ],
  hints: [
    "1) `function combineChecks(...checks) { ... }` で受ける。 2) 返す関数の中で `for (const check of checks)` で 1 つずつ呼び出し、 結果が `null` でなければ即 `return` する。 3) ループを抜けたら `return null;`。",
    "解答例:\n```js\nfunction combineChecks(...checks) {\n  return (value) => {\n    for (const check of checks) {\n      const error = check(value);\n      if (error !== null) {\n        return error;\n      }\n    }\n    return null;\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return でエラー or null を返す" },
        { kind: "node", nodeType: "RestElement", label: "...checks (残余引数) で関数列を受ける" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で内側の関数を作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function combineChecks(...checks) {
  return (value) => {
    for (const check of checks) {
      const error = check(value);
      if (error !== null) {
        return error;
      }
    }
    return null;
  };
}
`,
  badSolutions: [
    {
      code: `function combineChecks(...checks) {
  return (value) => {
    let lastError = null;
    for (const check of checks) {
      const error = check(value);
      if (error !== null) {
        lastError = error;
      }
    }
    return lastError;
  };
}
`,
      description: "早期 return しておらず最後のエラーが返る (2 つ落ちるとき先のエラーにならない / テスト失敗)",
    },
    {
      code: `function combineChecks(check) {
  return (value) => check(value);
}
`,
      description: "残余引数を使っておらず 1 つの check しか受け取れない (AST + テスト失敗)",
    },
    {
      code: `function combineChecks(...checks) {
  return (value) => {
    for (const check of checks) {
      if (check(value) !== null) {
        return "エラー";
      }
    }
    return null;
  };
}
`,
      description: "実際のエラーメッセージを返さず固定文字列を返している (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "残余引数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/rest_parameters",
      pageTitle: "残余引数",
    },
    {
      heading: "for...of",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for...of",
      pageTitle: "for...of",
    },
    {
      heading: "クロージャ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures",
      pageTitle: "クロージャ",
    },
  ],
};
