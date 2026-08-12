import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch05TruthyFalsySix: Assignment = {
  id: "S1-Ch05-231-truthy-falsy-six",
  stage: "S1",
  chapterId: "Ch05",
  sequence: 3,
  title: "6 つの値の truthy / falsy を確かめる",
  newConcept: "boolean 以外の値も条件として判定される",
  estimatedMinutes: 12,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 6 つの値について、 truthy か falsy かを **先に予想してから**、 \`if\` で確かめてください。

\`\`\`ts
const v1 = 0;
const v2 = 1;
const v3 = "";
const v4 = "0";
const v5 = undefined;
const v6 = false;
\`\`\`

書き方は 6 つとも同じです。 値そのものを \`if\` の条件に置き、 表示する行は次の形にします。

- 条件に通ったら → \`\${typeof 変数}: truthy\`
- \`else\` に来たら → \`\${typeof 変数}: falsy\`

型の名前は自分で書かず、 **\`typeof\` で値から求めてください**。 \`v1\` から \`v6\` の順に 6 行表示します。

## 期待する出力

**6 行。** 上から順に \`v1\` 〜 \`v6\` について、 次の形式で 1 行ずつ。

\`\`\`
<typeof の結果>: truthy    ← 真と判定されたとき
<typeof の結果>: falsy     ← 偽と判定されたとき
\`\`\`

\`<typeof の結果>\` はその値に対する \`typeof\` の結果 (\`number\` / \`string\` / \`undefined\` / \`boolean\` のいずれか) で、 コロンのあとに半角スペースが 1 つ入ります。

**どの値が truthy でどの値が falsy になるかは、 ここには書きません。** 予想したうえで、 実行して確かめてください。

## ポイント

- \`if\` は \`boolean\` 以外の値も受け取れます。 その値が truthy とみなされるかどうかで分岐します。
- 表示する行はテンプレートリテラルで組み立てます。 \`\` \`\${typeof v1}: truthy\` \`\` のように、 型の名前は \`typeof\` の結果をそのまま埋め込みます。
- **予想と実行結果がずれた値があったら、 そこが今日の収穫です。** ずれても予想のほうを直さず、 実行結果をそのまま提出してください。
- 判定を書くときは、 値を数値や文字列に変換してから条件に置かないでください。 変換すると別のものを判定することになります。
`,
  starterFiles: singleFile(
    `// 6 つの値を const の変数に入れる（0 / 1 / "" / "0" / undefined / false）


// それぞれについて if で判定する
// 通ったら \`\${typeof 変数}: truthy\`、 else なら \`\${typeof 変数}: falsy\` を表示する
// 表示は v1 から v6 の順で 6 行

`,
    "main.ts",
  ),
  tests: [
    {
      name: "6 つの判定結果が型名付きで順に出力される",
      expectedStdout:
        "number: falsy\nnumber: truthy\nstring: falsy\nstring: truthy\nundefined: falsy\nboolean: falsy",
    },
  ],
  hints: [
    "まず 1 つぶんを書いてみます。 `if (v1) { ... } else { ... }` の中で、 テンプレートリテラルに `typeof v1` を埋め込んで表示します。",
    "残りの 5 つも同じ形をくり返します。 条件に置くのは **値そのもの** です。 `Number(...)` や `String(...)` で変換してから置くと、 元の値ではなく変換後の値を判定してしまいます。",
    '解答例:\n```ts\nconst v1 = 0;\nconst v2 = 1;\nconst v3 = "";\nconst v4 = "0";\nconst v5 = undefined;\nconst v6 = false;\n\nif (v1) {\n  console.log(`${typeof v1}: truthy`);\n} else {\n  console.log(`${typeof v1}: falsy`);\n}\n\nif (v2) {\n  console.log(`${typeof v2}: truthy`);\n} else {\n  console.log(`${typeof v2}: falsy`);\n}\n\nif (v3) {\n  console.log(`${typeof v3}: truthy`);\n} else {\n  console.log(`${typeof v3}: falsy`);\n}\n\nif (v4) {\n  console.log(`${typeof v4}: truthy`);\n} else {\n  console.log(`${typeof v4}: falsy`);\n}\n\nif (v5) {\n  console.log(`${typeof v5}: truthy`);\n} else {\n  console.log(`${typeof v5}: falsy`);\n}\n\nif (v6) {\n  console.log(`${typeof v6}: truthy`);\n} else {\n  console.log(`${typeof v6}: falsy`);\n}\n```\n\n答え合わせ: いちばん間違えやすいのは `v4` の `"0"` です。 引用符が付いているので **文字列** であり、 空文字ではないため truthy になります。 falsy な数値は `0` だけで、 `"0"` はその `0` とは別物です。 値の見た目ではなく型を見る、 という `+` のときと同じ観点です。',
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const v1 = 0;
const v2 = 1;
const v3 = "";
const v4 = "0";
const v5 = undefined;
const v6 = false;

if (v1) {
  console.log(\`\${typeof v1}: truthy\`);
} else {
  console.log(\`\${typeof v1}: falsy\`);
}

if (v2) {
  console.log(\`\${typeof v2}: truthy\`);
} else {
  console.log(\`\${typeof v2}: falsy\`);
}

if (v3) {
  console.log(\`\${typeof v3}: truthy\`);
} else {
  console.log(\`\${typeof v3}: falsy\`);
}

if (v4) {
  console.log(\`\${typeof v4}: truthy\`);
} else {
  console.log(\`\${typeof v4}: falsy\`);
}

if (v5) {
  console.log(\`\${typeof v5}: truthy\`);
} else {
  console.log(\`\${typeof v5}: falsy\`);
}

if (v6) {
  console.log(\`\${typeof v6}: truthy\`);
} else {
  console.log(\`\${typeof v6}: falsy\`);
}
`,
  badSolutions: [
    {
      code: `const v1 = 0;
const v2 = 1;
const v3 = "";
const v4 = "0";
const v5 = undefined;
const v6 = false;

if (Number(v1)) {
  console.log(\`\${typeof v1}: truthy\`);
} else {
  console.log(\`\${typeof v1}: falsy\`);
}

if (Number(v2)) {
  console.log(\`\${typeof v2}: truthy\`);
} else {
  console.log(\`\${typeof v2}: falsy\`);
}

if (Number(v3)) {
  console.log(\`\${typeof v3}: truthy\`);
} else {
  console.log(\`\${typeof v3}: falsy\`);
}

if (Number(v4)) {
  console.log(\`\${typeof v4}: truthy\`);
} else {
  console.log(\`\${typeof v4}: falsy\`);
}

if (Number(v5)) {
  console.log(\`\${typeof v5}: truthy\`);
} else {
  console.log(\`\${typeof v5}: falsy\`);
}

if (Number(v6)) {
  console.log(\`\${typeof v6}: truthy\`);
} else {
  console.log(\`\${typeof v6}: falsy\`);
}
`,
      description:
        '値を数値に変換してから判定しており、 文字列の "0" を数値の 0 と同じ falsy とみなしてしまっている',
    },
  ],
  mdnSections: [{ heading: "条件文" }, { heading: "偽値" }],
};
