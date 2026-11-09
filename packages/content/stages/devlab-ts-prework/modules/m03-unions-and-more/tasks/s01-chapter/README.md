# 03章 ユニオン型とそのほかの型の問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | 型エイリアスとユニオン型 | 20 問 | 応用問題 |
| q02 | リテラル型のユニオン | 20 問 | 応用問題 |
| q03 | null と undefined | 20 問 | 応用問題 |
| q04 | 判別可能なユニオン型 | 20 問 | 応用問題 |
| q05 | 成功と失敗を表す型 | 20 問 | 応用問題 |
| q06 | インターセクション型 | 20 問 | 応用問題 |
| q07 | as const | 20 問 | 応用問題 |
| q08 | 状態の切り替え | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 型エイリアスとユニオン型

次の20問を解いてください。引数と戻り値には型注釈を付けること。

問1〜9 は、引数に string | number のようなユニオン型を直接書く。

問10〜20 は、type でユニオン型に名前を付けて export し、その型を使って関数を書く。

ユニオン型の値は、typeof v === "number" や v === "欠席" で場合を分けてから使う（絞り込み）。

### q02 リテラル型のユニオン

次の20問を解いてください。引数と戻り値には型注釈を付けること。

問1〜10 は、定義済みの型 Direction、Weekday、Plan を使う。

問11〜20 は、"表" | "裏" のようなリテラル型のユニオンに type で名前を付けて export し、その型を使って関数を書く。

文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

export type Direction = "up" | "down" | "left" | "right";

export type Weekday = "月" | "火" | "水" | "木" | "金";

export type Plan = "free" | "pro" | "enterprise";

### q03 null と undefined

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

null や undefined かもしれない値は、?.（オプショナルチェーン）、??、=== null、=== undefined で扱う。

== null のような書き方は使わない（ESLint の eqeqeq）。

### q04 判別可能なユニオン型

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

### q05 成功と失敗を表す型

成功と失敗を表す型 Result は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

失敗を例外ではなく値で返すと、呼び出す側は result.ok で場合を分けてから value や error を使うことになる。

失敗のときの error の文言は、問題文に書いたとおりにする。

export type Result = { ok: true; value: number } | { ok: false; error: string };

### q06 インターセクション型

次の20問を解いてください。引数と戻り値には型注釈を付けること。

Named、Aged、Priced などの小さな型は定義済みです。Named & Aged のように & でつなぐと、両方のプロパティを持つ型になる。

問1〜13 は、引数や戻り値に Named & Aged のようなインターセクション型を書く。

問14〜20 は、インターセクション型に type で名前を付けて export し、その型を使って関数を書く。

export type Named = { name: string };

export type Aged = { age: number };

export type Priced = { price: number };

export type Timestamped = { createdAt: Date };

export type Identified = { id: number };

### q07 as const

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

### q08 状態の切り替え

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

確認と提出は、VS Code 拡張（「STELLA: 課題を確認する」と課題のパネル）か、CLI の `stella check` と `stella submit` でできます。

問題を全部提出すると、この課題は合格になります。合否は手元のテストが通ったという申告で、サーバーはコードを実行しません。

ドリルの問題は `src/q01-01-add-tax.ts` のように、番号・問の番号・名前で 1 問 1 ファイルです。応用問題や、クラス・型を 1 ファイルにまとめた問題は `src/q01-let-const.ts` のような名前です。

## ルール

- **生成AIにコードを書かせない。** 分からないところの説明を聞くのはよい
- **AI による自動補完を切る。** VS Code の設定で `chat.disableAIFeatures` を検索してチェックを入れる。Copilot などの拡張機能は無効にする
- **`tests/` と設定ファイル (package.json、tsconfig.json、eslint.config.js など) は書き換えない。** 書き換えると提出できない
- テストが通ったら、なぜそう書くのかを自分の言葉で説明できるか確かめる
- 「説明すること」は、そのすぐ下に `//` のコメントで書く

## 教材

- [サバイバルTypeScript: 型エイリアスとユニオン型 (type-alias)](https://typescriptbook.jp/reference/values-types-variables/type-alias)
- [サバイバルTypeScript: 型エイリアスとユニオン型 (union)](https://typescriptbook.jp/reference/values-types-variables/union)
- [サバイバルTypeScript: リテラル型 (literal-types)](https://typescriptbook.jp/reference/values-types-variables/literal-types)
- [サバイバルTypeScript: null と undefined (undefined-vs-null)](https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null)
- [サバイバルTypeScript: null と undefined (optional-chaining)](https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining)
- [サバイバルTypeScript: 判別可能なユニオン型 (discriminated-union)](https://typescriptbook.jp/reference/values-types-variables/discriminated-union)
- [サバイバルTypeScript: インターセクション型 (intersection)](https://typescriptbook.jp/reference/values-types-variables/intersection)
- [サバイバルTypeScript: as const (const-assertion)](https://typescriptbook.jp/reference/values-types-variables/const-assertion)
