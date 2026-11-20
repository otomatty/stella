# 03章 q08 状態の切り替え

ドリルの問題を 1 問ずつ確認して提出してから、そのあとの問題に進みます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q08 | 状態の切り替え | 20 問 | ★総合問題 |

## 課題の説明

ドア、照明、タイマー、チケットの状態を表す型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

どの型も、state や status で今の状態を見分ける判別可能なユニオン型になっている。

状態を変える関数は、元のオブジェクトを書き換えずに、新しい状態のオブジェクトを返す。今の状態では変えられないときは、受け取った状態をそのまま返す。

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

export type Light = { state: "off" } | { state: "on"; brightness: number };

export type Timer =

| { state: "idle" }

| { state: "running"; startedAt: number }

| { state: "paused"; elapsed: number };

export type Ticket =

| { status: "open"; title: string }

| { status: "assigned"; title: string; assignee: string }

| { status: "closed"; title: string; resolution: string };

## 進め方

1 問確認して提出し、次の問題へ進みます。

VS Code 拡張で「STELLA: 課題を確認する」を実行し、課題のパネルから提出します。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q08-01-close-door.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q08-order-status.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 判別可能なユニオン型 (discriminated-union)](https://typescriptbook.jp/reference/values-types-variables/discriminated-union)
