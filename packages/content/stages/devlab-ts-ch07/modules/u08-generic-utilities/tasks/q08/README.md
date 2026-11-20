# 07章 q08 ジェネリクスのユーティリティ

ドリルの問題を 1 問ずつ確認して提出してから、★総合問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q08 | ジェネリクスのユーティリティ | 20 問 | ★総合問題 |

## 課題の説明

★総合問題（ジェネリクスのユーティリティ）で使う書き方を繰り返します。次の20個の関数を、型変数を使って書いてください。

any や unknown で逃げないこと。引数の配列は readonly T[] にし、元の配列は変えないこと。

Array の findLast や Object.groupBy などは使わず、自分で書くこと（この課題の設定では、型がないので使えない）。

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q08-01-group-items.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q08-generic-utils.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 型変数（ジェネリクス） (generics)](https://typescriptbook.jp/reference/generics)
- [サバイバルTypeScript: 型変数（ジェネリクス） (type-variables)](https://typescriptbook.jp/reference/generics/type-variables)
- [サバイバルTypeScript: 型引数の制約 (type-parameter-constraint)](https://typescriptbook.jp/reference/generics/type-parameter-constraint)
