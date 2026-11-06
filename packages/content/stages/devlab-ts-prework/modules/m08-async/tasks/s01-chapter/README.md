# 08章 非同期処理の問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-promise.drill.ts` | Promise | ドリル | 20 問 |
| 2 | `src/q01-promise.ts` | Promise | 応用問題 |  |
| 3 | `src/q02-async-await.drill.ts` | async と await | ドリル | 20 問 |
| 4 | `src/q02-async-await.ts` | async と await | 応用問題 |  |
| 5 | `src/q03-fetch.drill.ts` | fetch | ドリル | 20 問 |
| 6 | `src/q03-fetch.ts` | fetch でAPIを呼ぶ | 応用問題 |  |
| 7 | `src/q04-async-errors.drill.ts` | 非同期のエラー処理 | ドリル | 20 問 |
| 8 | `src/q04-async-errors.ts` | 非同期のエラー処理 | 応用問題 |  |
| 9 | `src/q05-aggregate.drill.ts` | 複数のAPIの結果をまとめる | ドリル | 20 問 |
| 10 | `src/q05-aggregate.ts` | 複数のAPIの結果をまとめる | ★総合問題 |  |

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

- [サバイバルTypeScript: Promise (asynchronous)](https://typescriptbook.jp/reference/asynchronous)
- [サバイバルTypeScript: Promise (promise)](https://typescriptbook.jp/reference/asynchronous/promise)
- [サバイバルTypeScript: async と await (async)](https://typescriptbook.jp/reference/asynchronous/async)
- [サバイバルTypeScript: async と await (await)](https://typescriptbook.jp/reference/asynchronous/await)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
