import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch02BmiCapstone: Assignment = {
  id: "S1-Ch02-13-bmi-capstone",
  stage: "S1",
  chapterId: "Ch02",
  sequence: 13,
  title: "[チャレンジ] BMI を計算する",
  newConcept: "S1 で習った変数 / 数値演算 / Math / テンプレートリテラルを統合する",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  isCapstone: true,
  description: `## やること

身長と体重から BMI を計算して、 整数 (= 四捨五入後) で出力する **チャレンジ問題** です。

次の値を const で持たせてください。

- \`heightM\` (身長メートル): \`1.70\`
- \`weightKg\` (体重キログラム): \`65\`

BMI の計算式:

\`\`\`
BMI = 体重 ÷ (身長 × 身長)
\`\`\`

計算結果を \`Math.round\` で四捨五入し、 テンプレートリテラルで \`"BMI: 22"\` の形に組み立てて出力してください。

## 期待する出力

\`\`\`
BMI: 22
\`\`\`

## ヒント

- 身長の 2 乗は \`heightM ** 2\` または \`heightM * heightM\` で計算できます。
- 計算結果はそのままだと小数になるので、 \`Math.round(...)\` で整数に丸めます。
- テンプレートリテラルで \`\` \`BMI: \${bmi}\` \`\` のように埋め込みます。
`,
  starterFiles: singleFile(`// 身長 (m) と体重 (kg) を const の変数に入れる


// 体重 ÷ 身長の 2 乗 で BMI を計算し、 Math.round で整数に丸めた結果を const の変数に入れる


// テンプレートリテラルで「BMI: ...」 形式の文字列を組み立てて console.log で出力する

`),
  tests: [
    {
      name: "stdout が BMI: 22 になる",
      expectedStdout: "BMI: 22",
    },
  ],
  hints: [
    "身長と体重を const で受け取り、 BMI を計算する変数 `bmi` を作ります。",
    "`Math.round(weightKg / (heightM ** 2))` で四捨五入された整数 BMI が得られます。 出力はテンプレートリテラルを使います。",
    "解答例:\n```js\nconst heightM = 1.70;\nconst weightKg = 65;\nconst bmi = Math.round(weightKg / (heightM ** 2));\nconsole.log(`BMI: ${bmi}`);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "round", label: "Math.round で四捨五入する" },
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラルで出力する",
        },
      ],
    },
  },
  solution: "const heightM = 1.70;\nconst weightKg = 65;\nconst bmi = Math.round(weightKg / (heightM ** 2));\nconsole.log(`BMI: ${bmi}`);\n",
  badSolutions: [
    {
      code: "console.log(`BMI: 22`);\n",
      description: "計算式を書かず結果を直接出力している",
    },
    {
      code: `const heightM = 1.70;
const weightKg = 65;
const bmi = weightKg / (heightM ** 2);
console.log("BMI: " + bmi);
`,
      description: "Math.round で四捨五入していない (小数のまま出力)",
    },
  ],
  mdnSections: [
    { heading: "Math.round()" },
    { heading: "テンプレートリテラル" },
  ],
};
