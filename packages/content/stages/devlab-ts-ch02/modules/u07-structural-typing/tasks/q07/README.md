# 02章 q07 構造的型付け

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q07 | 構造的型付け | 20 問 | 応用問題 |

## 課題の説明

Cat、Dog、Robot など、いくつかの型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

引数の型には、関数が本当に使うプロパティだけを書く（例: 名前しか使わないなら { name: string }）。

そうすると、名前の違う型でも、そのプロパティを持っていれば渡せる。これが構造的型付け。

export type Cat = { name: string; age: number; meow: string };

export type Dog = { name: string; age: number; breed: string };

export type Robot = { name: string; version: number };

export type Box = { width: number; height: number; depth: number };

export type Paper = { width: number; height: number };

export type Product = { name: string; price: number; stock: number };

export type Service = { name: string; price: number; hours: number };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q07-01-name-of.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q07-structural-typing.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 構造的型付け (structural-subtyping)](https://typescriptbook.jp/reference/values-types-variables/structural-subtyping)
- [サバイバルTypeScript: 構造的型付け (excess-property-checking)](https://typescriptbook.jp/reference/values-types-variables/object/excess-property-checking)
