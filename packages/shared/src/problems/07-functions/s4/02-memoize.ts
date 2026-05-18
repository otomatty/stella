import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch07Memoize: Assignment = {
  id: "S4-Ch07-02-memoize",
  stage: "S4",
  chapterId: "Ch07",
  sequence: 2,
  title: "memoize: 同じ引数のときは結果を Map にキャッシュする",
  newConcept: "Map をクロージャに閉じ込め、 引数→結果のキャッシュを持つ高階関数",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

「**1 引数で、 引数はプリミティブ (数値・文字列・真偽値) を取る** 関数 \`fn\`」 を受け取り、 同じ引数で呼ばれたときは \`fn\` を再実行せずキャッシュ済みの結果を返す関数を返す関数 \`memoize\` を実装してください。 キャッシュには **Map** を使ってください。

\`\`\`js
const slow = (n) => n * 2;
const fast = memoize(slow);
fast(3);   // → 6   (slow が呼ばれる)
fast(3);   // → 6   (slow は呼ばれず Map から返る)
fast(4);   // → 8   (slow が呼ばれる)

let calls = 0;
const counted = memoize((s) => { calls += 1; return s.length; });
counted("hi"); counted("hi"); counted("yo"); counted("hi");
calls;     // → 2   ("hi" と "yo" の 2 回だけ)
\`\`\`

## ポイント

- **Map** を 1 つだけ作って、 返す関数のクロージャに閉じ込めます。
- 同じ引数で 2 回目以降は \`map.has(arg)\` で判定し、 \`map.get(arg)\` を返します。
- 引数はプリミティブ前提なので、 \`Map\` のキーとして直接使えます。
`,
  starterFiles: singleFile(`function memoize(fn) {
  // Map をキャッシュとして使い、 同じ引数なら fn を再実行しない関数を return してください
}
`),
  entryPoints: ["memoize"],
  demoCall: `console.log(memoize((n) => n * n)(7));`,
  tests: [
    {
      name: "初回は fn の結果を返す",
      code: `memoize((n) => n * 2)(5) === 10`,
    },
    {
      name: "同じ引数なら fn は再実行されない",
      code: `(() => {
        let calls = 0;
        const f = memoize((n) => { calls += 1; return n * 2; });
        f(3); f(3); f(3);
        return calls === 1;
      })()`,
    },
    {
      name: "異なる引数なら別々に計算される",
      code: `(() => {
        let calls = 0;
        const f = memoize((n) => { calls += 1; return n; });
        f(1); f(2); f(3);
        return calls === 3;
      })()`,
    },
    {
      name: "重複と新規が混ざってもキャッシュが効く",
      code: `(() => {
        let calls = 0;
        const f = memoize((s) => { calls += 1; return s.length; });
        f("hi"); f("hi"); f("yo"); f("hi");
        return calls === 2;
      })()`,
    },
    {
      name: "結果はキャッシュされた値と一致する",
      code: `(() => {
        const f = memoize((n) => n + 100);
        f(7);
        return f(7) === 107;
      })()`,
    },
    {
      name: "戻り値は関数",
      code: `typeof memoize((n) => n) === "function"`,
    },
    {
      name: "別の memoize 呼び出しで作られたキャッシュは混ざらない",
      code: `(() => {
        let callsA = 0;
        let callsB = 0;
        const a = memoize((n) => { callsA += 1; return n + 1; });
        const b = memoize((n) => { callsB += 1; return n + 100; });
        return (
          a(1) === 2 &&
          b(1) === 101 &&
          a(1) === 2 &&
          b(1) === 101 &&
          callsA === 1 &&
          callsB === 1
        );
      })()`,
    },
  ],
  hints: [
    "外側で `const cache = new Map();` を作り、 返す関数で `if (cache.has(x)) return cache.get(x);` → 計算 → `cache.set(x, v);` → return v。",
    "解答例:\n```js\nfunction memoize(fn) {\n  const cache = new Map();\n  return (x) => {\n    if (cache.has(x)) {\n      return cache.get(x);\n    }\n    const value = fn(x);\n    cache.set(x, value);\n    return value;\n  };\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で関数を返す" },
        { kind: "node", nodeType: "NewExpression", label: "new Map() を使う" },
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数でラップした関数を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function memoize(fn) {
  const cache = new Map();
  return (x) => {
    if (cache.has(x)) {
      return cache.get(x);
    }
    const value = fn(x);
    cache.set(x, value);
    return value;
  };
}
`,
  badSolutions: [
    {
      code: `function memoize(fn) {
  return (x) => fn(x);
}
`,
      description: "キャッシュしておらず、 毎回 fn が呼ばれる (AST + テスト失敗)",
    },
    {
      code: `function memoize(fn) {
  const cache = new Map();
  return (x) => {
    const value = fn(x);
    cache.set(x, value);
    return value;
  };
}
`,
      description: "Map に保存はしているが先に取り出していないので fn が毎回呼ばれる (テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "Map",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map",
      pageTitle: "Map",
    },
    {
      heading: "クロージャ",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Closures",
      pageTitle: "クロージャ",
    },
  ],
};
