import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02IsPrime: Assignment = {
  id: "S3-Ch02-04-is-prime",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 4,
  title: "素数判定",
  newConcept: "for ループ + 早期 return で判定する",
  estimatedMinutes: 20,
  difficulty: 2,
  testKind: "function",
  description: `## やること

整数 \`n\` を受け取り、 素数なら \`true\`、 そうでなければ \`false\` を返す関数 \`isPrime\` を実装してください。

\`\`\`js
isPrime(2);   // → true
isPrime(7);   // → true
isPrime(1);   // → false  (1 は素数ではない)
isPrime(0);   // → false
isPrime(9);   // → false  (9 = 3 × 3)
isPrime(13);  // → true
\`\`\`

## ポイント

- 1 以下は素数ではないので、 最初に \`if (n < 2) return false;\` で弾きます。
- 2 以上のとき、 \`i\` を 2 から \`Math.sqrt(n)\` まで動かして、 \`n % i === 0\` のものがあれば素数ではない (\`return false\`)。
- ループが終わるまで割り切れなければ素数 (\`return true\`)。
`,
  starterFiles: singleFile(`function isPrime(n) {
  // ここを実装してください
}
`),
  entryPoints: ["isPrime"],
  demoCall: `console.log(isPrime(7));`,
  tests: [
    { name: "isPrime(2) は true", code: `isPrime(2) === true` },
    { name: "isPrime(7) は true", code: `isPrime(7) === true` },
    { name: "isPrime(1) は false", code: `isPrime(1) === false` },
    { name: "isPrime(0) は false", code: `isPrime(0) === false` },
    { name: "isPrime(-5) は false", code: `isPrime(-5) === false` },
    { name: "isPrime(9) は false", code: `isPrime(9) === false` },
    { name: "isPrime(13) は true", code: `isPrime(13) === true` },
    { name: "isPrime(97) は true", code: `isPrime(97) === true` },
    { name: "isPrime(100) は false", code: `isPrime(100) === false` },
  ],
  hints: [
    "1 以下は素数ではないので最初に弾く。",
    "i を 2 から sqrt(n) まで動かして割り切れたら false を return。",
    "解答例:\n```js\nfunction isPrime(n) {\n  if (n < 2) return false;\n  for (let i = 2; i * i <= n; i++) {\n    if (n % i === 0) return false;\n  }\n  return true;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isPrime(n) {
  if (n < 2) {
    return false;
  }
  for (let i = 2; i * i <= n; i++) {
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
  return n > 1;
}
`,
      description: "1 より大きい数を全部素数扱いしている (4, 6, 9 等で fail)",
    },
    {
      code: `function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i < n; i++) {
    if (n % i === 0) return false;
  }
  return false;
}
`,
      description: "ループ終了後に false を返していて全部 false になる",
    },
  ],
  mdnSections: [
    {
      heading: "Math.sqrt()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt",
      pageTitle: "Math.sqrt()",
    },
  ],
};
