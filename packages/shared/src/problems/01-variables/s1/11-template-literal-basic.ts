import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

const description = [
  "## やること",
  "",
  "`name` に `\"花子\"` を入れて、 テンプレートリテラルで `\"こんにちは、 花子さん!\"` という文を組み立てて出力してください。",
  "",
  "## 期待する出力",
  "",
  "```",
  "こんにちは、 花子さん!",
  "```",
  "",
  "## ポイント",
  "",
  "- テンプレートリテラルは **バッククォート** で囲みます (Esc キーの下、 半角・全角の左にあるキー)。",
  "- バッククォートは `` ` `` という記号で、 通常の文字列で使う `\"` や `'` とは別物です。",
  "- バッククォートで囲んだ文字列の中で `${変数名}` と書くと、 そこに変数の値が埋め込まれます。",
  "- 例: バッククォートで囲んだ `Hello, ${name}!` は、 `name` が `\"Bob\"` なら `\"Hello, Bob!\"` になります。",
  "",
].join("\n");

export const s1Ch01TemplateLiteralBasic: Assignment = {
  id: "S1-Ch01-11-template-literal-basic",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 11,
  title: "テンプレートリテラルで変数を埋め込む",
  newConcept: "バッククォートで囲んだ文字列の中で ${変数} と書くと値が埋め込まれる",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  description,
  starterFiles: singleFile(`// 名前の文字列を const の変数に入れる


// バッククォートで囲んだテンプレートリテラルで挨拶文を組み立て、
// 別の const の変数に入れる (\${変数名} で値を埋め込む)


// 組み立てた文の変数を console.log で出力する

`),
  tests: [
    {
      name: "stdout が テンプレートで組み立てた文になる",
      expectedStdout: "こんにちは、 花子さん!",
    },
  ],
  hints: [
    "通常の `\"...\"` ではなく、 バッククォートで囲んだ文字列を使います。",
    "変数を埋め込むには `${name}` のように `${ }` で名前を囲みます。",
    "解答例:\n```js\nconst name = \"花子\";\nconst message = `こんにちは、 ${name}さん!`;\nconsole.log(message);\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        {
          kind: "node",
          nodeType: "TemplateLiteral",
          label: "テンプレートリテラル (バッククォート) を使う",
        },
      ],
    },
  },
  solution: "const name = \"花子\";\nconst message = `こんにちは、 ${name}さん!`;\nconsole.log(message);\n",
  badSolutions: [
    {
      code: `const name = "花子";
const message = "こんにちは、 " + name + "さん!";
console.log(message);
`,
      description: "テンプレートリテラルではなく + で連結している",
    },
  ],
  mdnSections: [
    {
      heading: "テンプレートリテラル",
      pageUrl:
        "https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Text_formatting",
      pageTitle: "数値と文字列",
    },
  ],
};
