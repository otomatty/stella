# 04章 q07 never型と網羅性のチェック

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q07 | never型と網羅性のチェック | 20 問 | 応用問題 |

## 課題の説明

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

関数 assertNever と、型 Fruit、Signal、Op、Shape、LogLevel は定義済みです。

ユニオン型の値で場合分けするときは switch で書き、すべての case を書いたうえで default では assertNever(値) を返す。

こうしておくと、型に新しい値が増えたときに、書き忘れた switch が型エラーで分かる。

export function assertNever(value: never): never {

throw new Error(`想定していない値です: ${JSON.stringify(value)}`);

}

export type Fruit = "apple" | "banana" | "cherry";

export type Signal = "red" | "yellow" | "green";

export type Op = "add" | "sub" | "mul";

export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };

export type LogLevel = "debug" | "info" | "warn" | "error";

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q07-01-fruit-color.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q07-never.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: never型と網羅性のチェック (never)](https://typescriptbook.jp/reference/statements/never)
