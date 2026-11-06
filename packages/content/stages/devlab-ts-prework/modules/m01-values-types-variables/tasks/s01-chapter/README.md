# 01章 値・型・変数の問題

同じ番号では、ドリルを解いてから応用問題を解き、次の番号に進みます。

この課題で解くファイルです。

| 順番 | ファイル | 題 | 種類 | 問 |
| --- | --- | --- | --- | --- |
| 1 | `src/q01-let-const.drill.ts` | letとconst | ドリル | 20 問 |
| 2 | `src/q01-let-const.ts` | letとconst | 応用問題 |  |
| 3 | `src/q02-type-annotation.drill.ts` | 型注釈 | ドリル | 20 問 |
| 4 | `src/q02-type-annotation.ts` | 型注釈 | 応用問題 |  |
| 5 | `src/q03-type-inference.drill.ts` | 型推論 | ドリル | 20 問 |
| 6 | `src/q03-type-inference.ts` | 型推論 | 応用問題 |  |
| 7 | `src/q04-number.drill.ts` | number型 | ドリル | 20 問 |
| 8 | `src/q04-number.ts` | number型 | 応用問題 |  |
| 9 | `src/q05-string.drill.ts` | string型 | ドリル | 20 問 |
| 10 | `src/q05-string.ts` | string型 | 応用問題 |  |
| 11 | `src/q06-boolean.drill.ts` | boolean型 | ドリル | 20 問 |
| 12 | `src/q06-boolean.ts` | boolean型 | 応用問題 |  |
| 13 | `src/q07-literal-types.drill.ts` | リテラル型 | ドリル | 20 問 |
| 14 | `src/q07-literal-types.ts` | リテラル型 | 応用問題 |  |
| 15 | `src/q08-remove-any.drill.ts` | any をなくす | ドリル | 20 問 |
| 16 | `src/q08-remove-any.ts` | any をなくす | ★総合問題 |  |

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

- [サバイバルTypeScript: letとconst (let-and-const)](https://typescriptbook.jp/reference/values-types-variables/let-and-const)
- [サバイバルTypeScript: letとconst (vars-problems)](https://typescriptbook.jp/reference/values-types-variables/vars-problems)
- [サバイバルTypeScript: 型注釈 (type-annotation)](https://typescriptbook.jp/reference/values-types-variables/type-annotation)
- [サバイバルTypeScript: 型推論 (type-inference)](https://typescriptbook.jp/reference/values-types-variables/type-inference)
- [サバイバルTypeScript: number型 (number)](https://typescriptbook.jp/reference/values-types-variables/number)
- [サバイバルTypeScript: string型 (string)](https://typescriptbook.jp/reference/values-types-variables/string)
- [サバイバルTypeScript: boolean型 (boolean)](https://typescriptbook.jp/reference/values-types-variables/boolean)
- [サバイバルTypeScript: boolean型 (truthy-falsy-values)](https://typescriptbook.jp/reference/values-types-variables/truthy-falsy-values)
- [サバイバルTypeScript: リテラル型 (literal-types)](https://typescriptbook.jp/reference/values-types-variables/literal-types)
- [サバイバルTypeScript: any をなくす (any)](https://typescriptbook.jp/reference/values-types-variables/any)
