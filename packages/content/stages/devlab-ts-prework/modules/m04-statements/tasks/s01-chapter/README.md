# 04章 文と例外の問題

同じ番号では、ドリルの問題を 1 問ずつ確認して提出してから、応用問題に進みます。

問題の一覧です。課題のパネルにも出ます。

| 番号 | 題 | ドリルの問数 | 応用問題 |
| --- | --- | --- | --- |
| q01 | if-else文 | 20 問 | 応用問題 |
| q02 | switch文 | 20 問 | 応用問題 |
| q03 | for文と for-of文 | 20 問 | 応用問題 |
| q04 | while文と break・continue | 20 問 | 応用問題 |
| q05 | 例外処理 | 20 問 | 応用問題 |
| q06 | unknown型と型の絞り込み | 20 問 | 応用問題 |
| q07 | never型と網羅性のチェック | 20 問 | 応用問題 |
| q08 | 文字列の解析 | 20 問 | ★総合問題 |

## 番号ごとの説明

### q01 if-else文

次の20個の関数を、if-else 文（短いものは三項演算子でもよい）で書いてください。引数と戻り値には型注釈を付けること。

決まった値しか返さない関数は、戻り値をリテラル型のユニオンにする（例: "合格" | "不合格"）。

### q02 switch文

次の20個の関数を、switch 文で書いてください。引数と戻り値には型注釈を付けること。

同じ処理にしたい case は、case 3: case 4: case 5: のように並べる。

引数がユニオン型なら、すべての case を書く（ESLint の switch-exhaustiveness-check）。数値や文字列なら default を書く。

### q03 for文と for-of文

次の20個の関数を、for 文か for-of 文で書いてください（map や filter などは使わない）。引数と戻り値には型注釈を付けること。

配列の要素を順に見るだけなら for-of、番号（インデックス）も要るなら for 文が書きやすい。

引数の配列は readonly にする。

### q04 while文と break・continue

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

何回繰り返すか前もって分からないときは while 文を使う。少なくとも1回は実行したいときは do-while 文を使う。

ループを途中で抜けるときは break、その回だけ飛ばすときは continue を使う。

引数には値を入れ直せないので、変えたい値は let の変数に写してから使う。

### q05 例外処理

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

例外を投げるときは throw new Error("メッセージ")。メッセージは問題文のとおりにする。

JSON.parse、new URL、decodeURIComponent、BigInt、String の repeat などは、おかしな値を渡すと例外を投げる。それを try-catch で受け止める問題もある。

catch で受け取る値の型は unknown。使う前に instanceof Error などで絞り込む。

### q06 unknown型と型の絞り込み

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

unknown の値は、そのままでは使えない。typeof、instanceof、Array.isArray、=== null、"name" in value などで型を絞り込んでから使う。

any は使わない。

### q07 never型と網羅性のチェック

次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

関数 assertNever と、型 Fruit、Signal、Op、Shape、LogLevel は定義済みです。

ユニオン型の値で場合分けするときは switch で書き、すべての case を書いたうえで default では assertNever(値) を返す。

こうしておくと、型に新しい値が増えたときに、書き忘れた switch が型エラーで分かる。

export function assertNever(value: never): never {

throw new Error(`想定していない値です: ${JSON.stringify(value)}`);

}

export type Fruit = "apple" | "banana" | "cherry";

export type Signal = "red" | "yellow" | "green";

export type Op = "add" | "sub" | "mul";

export type Shape = { kind: "circle"; radius: number } | { kind: "square"; size: number };

export type LogLevel = "debug" | "info" | "warn" | "error";

### q08 文字列の解析

★総合問題（コマンドの解析）で使う書き方を繰り返します。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。

文字列を split や slice で分け、数値に変え、形がおかしければ Error を投げる。メッセージは問題文のとおりにする。

数値かどうかは Number(…) と Number.isFinite、整数かどうかは Number.isInteger で確かめる。

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

- [サバイバルTypeScript: if-else文 (if-else)](https://typescriptbook.jp/reference/statements/if-else)
- [サバイバルTypeScript: if-else文 (ternary-operator)](https://typescriptbook.jp/reference/statements/ternary-operator)
- [サバイバルTypeScript: switch文 (switch)](https://typescriptbook.jp/reference/statements/switch)
- [サバイバルTypeScript: switch文 (switch-fallthrough)](https://typescriptbook.jp/reference/statements/switch-fallthrough)
- [サバイバルTypeScript: for文と for-of文 (for-of)](https://typescriptbook.jp/reference/statements/for-of)
- [サバイバルTypeScript: 例外処理 (exception)](https://typescriptbook.jp/reference/statements/exception)
- [サバイバルTypeScript: unknown型と型の絞り込み (unknown)](https://typescriptbook.jp/reference/statements/unknown)
- [サバイバルTypeScript: unknown型と型の絞り込み (control-flow-analysis-and-type-guard)](https://typescriptbook.jp/reference/statements/control-flow-analysis-and-type-guard)
- [サバイバルTypeScript: never型と網羅性のチェック (never)](https://typescriptbook.jp/reference/statements/never)
