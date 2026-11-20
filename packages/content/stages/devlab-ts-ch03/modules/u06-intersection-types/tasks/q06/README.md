# 03章 q06 インターセクション型

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q06 | インターセクション型 | 20 問 | 応用問題 |

## 課題の説明

次の20問を解いてください。引数と戻り値には型注釈を付けること。

Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。

問1〜13 は、引数や戻り値に Named & Aged のようなインターセクション型を書く。

問14〜20 は、インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Named = { name: string };

export type Aged = { age: number };

export type Priced = { price: number };

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q06-01-introduce.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q06-intersection.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: インターセクション型 (intersection)](https://typescriptbook.jp/reference/values-types-variables/intersection)
