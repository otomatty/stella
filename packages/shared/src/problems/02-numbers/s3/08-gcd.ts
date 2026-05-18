import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch02Gcd: Assignment = {
  id: "S3-Ch02-08-gcd",
  stage: "S3",
  chapterId: "Ch02",
  sequence: 8,
  title: "ユークリッド互除法で最大公約数を求める",
  newConcept: "ループで剰余を更新して GCD を計算する",
  estimatedMinutes: 20,
  difficulty: 3,
  testKind: "function",
  description: `## やること

2 つの正の整数 \`a\`, \`b\` を受け取り、 その最大公約数 (GCD) を返す関数 \`gcd\` を実装してください。

\`\`\`js
gcd(12, 8);    // → 4
gcd(15, 5);    // → 5
gcd(7, 3);     // → 1
gcd(100, 75);  // → 25
\`\`\`

## ポイント

- **ユークリッド互除法**: \`b\` が 0 でない間、 \`(a, b)\` を \`(b, a % b)\` に置き換え続ける。 \`b\` が 0 になったときの \`a\` が GCD。
- ループでも再帰でも書けます。 ループの方がスタック消費がなく安全です。
`,
  starterFiles: singleFile(`function gcd(a, b) {
  // ここを実装してください
}
`),
  entryPoints: ["gcd"],
  demoCall: `console.log(gcd(12, 8));`,
  tests: [
    { name: "gcd(12, 8) は 4", code: `gcd(12, 8) === 4` },
    { name: "gcd(15, 5) は 5", code: `gcd(15, 5) === 5` },
    { name: "gcd(7, 3) は 1", code: `gcd(7, 3) === 1` },
    { name: "gcd(100, 75) は 25", code: `gcd(100, 75) === 25` },
    { name: "gcd(48, 18) は 6", code: `gcd(48, 18) === 6` },
    { name: "gcd(1, 1) は 1", code: `gcd(1, 1) === 1` },
  ],
  hints: [
    "while (b !== 0) { [a, b] = [b, a % b]; } の形で書ける。",
    "解答例:\n```js\nfunction gcd(a, b) {\n  while (b !== 0) {\n    const temp = a % b;\n    a = b;\n    b = temp;\n  }\n  return a;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で GCD を返す" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
      ],
    },
  },
  solution: `function gcd(a, b) {
  let x = a;
  let y = b;
  while (y !== 0) {
    const temp = x % y;
    x = y;
    y = temp;
  }
  return x;
}
`,
  badSolutions: [
    {
      code: `function gcd(a, b) {
  return a < b ? a : b;
}
`,
      description: "単に小さい方を返している (gcd(12, 8) = 8 になり fail)",
    },
    {
      code: `function gcd(a, b) {
  return 1;
}
`,
      description: "常に 1 を返している",
    },
  ],
  mdnSections: [
    {
      heading: "剰余 (%)",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Remainder",
      pageTitle: "剰余 (%)",
    },
  ],
};
