import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch07Curry2: Assignment = {
  id: "S4-Ch07-04-curry2",
  stage: "S4",
  chapterId: "Ch07",
  sequence: 4,
  title: "curry: 2 引数関数を 1 引数ずつ受け取れる形に変える",
  newConcept: "2 引数関数を 「関数を返す関数」 に組み直すカリー化の入口",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

「**ちょうど 2 引数を取る** 関数 \`fn\`」 を受け取り、 \`curry(fn)(a)(b) === fn(a, b)\` となるような関数を返す関数 \`curry\` を実装してください。 つまり 1 引数ずつ呼び出せる形に **カリー化** します。

\`\`\`js
const add = (a, b) => a + b;
const cAdd = curry(add);
cAdd(2)(3);            // → 5

const addTen = cAdd(10);     // 部分適用
addTen(7);             // → 17
addTen(100);           // → 110

curry((a, b) => a + " & " + b)("apple")("banana");  // → "apple & banana"
\`\`\`

## ポイント

- 1 段目の関数で \`a\` を受け取り、 **2 段目の関数で \`b\` を受け取って \`fn(a, b)\` を返す** 形にします。
- 1 段目の結果を変数に保存しておけば 「片方を固定した関数」 (部分適用) として使い回せます。 \`const addTen = curry(add)(10)\`。
- ここでは 2 引数固定。 任意引数のカリー化は S5 以降で扱います。
`,
  starterFiles: singleFile(`function curry(fn) {
  // (a) => (b) => fn(a, b) の形を return してください
}
`),
  entryPoints: ["curry"],
  demoCall: `console.log(curry((a, b) => a + b)(2)(3));`,
  tests: [
    {
      name: "curry(add)(2)(3) は 5",
      code: `curry((a, b) => a + b)(2)(3) === 5`,
    },
    {
      name: "curry(mul)(4)(5) は 20",
      code: `curry((a, b) => a * b)(4)(5) === 20`,
    },
    {
      name: "1 段目だけ呼ぶと関数が返る",
      code: `typeof curry((a, b) => a + b)(10) === "function"`,
    },
    {
      name: "部分適用した関数を使い回せる",
      code: `(() => {
        const addTen = curry((a, b) => a + b)(10);
        return addTen(7) === 17 && addTen(100) === 110;
      })()`,
    },
    {
      name: "文字列の連結にも使える",
      code: `curry((a, b) => a + " & " + b)("apple")("banana") === "apple & banana"`,
    },
    {
      name: "順序が保たれる (a, b の順)",
      code: `curry((a, b) => a - b)(10)(3) === 7`,
    },
  ],
  hints: [
    "`return (a) => (b) => fn(a, b);` だけで書けます。",
    "解答例:\n```js\nfunction curry(fn) {\n  return (a) => (b) => fn(a, b);\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で関数を返す" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で 2 段の関数を作る" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function curry(fn) {
  return (a) => (b) => fn(a, b);
}
`,
  badSolutions: [
    {
      code: `function curry(fn) {
  return (a, b) => fn(a, b);
}
`,
      description: "カリー化していない (2 引数のままで curry(add)(2)(3) が動かない / テスト失敗)",
    },
    {
      code: `function curry(fn) {
  return (a) => (b) => fn(b, a);
}
`,
      description: "引数の順序が逆 (a, b ではなく b, a で渡している / テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "アロー関数式",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/Arrow_functions",
      pageTitle: "アロー関数式",
    },
    {
      heading: "クロージャ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures",
      pageTitle: "クロージャ",
    },
  ],
};
