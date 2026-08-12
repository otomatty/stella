import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch09BracketAllMap: Assignment = {
  id: "S2-Ch09-451-bracket-all-map",
  stage: "S2",
  chapterId: "Ch09",
  sequence: 1,
  title: "map で全要素を飾り付けた新しい配列を作る",
  newConcept: "map は要素数を変えずに中身だけ変換する",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

商品名の配列を受け取り、 すべてを \`【\` と \`】\` で囲んだ **新しい配列** を返す関数 \`bracketAll\` を作ってください。 \`map\` を使ってください。

\`\`\`ts
bracketAll(["コーヒー", "紅茶", "緑茶"]);
// → ["【コーヒー】", "【紅茶】", "【緑茶】"]
\`\`\`

## 期待する挙動

- 要素数は変わりません。 並び順もそのままです。
- **受け取った配列は変更しません。** 返すのは新しい配列です。
- 空の配列を渡したときは、 空の配列を返します。

## ポイント

- \`map\` は配列の各要素にコールバックを適用し、 返した値を要素とする新しい配列を作ります。
- \`map\` のコールバックが返すのは **変換後の値** です。 残すかどうかの真偽値ではありません。
- \`map\` は元の配列を変更しません。 元の配列の要素を直接書き換えると、 呼び出し側の配列まで変わってしまいます。
`,
  starterFiles: singleFile(
    `// 文字列の配列を受け取り、 各要素を【】で囲んだ新しい配列を返す関数 bracketAll を作る
// map を使うこと

`,
    "main.ts",
  ),
  entryPoints: ["bracketAll"],
  demoCall: `console.log(bracketAll(["コーヒー", "紅茶", "緑茶"]));`,
  tests: [
    {
      name: "3 件すべてが囲まれる",
      code: `JSON.stringify(bracketAll(["コーヒー", "紅茶", "緑茶"])) === '["【コーヒー】","【紅茶】","【緑茶】"]'`,
    },
    {
      name: "1 件でも動く",
      code: `JSON.stringify(bracketAll(["水"])) === '["【水】"]'`,
    },
    {
      name: "空の配列なら空の配列",
      code: `(() => { const r = bracketAll([]); return Array.isArray(r) && r.length === 0; })()`,
    },
    {
      name: "元の配列は変更されない",
      code: `(() => { const src = ["コーヒー", "紅茶"]; bracketAll(src); return JSON.stringify(src) === '["コーヒー","紅茶"]'; })()`,
    },
  ],
  hints: [
    "配列に対してドットで `map` を呼び、 かっこの中に「1 件をどう変換するか」を書いた関数を渡します。",
    "コールバックが返した値が、 新しい配列の要素になります。 変換した配列をそのまま `return` してください。",
    "解答例:\n```ts\nconst bracketAll = (names: string[]): string[] => {\n  return names.map((name) => `【${name}】`);\n};\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "method", name: "map", label: "map を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で配列を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const bracketAll = (names: string[]): string[] => {
  return names.map((name) => \`【\${name}】\`);
};
`,
  badSolutions: [
    {
      code: `const bracketAll = (names: string[]): string[] => {
  for (let i = 0; i < names.length; i++) {
    names[i] = \`【\${names[i]}】\`;
  }
  return names;
};
`,
      description:
        "新しい配列を作らず元の配列を直接書き換えているため、 呼び出し側の配列まで変わってしまう",
    },
  ],
  mdnSections: [{ heading: "反復処理メソッド" }, { heading: "インスタンスメソッド" }],
};
