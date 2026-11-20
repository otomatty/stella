# 05章 q09 型ガード関数とアサーション関数

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q09 | 型ガード関数とアサーション関数 | 20 問 | 応用問題 |

## 課題の説明

次の20個の関数を書いてください。型 User、Admin、Pet は定義済みです。

「型ガード関数」は戻り値の型を value is string のように書く。true を返したとき、呼び出し側で value がその型に絞り込まれる。

「アサーション関数」は戻り値の型を asserts value is string のように書き、条件に合わなければ例外を投げる。

テストは、戻り値の型が型ガードやアサーションになっているかも確かめる。

export type User = { name: string; age: number };

export type Admin = User & { role: "admin" };

export type Pet = { kind: "dog"; bark: string } | { kind: "cat"; meow: string };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q09-01-is-text.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q09-type-guards.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 型ガード関数とアサーション関数 (type-guard-functions)](https://typescriptbook.jp/reference/functions/type-guard-functions)
- [サバイバルTypeScript: 型ガード関数とアサーション関数 (assertion-functions)](https://typescriptbook.jp/reference/functions/assertion-functions)
