import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07FixUseBeforeDeclaration: Assignment = {
  id: "S3-Ch07-423-fix-use-before-declaration",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 10,
  title: "宣言より前でアロー関数を呼べない",
  newConcept: "アロー関数は変数なので、 宣言より前では使えない",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

次のコードはエラーになります。 **関数の書き方は変えずに (アロー関数のまま)** 直してください。

\`\`\`ts
const area = calcArea(3, 4);

const calcArea = (width: number, height: number): number => {
  return width * height;
};
\`\`\`

「Block-scoped variable 'calcArea' used before its declaration.」というエラーです。 アロー関数は **変数に関数を代入している** 形なので、 宣言より前の行では使えません。

## 期待する挙動

- \`calcArea\` は幅と高さを掛けた値を返します。
- \`area\` には \`calcArea(3, 4)\` の結果が入ります。

## ポイント

- 定義より前の行で呼び出せるのは **関数宣言 (\`function ...\`)** だけです。 これは関数宣言が巻き上げられるためです。
- 関数式とアロー関数は変数なので、 巻き上げの対象になりません。 宣言に到達する前に使うとエラーになります。
- \`const\` を \`let\` に変えても解決しません。 どちらも宣言に到達するまで使えないからです。
`,
  starterFiles: singleFile(
    `// 下のコードはエラーになります。 アロー関数のまま直してください。

const area = calcArea(3, 4);

const calcArea = (width: number, height: number): number => {
  return width * height;
};
`,
    "main.ts",
  ),
  entryPoints: ["calcArea", "area"],
  demoCall: `console.log(area);`,
  tests: [
    { name: "area は 12 になる", code: `area === 12` },
    { name: "calcArea(5, 6) は 30", code: `calcArea(5, 6) === 30` },
    { name: "calcArea(0, 7) は 0", code: `calcArea(0, 7) === 0` },
    {
      name: "calcArea は関数として呼び出せる",
      code: `typeof calcArea === "function"`,
    },
  ],
  hints: [
    "エラーメッセージの「used before its declaration」は「宣言より前で使っている」という意味です。 コードのどの行が先に実行されるかを目で追ってください。",
    "関数の中身も名前も変える必要はありません。 変えるのは **2 つの文の順番** だけです。",
    "解答例:\n```ts\nconst calcArea = (width: number, height: number): number => {\n  return width * height;\n};\n\nconst area = calcArea(3, 4);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ArrowFunctionExpression", label: "アロー関数のまま直す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const calcArea = (width: number, height: number): number => {
  return width * height;
};

const area = calcArea(3, 4);
`,
  badSolutions: [
    {
      code: `let area = calcArea(3, 4);

const calcArea = (width: number, height: number): number => {
  return width * height;
};
`,
      description:
        "const を let に変えただけで順番を直していないため、 宣言に到達する前の呼び出しで止まる",
    },
  ],
  mdnSections: [{ heading: "関数の巻き上げ" }, { heading: "関数式" }],
};
