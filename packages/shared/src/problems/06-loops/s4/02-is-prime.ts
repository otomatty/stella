import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch06IsPrime: Assignment = {
  id: "S4-Ch06-02-is-prime",
  stage: "S4",
  chapterId: "Ch06",
  sequence: 2,
  title: "素数判定 (早期 return で打ち切る)",
  newConcept: "ループ中で「条件を満たした瞬間に return」して無駄な周回を打ち切る",
  estimatedMinutes: 25,
  difficulty: 2,
  testKind: "function",
  description: `## やること

整数 \`n\` を受け取り、 \`n\` が **素数** なら \`true\`、 そうでなければ \`false\` を返す関数 \`isPrime\` を実装してください。

- \`n < 2\` は素数ではない
- \`2\` は素数
- \`3\` 以上は \`2\` から \`n - 1\` までのいずれかで割り切れたら素数ではない

\`\`\`js
isPrime(1);   // → false
isPrime(2);   // → true
isPrime(3);   // → true
isPrime(4);   // → false  (2 で割り切れる)
isPrime(17);  // → true
isPrime(25);  // → false  (5 で割り切れる)
\`\`\`

## ポイント

- ループの中で **「割り切れた瞬間に \`return false\`」** すると、 残りの周回をスキップできます (早期脱出)。
- \`break\` でフラグを立てて最後に判定する書き方もありますが、 関数の中なら \`return\` で抜けるのが最もシンプルです。
- ループ範囲は \`i = 2; i < n; i++\` で十分通ります (高速化として \`i * i <= n\` まででも OK)。
`,
  starterFiles: singleFile(`function isPrime(n) {
  // 2 未満は素数ではないので即 false を return する


  // 2 から n - 1 まで for ループで割り算を試し、 割り切れたらその場で false を return する


  // ループを抜けたら素数なので true を return する
}
`),
  entryPoints: ["isPrime"],
  demoCall: `console.log(isPrime(17));`,
  tests: [
    {
      name: "isPrime(1) は false",
      code: `isPrime(1) === false`,
    },
    {
      name: "isPrime(0) は false",
      code: `isPrime(0) === false`,
    },
    {
      name: "isPrime(2) は true",
      code: `isPrime(2) === true`,
    },
    {
      name: "isPrime(3) は true",
      code: `isPrime(3) === true`,
    },
    {
      name: "isPrime(4) は false",
      code: `isPrime(4) === false`,
    },
    {
      name: "isPrime(17) は true",
      code: `isPrime(17) === true`,
    },
    {
      name: "isPrime(25) は false",
      code: `isPrime(25) === false`,
    },
    {
      name: "isPrime(97) は true",
      code: `isPrime(97) === true`,
    },
    {
      name: "isPrime(100) は false",
      code: `isPrime(100) === false`,
    },
    {
      name: "戻り値は boolean",
      code: `typeof isPrime(7) === "boolean" && typeof isPrime(8) === "boolean"`,
    },
  ],
  hints: [
    "n < 2 を最初にはじき、 for (let i = 2; i < n; i++) で n % i === 0 なら return false。 ループを抜けたら return true。",
    "解答例:\n```js\nfunction isPrime(n) {\n  if (n < 2) {\n    return false;\n  }\n  for (let i = 2; i < n; i++) {\n    if (n % i === 0) {\n      return false;\n    }\n  }\n  return true;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForStatement", label: "for 文で試し割りする" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で結果を返す (早期 return も含む)" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== ではなく === を使う" },
      ],
    },
  },
  solution: `function isPrime(n) {
  if (n < 2) {
    return false;
  }
  for (let i = 2; i < n; i++) {
    if (n % i === 0) {
      return false;
    }
  }
  return true;
}
`,
  badSolutions: [
    {
      code: `function isPrime(n) {
  return n >= 2;
}
`,
      description: "試し割りをしておらず、 4 や 25 のような合成数でも true を返す (テスト失敗)",
    },
    {
      code: `function isPrime(n) {
  if (n < 2) {
    return false;
  }
  for (let i = 2; i < n; i++) {
    if (n % i == 0) {
      return false;
    }
  }
  return true;
}
`,
      description: "== を使っており forbidden (loose-eq) に違反している",
    },
  ],
  mdnSections: [
    {
      heading: "return",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/return",
      pageTitle: "return",
    },
    {
      heading: "for 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for",
      pageTitle: "for",
    },
  ],
};
