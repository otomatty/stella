# 02章 オブジェクト・配列・タプルの発展問題

任意の課題です。章の課題とは別に数えます。

番号の順に解きます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/e01-nested-readonly.ts` | 入れ子のオブジェクトと readonly | 発展問題 |  |
| 2 | `src/e02-loop-object.ts` | オブジェクトをループする | 発展問題 |  |

## 進め方

ファイルの先頭の問題文を読んで、コードを書きます。

VS Code のコマンド「STELLA: 課題を確認する」で確かめます。依存パッケージの準備、ESLint、Prettier、型の確認 (tsc)、テストの順に進みます。

全部が通ったら、課題のパネルから提出します。章の全部が通るまで提出できません。全部の章を解き終える必要はありません。提出した章の課題を数えます。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く
- 提出のときの説明の欄には、詰まったところと調べたこと (何を読んで解決したか) を書く

## 教材

- [サバイバルTypeScript: 発展問題 入れ子のオブジェクトと readonly (readonly-vs-const)](https://typescriptbook.jp/reference/values-types-variables/object/readonly-vs-const)
- [サバイバルTypeScript: 配列の型 (readonly-array)](https://typescriptbook.jp/reference/values-types-variables/array/readonly-array)
- [サバイバルTypeScript: インデックス型 (how-to-loop-an-object)](https://typescriptbook.jp/reference/values-types-variables/object/how-to-loop-an-object)
