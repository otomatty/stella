import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch02PrimeFactors: Assignment = {
  id: "S4-Ch02-03-prime-factors",
  stage: "S4",
  chapterId: "Ch02",
  sequence: 3,
  title: "整数を素因数分解する",
  newConcept: "2 以上の約数で割れる限り何度でも割って素因数を取り出す",
  estimatedMinutes: 30,
  difficulty: 2,
  testKind: "function",
  description: `## やること

正の整数 \`n\` を受け取り、 その **素因数を昇順** に並べた配列を返す関数 \`primeFactors\` を実装してください。 同じ素数で何度も割り切れる場合は、 その **回数分だけ** 配列に含めます。 \`n === 1\` のときは空配列 \`[]\` を返します。

\`\`\`js
primeFactors(12);   // → [2, 2, 3]    (12 = 2 × 2 × 3)
primeFactors(100);  // → [2, 2, 5, 5] (100 = 2 × 2 × 5 × 5)
primeFactors(7);    // → [7]
primeFactors(2);    // → [2]
primeFactors(1);    // → []
primeFactors(360);  // → [2, 2, 2, 3, 3, 5]
\`\`\`

## ポイント

- \`i\` を \`2\` から順に試して、 \`n\` が \`i\` で **割り切れる限り何度でも** \`i\` を push しながら \`n\` を \`i\` で割っていきます。
- 内側の \`while\` で「同じ素数で割れる限り割り切る」、 外側の \`while\` で「次の素数候補を試す」 の二重ループになります。
- 効率化として \`i * i <= n\` まで回せば十分です (それより大きい素因数は最後にせいぜい 1 つ残るだけ)。
- ループ後に \`n > 1\` ならその \`n\` 自体が残った素因数なので push します。
`,
  starterFiles: singleFile(`function primeFactors(n) {
  // i = 2 から始めて、 i で割れる限り i を push して n を割り続けてください
  // ループ後に残った n が 1 より大きければそれも push
}
`),
  entryPoints: ["primeFactors"],
  demoCall: `console.log(primeFactors(12));`,
  tests: [
    {
      name: "primeFactors(12) は [2, 2, 3]",
      code: `JSON.stringify(primeFactors(12)) === JSON.stringify([2, 2, 3])`,
    },
    {
      name: "primeFactors(100) は [2, 2, 5, 5]",
      code: `JSON.stringify(primeFactors(100)) === JSON.stringify([2, 2, 5, 5])`,
    },
    {
      name: "primeFactors(7) は [7] (素数)",
      code: `JSON.stringify(primeFactors(7)) === JSON.stringify([7])`,
    },
    {
      name: "primeFactors(2) は [2]",
      code: `JSON.stringify(primeFactors(2)) === JSON.stringify([2])`,
    },
    {
      name: "primeFactors(1) は []",
      code: `JSON.stringify(primeFactors(1)) === JSON.stringify([])`,
    },
    {
      name: "primeFactors(360) は [2, 2, 2, 3, 3, 5]",
      code: `JSON.stringify(primeFactors(360)) === JSON.stringify([2, 2, 2, 3, 3, 5])`,
    },
    {
      name: "primeFactors(97) は [97] (大きい素数)",
      code: `JSON.stringify(primeFactors(97)) === JSON.stringify([97])`,
    },
    {
      name: "primeFactors(8) は [2, 2, 2]",
      code: `JSON.stringify(primeFactors(8)) === JSON.stringify([2, 2, 2])`,
    },
  ],
  hints: [
    "外側 while で i を 2 から増やしながら i * i <= value まで回す。 内側 while で value % i === 0 の間ずっと push して割る。",
    "ループを抜けたあと value > 1 なら最後の素因数として push を忘れずに。",
    "解答例:\n```js\nfunction primeFactors(n) {\n  const factors = [];\n  let value = n;\n  let i = 2;\n  while (i * i <= value) {\n    while (value % i === 0) {\n      factors.push(i);\n      value = value / i;\n    }\n    i = i + 1;\n  }\n  if (value > 1) {\n    factors.push(value);\n  }\n  return factors;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
        { kind: "node", nodeType: "WhileStatement", label: "while で割り切れる限り割る" },
        { kind: "method", name: "push", label: "Array#push で素因数を追加する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function primeFactors(n) {
  const factors = [];
  let value = n;
  let i = 2;
  while (i * i <= value) {
    while (value % i === 0) {
      factors.push(i);
      value = value / i;
    }
    i = i + 1;
  }
  if (value > 1) {
    factors.push(value);
  }
  return factors;
}
`,
  badSolutions: [
    {
      code: `function primeFactors(n) {
  const factors = [];
  let value = n;
  let i = 2;
  while (i <= value) {
    if (value % i === 0) {
      factors.push(i);
      value = value / i;
      i = i + 1;
    } else {
      i = i + 1;
    }
  }
  return factors;
}
`,
      description: "割り切れた直後に i を増やしてしまい、 同じ素因数を 1 度しか push できない (12 → [2, 3] になる)",
    },
    {
      code: `function primeFactors(n) {
  const factors = [];
  let value = n;
  let i = 2;
  while (i * i <= value) {
    while (value % i === 0) {
      factors.push(i);
      value = value / i;
    }
    i = i + 1;
  }
  return factors;
}
`,
      description: "ループ後に残った value > 1 を push し忘れている (7 や 97 のような素数で [] になる)",
    },
    {
      code: `function primeFactors(n) {
  const factors = [];
  let i = 2;
  while (i <= n) {
    if (n % i === 0) {
      factors.push(i);
    }
    i = i + 1;
  }
  return factors;
}
`,
      description: "「割って減らす」 をしておらず、 単に約数を列挙してしまう (12 → [2, 3, 4, 6, 12])",
    },
  ],
  mdnSections: [
    {
      heading: "while 文",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/while",
      pageTitle: "while",
    },
    {
      heading: "Array.prototype.push()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array/push",
      pageTitle: "Array.prototype.push()",
    },
    {
      heading: "剰余 (%)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Remainder",
      pageTitle: "剰余 (%)",
    },
  ],
};
