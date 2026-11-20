# 07章 q03 Partial・Required・Readonly

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q03 | Partial・Required・Readonly | 20 問 | 応用問題 |

## 課題の説明

次の20問を解いてください。型 Options と Profile は定義済みです。

Partial<T> はすべてを省略できる型、Required<T> はすべてを省略できない型、Readonly<T> はすべてを読み取り専用にした型。

型を書く問題は、プロパティを手で書き並べず、ユーティリティ型で作ること。関数は引数と戻り値に型注釈を付けること。

export type Options = { size: number; color: string; bold: boolean };

export type Profile = { name: string; email?: string; age?: number };

export const DEFAULT_OPTIONS: Options = { size: 12, color: "black", bold: false };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q03-01-partial-options.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q03-partial-required-readonly.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: Partial・Required・Readonly (partial)](https://typescriptbook.jp/reference/type-reuse/utility-types/partial)
- [サバイバルTypeScript: Partial・Required・Readonly (required)](https://typescriptbook.jp/reference/type-reuse/utility-types/required)
- [サバイバルTypeScript: Partial・Required・Readonly (readonly)](https://typescriptbook.jp/reference/type-reuse/utility-types/readonly)
