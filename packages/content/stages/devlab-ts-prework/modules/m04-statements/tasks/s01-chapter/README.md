# 04章 文と例外の問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-if-else.drill.ts` | if-else文 | ドリル | 20 問 |
| 2 | `src/q01-if-else.ts` | if-else文 | 応用問題 |  |
| 3 | `src/q02-switch.drill.ts` | switch文 | ドリル | 20 問 |
| 4 | `src/q02-switch.ts` | switch文 | 応用問題 |  |
| 5 | `src/q03-for-of.drill.ts` | for文と for-of文 | ドリル | 20 問 |
| 6 | `src/q03-for-of.ts` | for文と for-of文 | 応用問題 |  |
| 7 | `src/q04-while.drill.ts` | while文と break・continue | ドリル | 20 問 |
| 8 | `src/q04-while.ts` | while文と break・continue | 応用問題 |  |
| 9 | `src/q05-exception.drill.ts` | 例外処理 | ドリル | 20 問 |
| 10 | `src/q05-exception.ts` | 例外処理 | 応用問題 |  |
| 11 | `src/q06-unknown.drill.ts` | unknown型と型の絞り込み | ドリル | 20 問 |
| 12 | `src/q06-unknown.ts` | unknown型と型の絞り込み | 応用問題 |  |
| 13 | `src/q07-never.drill.ts` | never型と網羅性のチェック | ドリル | 20 問 |
| 14 | `src/q07-never.ts` | never型と網羅性のチェック | 応用問題 |  |
| 15 | `src/q08-command.drill.ts` | 文字列の解析 | ドリル | 20 問 |
| 16 | `src/q08-command.ts` | コマンドの解析 | ★総合問題 |  |

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

- [サバイバルTypeScript: if-else文 (if-else)](https://typescriptbook.jp/reference/statements/if-else)
- [サバイバルTypeScript: if-else文 (ternary-operator)](https://typescriptbook.jp/reference/statements/ternary-operator)
- [サバイバルTypeScript: switch文 (switch)](https://typescriptbook.jp/reference/statements/switch)
- [サバイバルTypeScript: switch文 (switch-fallthrough)](https://typescriptbook.jp/reference/statements/switch-fallthrough)
- [サバイバルTypeScript: for文と for-of文 (for-of)](https://typescriptbook.jp/reference/statements/for-of)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
- [サバイバルTypeScript: unknown型と型の絞り込み (unknown)](https://typescriptbook.jp/reference/statements/unknown)
- [サバイバルTypeScript: unknown型と型の絞り込み (control-flow-analysis-and-type-guard)](https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard)
- [サバイバルTypeScript: never型と網羅性のチェック (never)](https://typescriptbook.jp/reference/statements/never)
