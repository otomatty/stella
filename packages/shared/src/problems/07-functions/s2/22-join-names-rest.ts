import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch07JoinNamesRest: Assignment = {
  id: "S2-Ch07-432-join-names-rest",
  stage: "S2",
  chapterId: "Ch07",
  sequence: 22,
  title: "残余引数でいくつでも名前を受け取る",
  newConcept: "定義側の ... は「集める」。 中では普通の配列",
  estimatedMinutes: 12,
  difficulty: 2,
  testKind: "function",
  language: "typescript",
  description: `## やること

いくつでも文字列を受け取り、 **読点 (\`、\`) でつないで** 返す関数 \`joinNames\` を作ってください。 **残余引数** と \`for-of\` を使ってください。

\`\`\`ts
joinNames("田中", "佐藤", "鈴木"); // → "田中、佐藤、鈴木"
\`\`\`

## 期待する挙動

- 渡された名前を、 渡された順に読点でつなぎます。
- 先頭と末尾に余分な読点は付きません。
- 名前が 1 つだけのときは、 その名前だけを返します。 1 つも渡されなかったときは空の文字列を返します。

## ポイント

- 残余引数は \`(...names: string[])\` のように書きます。 型注釈は **配列の型** です。
- 関数の中では普通の配列なので、 \`for-of\` も \`length\` もそのまま使えます。
- 1 件目だけ読点を付けない分岐が必要です。 つなぎ先の変数は再代入するので \`let\` にします。
`,
  starterFiles: singleFile(
    `// 文字列をいくつでも受け取る関数 joinNames を作る (残余引数)
// for-of で 1 件ずつ読点でつないだ文字列を組み立てて return する

`,
    "main.ts",
  ),
  entryPoints: ["joinNames"],
  demoCall: `console.log(joinNames("田中", "佐藤", "鈴木"));`,
  tests: [
    {
      name: "3 件を読点でつなぐ",
      code: `joinNames("田中", "佐藤", "鈴木") === "田中、佐藤、鈴木"`,
    },
    {
      name: "2 件でも余分な読点が付かない",
      code: `joinNames("山田", "高橋") === "山田、高橋"`,
    },
    {
      name: "1 件ならその名前だけ",
      code: `joinNames("田中") === "田中"`,
    },
    {
      name: "0 件なら空文字",
      code: `joinNames() === ""`,
    },
  ],
  hints: [
    "引数のかっこの中にドット 3 つを書くと、 渡された値がまとめて 1 つの配列になります。 型注釈は配列の型で書きます。",
    "つなぐ先の変数を空文字で用意し、 `for-of` で 1 件ずつ足していきます。 まだ空のときだけ読点を付けない、 という分岐を入れてください。",
    '解答例:\n```ts\nconst joinNames = (...names: string[]): string => {\n  let result = "";\n  for (const name of names) {\n    if (result === "") {\n      result = name;\n    } else {\n      result = `${result}、${name}`;\n    }\n  }\n  return result;\n};\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ForOfStatement", label: "for-of を使う" },
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const joinNames = (...names: string[]): string => {
  let result = "";
  for (const name of names) {
    if (result === "") {
      result = name;
    } else {
      result = \`\${result}、\${name}\`;
    }
  }
  return result;
};
`,
  badSolutions: [
    {
      code: `const joinNames = (...names: string[]): string => {
  let result = "";
  for (const name of names) {
    result = \`\${result}、\${name}\`;
  }
  return result;
};
`,
      description:
        "1 件目にも読点を付けてしまうため、 先頭に余分な「、」が残る",
    },
  ],
  mdnSections: [{ heading: "残余引数" }, { heading: "関数の引数" }],
};
