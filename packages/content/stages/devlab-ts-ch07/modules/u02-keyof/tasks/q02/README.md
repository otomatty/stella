# 07章 q02 keyof 型演算子

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q02 | keyof 型演算子 | 20 問 | 応用問題 |

## 課題の説明

次の20問を解いてください。型 User、Product と定数 SETTINGS、COLOR_CODES は定義済みです。

keyof 型 で、その型のプロパティ名のユニオン型になる。keyof typeof 定数 で、定数のキーのユニオン型になる。

型を書く問題は、プロパティ名を手で書き並べず、keyof を使って作ること。関数は引数と戻り値に型注釈を付けること。

export type User = { id: number; name: string; email: string; age: number };

export type Product = { code: string; price: number; stock: number };

export const SETTINGS = { theme: "light", fontSize: 14, beta: false };

export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q02-01-user-key.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q02-keyof.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: keyof 型演算子 (keyof-type-operator)](https://typescriptbook.jp/reference/type-reuse/keyof-type-operator)
