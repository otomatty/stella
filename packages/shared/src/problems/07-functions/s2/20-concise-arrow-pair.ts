import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07ConciseArrowPair: Assignment = {
  id: "S2-Ch07-422-concise-arrow-pair",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 20,
  title: "中かっこと return を省いた 1 行のアロー関数",
  newConcept: "式が 1 つだけなら中かっこと return を省略できる",
  estimatedMinutes: 8,
  difficulty: 1,
  testKind: "function",
  language: "typescript",
  description: `## やること

次の 2 つのアロー関数を、 **中かっこと \`return\` を省いた 1 行の形** で書いてください。

\`\`\`ts
const toUpperLabel = (name: string): string => {
  return \`【\${name}】\`;
};

const calcTax = (price: number): number => {
  return price * 0.1;
};
\`\`\`

## 期待する挙動

- \`toUpperLabel\` は受け取った文字列を \`【\` と \`】\` で挟んで返します。
- \`calcTax\` は受け取った価格の 10% を返します。
- 省略形にしても、 呼び出したときの結果は上のコードとまったく同じです。

## ポイント

- 処理が **式 1 つだけ** のときに限り、 中かっこと \`return\` を省けます。 省略すると、 その式の結果が自動で返ります。
- 省略形では \`return\` を書けません。 \`=> return ...\` と書くと構文エラーになります。
- 省略しても戻り値の型注釈 (\`: string\` / \`: number\`) はそのまま残せます。
`,
  starterFiles: singleFile(
    `// 下の 2 つを、 中かっこと return を省いた 1 行の形で書いてください。
//
// const toUpperLabel = (name: string): string => {
//   return \`【\${name}】\`;
// };
//
// const calcTax = (price: number): number => {
//   return price * 0.1;
// };

`,
    "main.ts",
  ),
  entryPoints: ["toUpperLabel", "calcTax"],
  demoCall: `console.log(toUpperLabel("コーヒー"), calcTax(1000));`,
  tests: [
    {
      name: 'toUpperLabel("コーヒー") は "【コーヒー】"',
      code: `toUpperLabel("コーヒー") === "【コーヒー】"`,
    },
    {
      name: "calcTax(1000) は 100",
      code: `calcTax(1000) === 100`,
    },
    {
      name: "calcTax(2000) は 200",
      code: `calcTax(2000) === 200`,
    },
    {
      name: "calcTax(0) は 0",
      code: `calcTax(0) === 0`,
    },
    {
      name: "どちらも関数として呼び出せる",
      code: `typeof toUpperLabel === "function" && typeof calcTax === "function"`,
    },
  ],
  hints: [
    "中かっこの中に残るのが 1 つの式だけなら、 `=>` のうしろにその式を直接書けます。",
    "`return` という語は書きません。 式そのものを `=>` の右に置くと、 その結果が返り値になります。",
    "解答例:\n```ts\nconst toUpperLabel = (name: string): string => `【${name}】`;\n\nconst calcTax = (price: number): number => price * 0.1;\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数で書く" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const toUpperLabel = (name: string): string => \`【\${name}】\`;

const calcTax = (price: number): number => price * 0.1;
`,
  badSolutions: [
    {
      code: `const toUpperLabel = (name: string): string => return \`【\${name}】\`;

const calcTax = (price: number): number => return price * 0.1;
`,
      description:
        "省略形なのに return を書いてしまい構文エラーになる (省略形では式だけを書く)",
    },
  ],
  mdnSections: [{ heading: "アロー関数" }, { heading: "短縮形の関数" }],
};
