# 03章 q07 as const

ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q07 | as const | 20 問 | 応用問題 |

## 課題の説明

次の20問を解いてください。

問1〜8 は、定数を as const を付けて宣言し export する。テストは、値に加えて、推論される型（readonly とリテラル型）も確かめる。

問9〜20 は、定義済みの定数 STATUSES、PRIORITY_POINTS、MONTH_NAMES などを使って関数を書く。引数と戻り値には型注釈を付けること。

型 Status、Priority の書き方（typeof、keyof）は07章で扱う。ここでは使うだけでよい。

export const STATUSES = ["todo", "doing", "done"] as const;

export type Status = (typeof STATUSES)[number];

export const PRIORITY_POINTS = { high: 3, middle: 2, low: 1 } as const;

export type Priority = keyof typeof PRIORITY_POINTS;

export const MONTH_NAMES = [

"1月",

"2月",

"3月",

"4月",

"5月",

"6月",

"7月",

"8月",

"9月",

"10月",

"11月",

"12月",

] as const;

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q07-01-days.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q07-as-const.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: as const (const-assertion)](https://typescriptbook.jp/reference/values-types-variables/const-assertion)
