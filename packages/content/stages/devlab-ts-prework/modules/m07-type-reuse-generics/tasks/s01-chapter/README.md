# 07章 型の再利用とジェネリクスの問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-typeof.drill.ts` | typeof 型演算子 | ドリル | 20 問 |
| 2 | `src/q01-typeof.ts` | typeof 型演算子 | 応用問題 |  |
| 3 | `src/q02-keyof.drill.ts` | keyof 型演算子 | ドリル | 20 問 |
| 4 | `src/q02-keyof.ts` | keyof 型演算子 | 応用問題 |  |
| 5 | `src/q03-partial-required-readonly.drill.ts` | Partial・Required・Readonly | ドリル | 20 問 |
| 6 | `src/q03-partial-required-readonly.ts` | Partial・Required・Readonly | 応用問題 |  |
| 7 | `src/q04-pick-omit.drill.ts` | Pick と Omit | ドリル | 20 問 |
| 8 | `src/q04-pick-omit.ts` | Pick と Omit | 応用問題 |  |
| 9 | `src/q05-record.drill.ts` | Record | ドリル | 20 問 |
| 10 | `src/q05-record.ts` | Record | 応用問題 |  |
| 11 | `src/q06-type-variables.drill.ts` | 型変数（ジェネリクス） | ドリル | 20 問 |
| 12 | `src/q06-type-variables.ts` | 型変数（ジェネリクス） | 応用問題 |  |
| 13 | `src/q07-constraints.drill.ts` | 型引数の制約 | ドリル | 20 問 |
| 14 | `src/q07-constraints.ts` | 型引数の制約 | 応用問題 |  |
| 15 | `src/q08-generic-utils.drill.ts` | ジェネリクスのユーティリティ | ドリル | 20 問 |
| 16 | `src/q08-generic-utils.ts` | ジェネリクスのユーティリティ | ★総合問題 |  |

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

- [サバイバルTypeScript: typeof 型演算子 (typeof-type-operator)](https://typescriptbook.jp/reference/type-reuse/typeof-type-operator)
- [サバイバルTypeScript: typeof 型演算子 (indexed-access-types)](https://typescriptbook.jp/reference/type-reuse/indexed-access-types)
- [サバイバルTypeScript: keyof 型演算子 (keyof-type-operator)](https://typescriptbook.jp/reference/type-reuse/keyof-type-operator)
- [サバイバルTypeScript: Partial・Required・Readonly (partial)](https://typescriptbook.jp/reference/type-reuse/utility-types/partial)
- [サバイバルTypeScript: Partial・Required・Readonly (required)](https://typescriptbook.jp/reference/type-reuse/utility-types/required)
- [サバイバルTypeScript: Partial・Required・Readonly (readonly)](https://typescriptbook.jp/reference/type-reuse/utility-types/readonly)
- [サバイバルTypeScript: Pick と Omit (pick)](https://typescriptbook.jp/reference/type-reuse/utility-types/pick)
- [サバイバルTypeScript: Pick と Omit (omit)](https://typescriptbook.jp/reference/type-reuse/utility-types/omit)
- [サバイバルTypeScript: Record (record)](https://typescriptbook.jp/reference/type-reuse/utility-types/record)
- [サバイバルTypeScript: 型変数（ジェネリクス） (generics)](https://typescriptbook.jp/reference/generics)
- [サバイバルTypeScript: 型変数（ジェネリクス） (type-variables)](https://typescriptbook.jp/reference/generics/type-variables)
- [サバイバルTypeScript: 型引数の制約 (type-parameter-constraint)](https://typescriptbook.jp/reference/generics/type-parameter-constraint)
