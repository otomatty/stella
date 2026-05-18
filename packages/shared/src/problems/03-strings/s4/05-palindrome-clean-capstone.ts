import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s4Ch03PalindromeCleanCapstone: Assignment = {
  id: "S4-Ch03-05-palindrome-clean-capstone",
  stage: "S4",
  chapterId: "Ch03",
  sequence: 5,
  title: "[卒業課題] 記号・空白・大小を無視した回文判定",
  newConcept: "正規化 (lower-case 化 → 不要文字の除去) → 反転比較、 という前処理つきパイプライン",
  estimatedMinutes: 35,
  difficulty: 3,
  testKind: "function",
  isCapstone: true,
  description: `## やること

文字列 \`s\` を受け取り、 **英数字以外を無視し、 大文字小文字も無視した上で** 回文 (前から読んでも後ろから読んでも同じ) なら \`true\`、 そうでなければ \`false\` を返す関数 \`isCleanPalindrome\` を実装してください。

\`\`\`js
isCleanPalindrome("A man, a plan, a canal: Panama");
// → true   (a-m-a-n-a-p-l-a-n-a-c-a-n-a-l-p-a-n-a-m-a は回文)

isCleanPalindrome("Was it a car or a cat I saw?");   // → true
isCleanPalindrome("race a car");                      // → false
isCleanPalindrome("");                                 // → true   (空は回文扱い)
isCleanPalindrome("a.");                               // → true   (記号除去で "a")
isCleanPalindrome("12321");                            // → true
isCleanPalindrome("0P");                               // → false  (小文字化すると "0p" vs "p0")
\`\`\`

## ポイント

- **これは S4 卒業課題のひとつ**。 単純な回文判定 (S3 で実装済み) を、 **「前処理 → 本処理」 のパイプライン** に拡張するのが本問題の核。
- 推奨フロー:
  1. \`toLowerCase()\` で全部小文字に揃える
  2. \`replace(/[^a-z0-9]/g, "")\` で **英数字以外を全部削除** する
  3. 残った文字列を **\`split("").reverse().join("")\`** で反転し、 元と比較する
- AST で **\`toLowerCase\` の使用** と **\`replace\` の使用** を必須にしているので、 大小を意識せずに比較するだけの実装は通りません。 また \`replace\` を使う以上、 削除対象を表すのには **正規表現リテラル** (\`/[^a-z0-9]/g\` のように \`g\` フラグつき) を使うのが自然です。
- 空文字列・記号だけの入力 (例: \`"!"\`) は **正規化後に空になる** ので true 扱いになります。
`,
  starterFiles: singleFile(`function isCleanPalindrome(s) {
  // 小文字化 → 英数字以外を削除 → 反転して比較してください
}
`),
  entryPoints: ["isCleanPalindrome"],
  demoCall: `console.log(isCleanPalindrome("A man, a plan, a canal: Panama"));`,
  tests: [
    {
      name: '"A man, a plan, a canal: Panama" は true',
      code: `isCleanPalindrome("A man, a plan, a canal: Panama") === true`,
    },
    {
      name: '"Was it a car or a cat I saw?" は true',
      code: `isCleanPalindrome("Was it a car or a cat I saw?") === true`,
    },
    {
      name: '"race a car" は false',
      code: `isCleanPalindrome("race a car") === false`,
    },
    {
      name: '空文字列は true',
      code: `isCleanPalindrome("") === true`,
    },
    {
      name: '"a." は true (記号を除去すると "a")',
      code: `isCleanPalindrome("a.") === true`,
    },
    {
      name: '"12321" は true (数字も回文の対象)',
      code: `isCleanPalindrome("12321") === true`,
    },
    {
      name: '"0P" は false (小文字化で "0p")',
      code: `isCleanPalindrome("0P") === false`,
    },
    {
      name: '"!" は true (正規化後に空文字列)',
      code: `isCleanPalindrome("!") === true`,
    },
    {
      name: '"abba" は true',
      code: `isCleanPalindrome("abba") === true`,
    },
    {
      name: '"Hello" は false',
      code: `isCleanPalindrome("Hello") === false`,
    },
    {
      name: "戻り値は真偽値",
      code: `typeof isCleanPalindrome("a") === "boolean"`,
    },
  ],
  hints: [
    "(1) toLowerCase で小文字化 (2) replace(/[^a-z0-9]/g, \"\") で英数字以外を除去 (3) split → reverse → join で反転して比較。",
    "解答例:\n```js\nfunction isCleanPalindrome(s) {\n  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, \"\");\n  const reversed = cleaned.split(\"\").reverse().join(\"\");\n  return cleaned === reversed;\n}\n```",
  ],
  staticAnalysis: {
    ast: {
      required: [
        { kind: "node", nodeType: "ReturnStatement", label: "return で真偽値を返す" },
        { kind: "method", name: "toLowerCase", label: "toLowerCase で大小を揃える" },
        { kind: "method", name: "replace", label: "replace で英数字以外を除去する" },
      ],
      forbidden: [
        { kind: "var", label: "var を使わない" },
        { kind: "loose-eq", label: "== / != を使わない" },
      ],
    },
  },
  solution: `function isCleanPalindrome(s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const reversed = cleaned.split("").reverse().join("");
  return cleaned === reversed;
}
`,
  badSolutions: [
    {
      code: `function isCleanPalindrome(s) {
  return s === s.split("").reverse().join("");
}
`,
      description: "正規化を一切しておらず、 大小違いや記号入りの入力で失敗する (AST required 違反 + テスト失敗)",
    },
    {
      code: `function isCleanPalindrome(s) {
  const lower = s.toLowerCase();
  return lower === lower.split("").reverse().join("");
}
`,
      description: "記号や空白を除去していないので 'A man, a plan, a canal: Panama' が false になる (AST required 違反 + テスト失敗)",
    },
    {
      code: `function isCleanPalindrome(s) {
  return true;
}
`,
      description: "常に true を返している (AST required 違反 + テスト失敗)",
    },
  ],
  mdnSections: [
    {
      heading: "String.prototype.replace()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/replace",
      pageTitle: "String.prototype.replace()",
    },
    {
      heading: "String.prototype.toLowerCase()",
      pageUrl: "https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/String/toLowerCase",
      pageTitle: "String.prototype.toLowerCase()",
    },
  ],
};
