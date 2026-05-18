# Ch01. 変数

`let` / `const`、 代入、 命名、 値の保持。 値に名前を付けて使い回す感覚を S1 から S3 まで段階的に深める。

## 含まれるステージ

- **S1** 文法体験 — 1 文 1 構文で `const` / `let` の宣言と代入を体験する。
- **S2** 文法定着 — 既習構文と組み合わせて再代入・スコープ・typeof を意識する。
- **S3** ロジック入門 — 関数引数として変数を扱い、 自力で命名する。

## MDN 既定ページ

- [文法とデータ型 — 宣言](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Grammar_and_types#宣言)

## ディレクトリ構成

```
01-variables/
├── README.md
├── _index.ts
├── s1/   # Phase 5 で追加済み (12 問)
├── s2/   # Phase 7 で追加済み (10 問)
└── s3/   # Phase 8 で追加済み (5 問)
```

## S1 で扱う問題 (12 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S1-Ch01-01-const-string` | const で文字列を保持する |
| 02 | `S1-Ch01-02-const-number` | const で数値を保持する |
| 03 | `S1-Ch01-03-let-reassign` | let で再代入する |
| 04 | `S1-Ch01-04-let-vs-const` | const と let を使い分ける |
| 05 | `S1-Ch01-05-naming-camelcase` | camelCase で名前を付ける |
| 06 | `S1-Ch01-06-print-variable` | 変数の中身を console.log で出す |
| 07 | `S1-Ch01-07-multiple-vars` | 複数の変数を順に扱う |
| 08 | `S1-Ch01-08-store-calc-result` | 演算結果を変数に入れる |
| 09 | `S1-Ch01-09-concat-via-vars` | 変数同士を + で連結する |
| 10 | `S1-Ch01-10-copy-value` | 変数の値を別の変数にコピー |
| 11 | `S1-Ch01-11-template-literal-basic` | テンプレートリテラルで埋め込み |
| 12 | `S1-Ch01-12-const-array` | const に配列を入れて添字でアクセス |

### S1 学習ポイント

- 値が変わらないものは `const`、 変わるものは `let` を使う
- 変数名は **意味が伝わる camelCase** で書く (`userName`, `firstName` 等)
- 変数は **値の入れ物** ではなく **値に付ける名前**。 一度入れた値はそのまま `console.log` に渡せる
- テンプレートリテラル (`` ` ``) を使うと文字列の中に変数を埋め込める

## S2 で扱う問題 (10 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S2-Ch01-01-block-scope-let` | ブロック内 let は外に漏れない |
| 02 | `S2-Ch01-02-typeof-number` | typeof で数値型を確認 |
| 03 | `S2-Ch01-03-typeof-string` | typeof で文字列型を確認 |
| 04 | `S2-Ch01-04-typeof-boolean` | typeof で真偽値型を確認 |
| 05 | `S2-Ch01-05-typeof-undefined` | 未代入の let は undefined |
| 06 | `S2-Ch01-06-shadowing-block` | ブロックでシャドーイング |
| 07 | `S2-Ch01-07-let-update-multi` | let を 3 回更新 |
| 08 | `S2-Ch01-08-typeof-array` | typeof で配列は "object" |
| 09 | `S2-Ch01-09-temp-swap` | テンポラリ変数で値を交換 |
| 10 | `S2-Ch01-10-typeof-null` | typeof null は "object" (罠) |

### S2 学習ポイント

- `{ }` ブロック内の `let` / `const` は外には漏れない (ブロックスコープ)
- `typeof` で値の型を文字列として取り出せる: `"number"`, `"string"`, `"boolean"`, `"undefined"`, `"object"`
- 配列と null は両方とも `typeof` が `"object"` になる罠を覚える
- シャドーイングで内側スコープだけ値を変えられる

## S3 で扱う問題 (5 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S3-Ch01-01-double` | 引数を 2 倍して return する |
| 02 | `S3-Ch01-02-add-tax` | 税込価格を計算して整数で返す |
| 03 | `S3-Ch01-03-greet` | テンプレートリテラルで挨拶文を組み立てる |
| 04 | `S3-Ch01-04-rectangle-area` | 縦横から面積を計算して返す |
| 05 | `S3-Ch01-05-swap-pair` | 2 値の順番を入れ替えて配列で返す |

### S3 学習ポイント

- 採点形式が **`return` で値を返す** スタイルに変わる。 `console.log` は forbidden
- 引数 (関数のパラメーター) は **そのまま変数として使える**
- 計算結果は `const total = ...` のように **意味のある名前** を付けてから return すると読みやすい
- 浮動小数点演算では `Math.round` などで誤差を丸める必要がある

## 状態

S1: 12 問、 S2: 10 問、 S3: 5 問追加済み (Phase 5 / Phase 7 / Phase 8)。
