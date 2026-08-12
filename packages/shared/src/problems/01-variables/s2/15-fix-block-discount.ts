import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s2Ch01FixBlockDiscount: Assignment = {
  id: "S2-Ch01-213-fix-block-discount",
  stage: "S2",
  chapterId: "Ch01",
  sequence: 15,
  title: "ブロックの中の計算結果が外に届かない",
  newConcept: "ブロックの中で宣言すると新しい変数になり、 外側は変わらない",
  estimatedMinutes: 10,
  difficulty: 2,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次のコードは、 割引後の価格 \`800\` を表示したいのに \`1000\` のままです。

\`\`\`ts
let price = 1000;

{
  let price = 1000 * 0.8;
}

console.log(price); // 期待: 800
\`\`\`

原因を突き止め、 意図どおり \`800\` が表示されるよう直してください。

## 期待する出力

\`\`\`
800
\`\`\`

## ポイント

- \`let price = ...\` は **宣言** です。 ブロックの中でこれを書くと、 外側とは別の新しい変数がその場に作られます。
- 外側の変数を変えたいのであれば、 宣言せずに **代入だけ** を書きます。
- 宣言と代入の違いは、 キーワード (\`let\` / \`const\`) が付いているかどうかだけです。 目で見つけにくいので、 そもそも内と外で同じ名前を使わないほうが安全です。
- \`let\` を \`const\` に変えても解決しません。 問題は「どちらのキーワードか」ではなく「宣言してしまっていること」です。
`,
  starterFiles: singleFile(
    `// 割引後の 800 を表示したいのに 1000 のまま。 原因を直すこと。

let price = 1000;

{
  let price = 1000 * 0.8;
}

console.log(price); // 期待: 800
`,
    "main.ts",
  ),
  tests: [
    {
      name: "割引後の 800 が出力される",
      expectedStdout: "800",
    },
  ],
  hints: [
    "`console.log(price)` が見ているのは外側の `price` です。 外側の `price` は宣言されてから一度でも変わったでしょうか。",
    "ブロックの中の行から `let` を取ると、 宣言ではなく外側の変数への代入になります。",
    "解答例:\n```ts\nlet price = 1000;\n\n{\n  price = 1000 * 0.8; // let を書かない = 外の変数への再代入\n}\n\nconsole.log(price); // => 800\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `let price = 1000;

{
  price = 1000 * 0.8;
}

console.log(price);
`,
  badSolutions: [
    {
      code: `let price = 1000;

{
  const price = 1000 * 0.8;
}

console.log(price);
`,
      description:
        "let を const に変えただけで、 ブロックの中で宣言していること自体は変わっていないため、 外側の price は 1000 のまま",
    },
  ],
  mdnSections: [{ heading: "変数のスコープ" }, { heading: "宣言と初期化" }],
};
