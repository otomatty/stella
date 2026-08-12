import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s3Ch07OptionsObjectSearch: Assignment = {
  id: "S3-Ch07-463-options-object-search",
  stage: "S3",
  chapterId: "Ch07",
  sequence: 13,
  title: "並んだ引数を Options Object にまとめる",
  newConcept: "オプショナルプロパティ + 分割代入の既定値",
  estimatedMinutes: 15,
  difficulty: 3,
  testKind: "function",
  language: "typescript",
  description: `## やること

次の関数は引数が 4 つあり、 呼び出し側を見ても \`false\` や \`true\` が何を指すのか分かりません。 **Options Object パターン** に書き換えてください。

\`\`\`ts
const search = (
  keyword: string,
  limit: number,
  ascending: boolean,
  saleOnly: boolean
): string => {
  return \`\${keyword} / \${limit} / \${ascending} / \${saleOnly}\`;
};
\`\`\`

書き換え後は **オブジェクトを 1 つだけ** 受け取ります。 既定値は次のとおりです。

| 項目 | 省略 | 既定値 |
| --- | --- | --- |
| \`keyword\` | 不可 | — |
| \`limit\` | 可 | \`10\` |
| \`ascending\` | 可 | \`true\` |
| \`saleOnly\` | 可 | \`false\` |

返す文字列の形 (\`キーワード / 件数 / 昇順か / セール品のみか\` をスラッシュで区切る) は変えません。

## 期待する挙動

- \`keyword\` だけを渡すと、 残りの 3 つは既定値になります。
- 一部だけ渡すこともできます。 渡した項目はその値が、 渡さなかった項目は既定値が使われます。
- 4 つすべて渡したときは、 渡した値がそのまま並びます。

## ポイント

- 型の側で \`?\` を付けて省略可能にし、 分割代入の側で \`= 値\` と既定値を書きます。 この 2 つを組み合わせます。
- 元の形では \`search("コーヒー", 20, false, true)\` の \`false\` と \`true\` が何を意味するのか呼び出し側から分かりません。 しかも型が同じなので、 順番を入れ替えてもエラーになりません。
- Options Object にすると名前付きで渡せるうえ、 既定値のある項目は省略できます。
- 引数が 3 つを超えたとき、 または同じ型の真偽値が並ぶときが切り替えの目安です。
`,
  starterFiles: singleFile(
    `// 下の関数を Options Object パターンに書き換えてください。
// オブジェクトを 1 つだけ受け取り、 limit / ascending / saleOnly は省略できるようにします。

const search = (
  keyword: string,
  limit: number,
  ascending: boolean,
  saleOnly: boolean
): string => {
  return \`\${keyword} / \${limit} / \${ascending} / \${saleOnly}\`;
};
`,
    "main.ts",
  ),
  entryPoints: ["search"],
  demoCall: `console.log(search({ keyword: "コーヒー" }));`,
  tests: [
    {
      name: "キーワードだけ渡すと残りは既定値になる",
      code: `search({ keyword: "コーヒー" }) === "コーヒー / 10 / true / false"`,
    },
    {
      name: "4 つすべて渡すとその値が並ぶ",
      code: `search({ keyword: "コーヒー", limit: 20, ascending: false, saleOnly: true }) === "コーヒー / 20 / false / true"`,
    },
    {
      name: "一部だけ渡すと残りは既定値になる",
      code: `search({ keyword: "紅茶", saleOnly: true }) === "紅茶 / 10 / true / true"`,
    },
    {
      name: "件数だけ変えても他は既定値のまま",
      code: `search({ keyword: "緑茶", limit: 3 }) === "緑茶 / 3 / true / false"`,
    },
  ],
  hints: [
    "まず引数をまとめる型を作ります。 省略できる項目のプロパティ名にはクエスチョンマークを付けます。",
    "関数の引数は中かっこ 1 つにまとめ、 その中で省略できる項目に `= 既定値` を書きます。 返す文字列は元のまま変えません。",
    '解答例:\n```ts\ntype SearchOptions = {\n  keyword: string;\n  limit?: number;\n  ascending?: boolean;\n  saleOnly?: boolean;\n};\n\nconst search = ({\n  keyword,\n  limit = 10,\n  ascending = true,\n  saleOnly = false,\n}: SearchOptions): string => {\n  return `${keyword} / ${limit} / ${ascending} / ${saleOnly}`;\n};\n```',
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で値を返す" },
      ],
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `type SearchOptions = {
  keyword: string;
  limit?: number;
  ascending?: boolean;
  saleOnly?: boolean;
};

const search = ({
  keyword,
  limit = 10,
  ascending = true,
  saleOnly = false,
}: SearchOptions): string => {
  return \`\${keyword} / \${limit} / \${ascending} / \${saleOnly}\`;
};
`,
  badSolutions: [
    {
      code: `type SearchOptions = {
  keyword: string;
  limit?: number;
  ascending?: boolean;
  saleOnly?: boolean;
};

const search = ({
  keyword,
  limit,
  ascending,
  saleOnly,
}: SearchOptions): string => {
  return \`\${keyword} / \${limit} / \${ascending} / \${saleOnly}\`;
};
`,
      description:
        "型を省略可能にしただけで分割代入の既定値を書いていないため、 省略した項目が undefined のまま並ぶ",
    },
  ],
  mdnSections: [
    {
      heading: "既定値",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring",
      pageTitle: "構造分解 (分割代入)",
    },
    { heading: "関数の引数" },
  ],
};
