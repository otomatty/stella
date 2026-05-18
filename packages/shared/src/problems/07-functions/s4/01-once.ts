import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch07Once: Assignment = {
  id: "S4-Ch07-01-once",
  stage: "S4",
  chapterId: "Ch07",
  sequence: 1,
  title: "once: 関数を 1 度だけ実行できるようラップする",
  newConcept: "クロージャに 「呼ばれたか」 のフラグと初回結果を覚えさせる高階関数",
  estimatedMinutes: 25,
  difficulty: 1,
  testKind: "function",
  description: `## やること

関数 \`fn\` を受け取り、 「最初に呼んだときだけ \`fn\` を実行して結果を返し、 2 回目以降は \`fn\` を実行せずに初回の結果を返す」 関数を返す関数 \`once\` を実装してください。 呼び出し時の引数はそのまま \`fn\` に渡してください。

\`\`\`js
const greet = once((name) => "hello " + name);
greet("alice");   // → "hello alice"   (fn が呼ばれる)
greet("bob");     // → "hello alice"   (fn は呼ばれず初回の結果)
greet("carol");   // → "hello alice"   (fn は呼ばれず初回の結果)

let calls = 0;
const inc = once(() => { calls += 1; return calls; });
inc(); inc(); inc();
calls;            // → 1   (実際に走ったのは 1 回だけ)
\`\`\`

## ポイント

- **クロージャ** で 「もう呼んだか」 と 「初回の結果」 を覚えさせます。
- 返す関数は **残余パラメータ** \`(...args)\` で受けて \`fn(...args)\` のように渡すと、 元の関数の引数個数に依存しません。
- 2 回目以降は \`fn\` を呼ばないことが本質。 引数を渡しても再評価してはいけません。
`,
  starterFiles: singleFile(`function once(fn) {
  // 初回だけ fn を呼び、 結果をキャッシュして返す関数を return してください
}
`),
  entryPoints: ["once"],
  demoCall: `console.log(once((n) => n * 2)(5));`,
  tests: [
    {
      name: "初回呼び出しは fn の結果を返す",
      code: `once((x) => x + 1)(10) === 11`,
    },
    {
      name: "2 回目以降は初回の結果を返す",
      code: `(() => {
        const f = once((x) => x + 1);
        f(10);
        return f(99) === 11;
      })()`,
    },
    {
      name: "3 回目も初回の結果",
      code: `(() => {
        const f = once((x) => x * 2);
        f(3);
        f(100);
        return f(50) === 6;
      })()`,
    },
    {
      name: "fn は 1 回しか実行されない",
      code: `(() => {
        let calls = 0;
        const f = once(() => { calls += 1; return calls; });
        f(); f(); f(); f();
        return calls === 1;
      })()`,
    },
    {
      name: "戻り値は関数",
      code: `typeof once(() => 1) === "function"`,
    },
    {
      name: "引数なしの関数でも動く",
      code: `(() => {
        const f = once(() => 42);
        return f() === 42 && f() === 42;
      })()`,
    },
    {
      name: "複数引数もそのまま fn に渡される (初回)",
      code: `(() => {
        const f = once((a, b) => a + b);
        return f(2, 3) === 5;
      })()`,
    },
    {
      name: "複数引数でも 2 回目以降は初回の結果が返る",
      code: `(() => {
        const f = once((a, b) => a + b);
        f(2, 3);
        return f(100, 200) === 5;
      })()`,
    },
  ],
  hints: [
    "外側の関数で `let called = false; let cached;` を用意し、 内側の関数で `if (!called) { called = true; cached = fn(...args); }` の形で更新する。",
    "解答例:\n```js\nfunction once(fn) {\n  let called = false;\n  let cached;\n  return (...args) => {\n    if (!called) {\n      called = true;\n      cached = fn(...args);\n    }\n    return cached;\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で関数を返す" },
        { kind: "node", nodeType: "RestElement", label: "...args で任意個数の引数を受ける" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数でラップした関数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function once(fn) {
  let called = false;
  let cached;
  return (...args) => {
    if (!called) {
      called = true;
      cached = fn(...args);
    }
    return cached;
  };
}
`,
  badSolutions: [
    {
      code: `function once(fn) {
  return (...args) => fn(...args);
}
`,
      description: "毎回 fn を呼んでしまっており、 2 回目以降の引数で結果が変わる (テスト失敗)",
    },
    {
      code: `function once(fn) {
  let cached = fn();
  return () => cached;
}
`,
      description: "once 呼び出し時点で fn を即時実行している (遅延実行になっていない / 引数を渡せない)",
    },
  ],
  mdnSections: [
    {
      heading: "クロージャ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures",
      pageTitle: "クロージャ",
    },
    {
      heading: "残余引数",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Functions/rest_parameters",
      pageTitle: "残余引数",
    },
  ],
};
