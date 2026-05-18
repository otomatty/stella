import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07GradingCapstone: Assignment = {
  id: "S2-Ch07-16-grading-capstone",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 16,
  title: "[チャレンジ] 成績判定を関数で書く",
  newConcept: "S2 で習った関数 / ループ / 条件分岐 / 文字列を統合する",
  estimatedMinutes: 15,
  difficulty: 3,
  testKind: "stdout",
  isCapstone: true,
  description: `## やること

成績の点数配列を受け取り、 各点数に対する **評価** を 1 行ずつ出力する **チャレンジ問題** です。

\`function gradeOf(score)\` を作り:
- 80 以上: \`"A"\`
- 60 以上 80 未満: \`"B"\`
- それ未満: \`"C"\`

\`function reportAll(scores)\` を作り、 配列の各要素を for ループで巡って \`\${score}: \${gradeOf(score)}\` の形で出力します。

\`reportAll([95, 72, 50])\` を呼んで結果を確認してください。

## 期待する出力

\`\`\`
95: A
72: B
50: C
\`\`\`

## ポイント

- 関数を **役割で分割** します: \`gradeOf\` (1 件の判定) と \`reportAll\` (全件の処理)。
- \`reportAll\` の中で for ループと \`gradeOf\` 呼び出しを組み合わせます。
- 出力はテンプレートリテラルを使います。
`,
  starterFiles: singleFile(`// 1 つ目の関数: 点数を引数に取り、 説明文の閾値に応じた評価ラベルを return する
// (3 段階を if で 2 回早期 return → 残りはそのまま return)


// 2 つ目の関数: 点数の配列を引数に取り、 for ループで各点数を 1 つ目の関数に渡して
// テンプレートリテラルで「点数: ラベル」 形式の文字列を console.log で出力する


// 2 つ目の関数に説明文の配列を渡して呼び出す

`),
  tests: [
    {
      name: "stdout が 3 行の成績判定になる",
      expectedStdout: "95: A\n72: B\n50: C",
    },
  ],
  hints: [
    "`gradeOf(score)` は早期 return で 3 段階の評価を返します。",
    "`reportAll(scores)` は for ループで全要素を巡り、 テンプレートリテラルで出力します。",
    "解答例:\n```js\nfunction gradeOf(score) {\n  if (score >= 80) {\n    return \"A\";\n  }\n  if (score >= 60) {\n    return \"B\";\n  }\n  return \"C\";\n}\nfunction reportAll(scores) {\n  for (let i = 0; i < scores.length; i++) {\n    console.log(`${scores[i]}: ${gradeOf(scores[i])}`);\n  }\n}\nreportAll([95, 72, 50]);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "FunctionDeclaration", label: "function 宣言を使う" },
        { kind: "node", nodeType: "ForStatement", label: "for ループを使う" },
        { kind: "node", nodeType: "IfStatement", label: "if 文を使う" },
        { kind: "node", nodeType: "TemplateLiteral", label: "テンプレートリテラルで出力する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "console-log", argument: { kind: "string", value: "95: A" }, label: "出力を文字列リテラルで直接書かない" },
        { kind: "console-log", argument: { kind: "string", value: "72: B" }, label: "出力を文字列リテラルで直接書かない" },
        { kind: "console-log", argument: { kind: "string", value: "50: C" }, label: "出力を文字列リテラルで直接書かない" },
        { kind: "console-log", argument: { kind: "binary", operator: "+" }, label: "文字列連結で出力を直接組み立てない" },
      ],
    },
  },
  solution: "function gradeOf(score) {\n  if (score >= 80) {\n    return \"A\";\n  }\n  if (score >= 60) {\n    return \"B\";\n  }\n  return \"C\";\n}\nfunction reportAll(scores) {\n  for (let i = 0; i < scores.length; i++) {\n    console.log(`${scores[i]}: ${gradeOf(scores[i])}`);\n  }\n}\nreportAll([95, 72, 50]);\n",
  badSolutions: [
    {
      code: `console.log("95: A");
console.log("72: B");
console.log("50: C");
`,
      description: "関数・ループを使わず結果を直接出力している",
    },
  ],
  mdnSections: [
    { heading: "function 宣言", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function", pageTitle: "function 宣言" },
    { heading: "for 文", pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/for", pageTitle: "for 文" },
  ],
};
