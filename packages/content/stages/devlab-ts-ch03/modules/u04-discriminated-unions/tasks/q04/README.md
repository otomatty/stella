# 03章 q04 判別可能なユニオン型

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q04 | 判別可能なユニオン型 | 20 問 | 応用問題 |

## 課題の説明

次の20問を解いてください。引数と戻り値には型注釈を付けること。

問1〜11 は、定義済みの型 Shape、Payment、Notice を使う。kind や method のような共通のプロパティで、どの形かを見分けてから使う。

問12〜20 は、判別可能なユニオン型を自分で定義して export し、その型を使って関数を書く。

switch を使うときは、すべての場合の case を書く（ESLint の switch-exhaustiveness-check。switch は04章で詳しく扱う）。

export type Shape =

| { kind: "circle"; radius: number }

| { kind: "square"; size: number }

| { kind: "rect"; width: number; height: number };

export type Payment =

| { method: "cash" }

| { method: "card"; cardNumber: string }

| { method: "bank"; bankName: string };

export type Notice =

| { type: "info"; message: string }

| { type: "warning"; message: string; level: number }

| { type: "error"; message: string; code: number };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q04-01-shape-area.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q04-discriminated-union.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 判別可能なユニオン型 (discriminated-union)](https://typescriptbook.jp/reference/values-types-variables/discriminated-union)
