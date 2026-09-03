# カリキュラム全体計画

トピック形式(1トピック = ショート動画1本 = 覚えることが1つ)での全体構成です。定義は `CLAUDE.md`、執筆ルールは `STYLE_GUIDE.md` を参照してください。

前提講座: **JavaScript 入門(`javascript-basics`)**。言語の基礎と DOM 操作を通してから、型を足します(`course.json` の `prerequisites` に対応)。ITのきほん → HTML/CSS 入門は、JavaScript 入門の前提として先に通るので、ここには重ねて書きません。後続は準備中の `react-basics`(npm とビルドツール入門も前提)と `fetch-api-basics`。バックエンドの TypeScript は別講座 (`typescript-node-basics`) で、この講座のクリアとは共有しません。

コード演習: VS Code 拡張の TypeScript 採点(QuickJS)。`course.json` の `exercises` で M0〜M4 の 22 レッスンに 3 問ずつ配線しています(計 66 問。詳細は末尾の「コード演習」)。

**全10モジュール(M0〜M9)/ 42レッスン / 162トピック**(動画総時間の目安 約7時間)

| | モジュール | ディレクトリ | L | T | 状態 |
|---|---|---|---|---|---|
| M0 | オリエンテーション | `m0-orientation` | 2 | 6 | 完成 |
| M1 | 値と型 | `m1-values` | 6 | 25 | 完成 |
| M2 | 条件分岐とスコープ | `m2-conditionals` | 4 | 13 | 完成 |
| M3 | まとまったデータ | `m3-data` | 4 | 16 | 完成 |
| M4 | 関数 | `m4-functions` | 6 | 22 | 完成 |
| M5 | 型を深める | `m5-type-system` | 6 | 21 | 完成 |
| M6 | ジェネリクス | `m6-generics` | 3 | 12 | 完成 |
| M7 | オブジェクト指向 | `m7-oop` | 4 | 18 | 完成 |
| M8 | 非同期処理 | `m8-async` | 3 | 12 | 完成 |
| M9 | 実践 | `m9-practice` | 4 | 17 | 完成 |

## 旧構成から変えた点と、その理由

| 変更 | 理由 |
|---|---|
| **型エイリアスを M3 へ**(旧 M3-1) | 旧構成では M2 の関数(`type Calc = ...`)で先に使われており、正式導入より前だった |
| **ユニオン型を M1 へ**(旧 M3-2) | 旧構成では M1 の `null` とリテラル型で先に使われていた |
| **ジェネリクスを M6、非同期を M8 へ**(旧は逆) | `Promise<T>` の `<>` を「今は記法として覚えて」と先送りしなくて済む |
| **例外処理を M5 の `unknown` の直後に新設** | `catch (e)` の `e` は `unknown`。それより前に置くと型が宙に浮く |
| **ローカル環境構築を M0 から M9 へ移設** | M0〜M8 は Playground で完結する。Node.js が本当に要るのは `tsconfig` を扱う M9 から |
| **交差型・スコープ・`??`・オーバーロードの扱い** | 交差型は M5-5、ブロックスコープは M2-1 に新設。関数オーバーロードは見送り(ユニオン型で代替可能、読めれば十分) |

---

## M0 オリエンテーション(2レッスン / 6トピック)

### L0-1 なぜTypeScriptを学ぶのか
| ID | Takeaway |
|---|---|
| 0-1-1 | プログラムは値を扱う。JavaScriptは、値の種類を間違えても実行するまで気づけない |
| 0-1-2 | TypeScriptは、型を書くことで間違いを実行前に見つける |
| 0-1-3 | TypeScriptはJavaScriptに変換されてから動く |

### L0-2 Playgroundを使う
| ID | Takeaway |
|---|---|
| 0-2-1 | Playgroundを開けば、環境構築なしで書き始められる |
| 0-2-2 | `console.log`で値を画面に出す |
| 0-2-3 | 赤い波線にカーソルを乗せれば、エラーの内容が読める |

## M1 値と型(6レッスン / 25トピック)

L1-1 変数(4) / L1-2 型注釈と型推論(5) / L1-3 数値と真偽値(4) / L1-4 文字列(3) / L1-5 リテラル型とユニオン型(4) / L1-6 nullとundefined(5)

## M2 条件分岐とスコープ(4レッスン / 13トピック)

### L2-1 ブロックとスコープ
| ID | Takeaway |
|---|---|
| 2-1-1 | 中かっこはブロック。ブロックの中で宣言した変数は、外から見えない |
| 2-1-2 | 内側からは、外の変数が見える |
| 2-1-3 | 内側で同じ名前を宣言すると、外の変数は隠れる |

### L2-2 条件分岐
| ID | Takeaway |
|---|---|
| 2-2-1 | 比較演算子の結果は`boolean`。等価比較は`===`を使う |
| 2-2-2 | `if`は、条件が`true`のときだけブロックを実行する |
| 2-2-3 | `else`と`else if`で分岐を増やす |
| 2-2-4 | 三項演算子は「値を選ぶ」ときに使う |

### L2-3 条件で型を絞り込む
| ID | Takeaway |
|---|---|
| 2-3-1 | 条件には`boolean`以外も書ける(truthy / falsy) |
| 2-3-2 | `if`で値の有無を確かめると、その中では型が確定する |
| 2-3-3 | `??`で「値がなければこれ」を1行で書く |

### L2-4 switch
| ID | Takeaway |
|---|---|
| 2-4-1 | `switch`は1つの値を複数の候補と順に比べる |
| 2-4-2 | `break`を忘れると、次の`case`に落ちる |
| 2-4-3 | リテラルのユニオン型は`switch`と相性がよい |

## M3 まとまったデータ(4レッスン / 16トピック)

### L3-1 配列の基本
3-1-1 配列とは・型注釈 / 3-1-2 インデックスは0から / 3-1-3 `length`で要素数 / 3-1-4 存在しない要素は`undefined`

### L3-2 配列を使う
3-2-1 要素の書き換えと`push` / 3-2-2 `const`の配列でも中身は変えられる / 3-2-3 `for-of`で1つずつ取り出す / 3-2-4 繰り返しで集計する

### L3-3 オブジェクト
3-3-1 オブジェクトとは / 3-3-2 ドット記法で読み書き / 3-3-3 オブジェクトの型注釈 / 3-3-4 型がタイポとプロパティ不足を止める

### L3-4 型エイリアス
3-4-1 型に名前を付ける / 3-4-2 オプショナルプロパティ`?` / 3-4-3 `readonly`プロパティ / 3-4-4 配列とオブジェクトを組み合わせる

## M4 関数(6レッスン / 22トピック)

### L4-1 関数の基本
4-1-1 関数とは / 4-1-2 関数宣言と引数の型注釈 / 4-1-3 `return`で値を返す / 4-1-4 引数の個数もチェックされる

### L4-2 関数の書き方3種
4-2-1 関数式 / 4-2-2 アロー関数 / 4-2-3 省略記法と使い分け

### L4-3 引数を使いこなす
4-3-1 オプション引数`?` / 4-3-2 デフォルト引数 / 4-3-3 残余引数`...` / 4-3-4 スプレッド構文

### L4-4 戻り値と関数の型
4-4-1 `void` / 4-4-2 戻り値の型を書く理由 / 4-4-3 関数の型 / 4-4-4 関数の型に名前を付ける

### L4-5 コールバック
4-5-1 コールバック(関数を引数として渡す)/ 4-5-2 `map` / 4-5-3 `filter` / 4-5-4 つなげて書く

### L4-6 分割代入とOptions Object
4-6-1 分割代入 / 4-6-2 分割代入引数 / 4-6-3 Options Objectパターン

## M5 型を深める(6レッスン / 21トピック)

### L5-1 ユニオン型を深める
5-1-1 ユニオン型は共通部分しか使えない / 5-1-2 オブジェクトのユニオンは絞り込みにくい / 5-1-3 判別可能なユニオン型

### L5-2 型ガード
5-2-1 制御フロー分析 / 5-2-2 `typeof` / 5-2-3 `in` / 5-2-4 型ガード関数

### L5-3 any・unknown・never
5-3-1 `any`は何でも許す / 5-3-2 `unknown`はわからないことを認める / 5-3-3 `any`と`unknown`の違い / 5-3-4 `never`と網羅性チェック

### L5-4 例外処理
5-4-1 `throw`で異常を投げる / 5-4-2 `try`-`catch`-`finally` / 5-4-3 `catch`の引数は`unknown`

### L5-5 交差型と構造的型付け
5-5-1 交差型`&` / 5-5-2 構造的型付け / 5-5-3 余剰プロパティチェック

### L5-6 タプル・as const・satisfies
5-6-1 タプル / 5-6-2 `enum`は使わない / 5-6-3 `as const` / 5-6-4 `satisfies`

## M6 ジェネリクス(3レッスン / 12トピック)

### L6-1 ジェネリクスの基本
6-1-1 型も引数にする / 6-1-2 `<T>`の書き方 / 6-1-3 型引数は推論される / 6-1-4 `extends`で制約を付ける

### L6-2 keyofとtypeof
6-2-1 `typeof`型演算子 / 6-2-2 `keyof`型演算子 / 6-2-3 `keyof typeof` / 6-2-4 インデックスアクセス型と安全な読み取り

### L6-3 Utility Types
6-3-1 `Partial` / 6-3-2 `Pick` / 6-3-3 `Omit` / 6-3-4 `Readonly`と`Record`

## M7 オブジェクト指向(4レッスン / 18トピック)

### L7-1 クラスの基本
7-1-1 クラスとは / 7-1-2 プロパティ / 7-1-3 コンストラクタと`this` / 7-1-4 メソッド

### L7-2 カプセル化
7-2-1 `private`で隠す / 7-2-2 getter / 7-2-3 クラスの`readonly` / 7-2-4 `static` / 7-2-5 コンストラクタショートハンド

### L7-3 継承
7-3-1 `extends`で継承する(+`protected`)/ 7-3-2 `super` / 7-3-3 オーバーライド / 7-3-4 `instanceof` / 7-3-5 抽象クラス

### L7-4 インターフェース
7-4-1 インターフェースとは / 7-4-2 `implements` / 7-4-3 型として使う / 7-4-4 `interface`と`type`の使い分け

## M8 非同期処理(3レッスン / 12トピック)

### L8-1 なぜ非同期処理が必要か
8-1-1 シングルスレッド / 8-1-2 `setTimeout` / 8-1-3 実行順序 / 8-1-4 コールバック地獄

### L8-2 Promise
8-2-1 Promiseとは / 8-2-2 `then` / 8-2-3 `Promise<T>`の型 / 8-2-4 `catch`と`finally`

### L8-3 async/await
8-3-1 `async`関数 / 8-3-2 `await` / 8-3-3 `try`-`catch`との組み合わせ / 8-3-4 `fetch`でAPIを呼ぶ

## M9 実践(4レッスン / 17トピック)

### L9-1 ローカル環境
9-1-1 Node.js / 9-1-2 インストールを確認する / 9-1-3 VS Code / 9-1-4 TypeScriptを入れる / 9-1-5 `tsc`でコンパイルする

### L9-2 モジュールとパッケージ
9-2-1 `export`と`import` / 9-2-2 名前付きとデフォルト / 9-2-3 npmとパッケージ / 9-2-4 `package.json`

### L9-3 tsconfig
9-3-1 `tsconfig.json`とは / 9-3-2 `target`と`outDir` / 9-3-3 `strict` / 9-3-4 `noImplicitAny`と`strictNullChecks`

### L9-4 PrettierとESLint
9-4-1 Prettier / 9-4-2 設定は最小限にする / 9-4-3 ESLint / 9-4-4 自動で回す

---

## コード演習(VS Code 拡張)

手を動かす部分は **VS Code 拡張 (`falcon.informal`) のコード演習**で、`course.json` の `exercises` が正本です(課題本体は `@falcon/shared` の `src/problems/`、採点は QuickJS)。

**この講座の修了には VS Code 拡張が要ります。** 演習を配線していない他の講座と違い、配線した 66 問は `type: "code"` のレッスンとして並び、既定の `require_all_lessons` に数えられます。Web だけではコード演習のレッスンを完了にできない(拡張への引き継ぎ画面が出る)ため、スライド → まとめ → 確認クイズだけでは修了になりません。

**M0〜M4 の 22 レッスンに 3 問ずつ、計 66 問**を配線しています。問題 ID の 3 桁(`S1-Ch01-`**`121`**`-...`)がレッスン番号と対応します(`121` = L1-2 の 1 問目)。3 問はレッスンの takeaway を「新しい構文を書く」「壊れたコードを直す」「型や評価結果が実際どうなるかを確かめる」の組み合わせで押さえます(並びはレッスンごとに違います)。エントリファイルは `main.ts` です(`language: "typescript"`)。

M5 以降(型システム・ジェネリクス・クラス・非同期・実務)は、対応する問題が問題集にまだ無いため配線していません。

`src/problems/` にはこの 66 問のほかに **JavaScript の一般問題が 276 問**あります(`language` 未指定 = `javascript`、エントリは `main.js`)。こちらはレッスン単位ではなく**演習だけの段階(S0〜S5)で並んだ独立したカリキュラム**で、本講座には載せていません。

配線した演習は `type: "code"` のレッスンとして並びます。修了条件の判定では、**`require_assignment_pass` が数えるのは `type: "assignment"` のレッスンだけ**なので(`apps/api/src/lib/stage-auto-complete.ts`)、コード演習は `require_all_lessons`(全レッスンの完了)の側で必須になります。どちらにせよ**講座に載せた演習はクリアの条件に入る**ので、載せる問題を増やすことは修了要件をそのまま増やすことになります。

| レッスン | コード演習 |
|---|---|
| L0-1 なぜTypeScriptを学ぶのか | `S0-Ch00-011-string-plus-number` / `S0-Ch00-012-error-timing` / `S1-Ch00-013-type-erasure` |
| L0-2 Playgroundを使う | `S0-Ch00-021-print-order-lines` / `S0-Ch00-022-fix-unterminated-string` / `S1-Ch00-023-type-annotation-erased` |
| L1-1 変数 | `S1-Ch01-111-declare-three-vars` / `S1-Ch01-112-fix-const-reassign` / `S2-Ch01-113-rewrite-var` |
| L1-2 型注釈と型推論 | `S1-Ch01-121-annotate-four-vars` / `S1-Ch01-122-fix-string-to-number` / `S2-Ch01-123-declare-without-initializer` |
| L1-3 数値と真偽値 | `S1-Ch02-131-coffee-total` / `S1-Ch02-132-boolean-flags` / `S2-Ch02-133-float-compare` |
| L1-4 文字列 | `S1-Ch03-141-order-message` / `S1-Ch03-142-fix-template-literal` / `S2-Ch03-143-string-plus-number` |
| L1-5 リテラル型とユニオン型 | `S1-Ch01-151-order-status` / `S1-Ch01-152-fix-literal-case` / `S2-Ch01-153-union-employee-id` |
| L1-6 nullとundefined | `S1-Ch01-161-optional-fields` / `S1-Ch01-162-typeof-primitives` / `S2-Ch01-163-possibly-undefined` |
| L2-1 ブロックとスコープ | `S1-Ch01-211-block-scope-fix` / `S1-Ch01-212-shadowing-predict` / `S2-Ch01-213-fix-block-discount` |
| L2-2 if文 | `S1-Ch05-221-member-rank` / `S1-Ch05-222-payment-label` / `S2-Ch05-223-fix-else-if-order` |
| L2-3 絞り込み | `S1-Ch05-231-truthy-falsy-six` / `S1-Ch05-232-note-default-value` / `S2-Ch05-233-narrow-coupon-code` |
| L2-4 switch文 | `S1-Ch05-241-payment-method-switch` / `S1-Ch05-242-fix-missing-break` / `S2-Ch05-243-range-needs-if` |
| L3-1 配列 | `S2-Ch04-311-declare-typed-arrays` / `S2-Ch04-312-fix-mixed-number-array` / `S2-Ch04-313-second-and-last` |
| L3-2 配列を使う | `S2-Ch04-321-update-and-push` / `S2-Ch04-322-for-of-total` / `S2-Ch04-323-sum-over-threshold` |
| L3-3 オブジェクト | `S2-Ch08-331-task-object` / `S2-Ch08-332-fix-missing-property` / `S2-Ch08-333-fix-two-mistakes` |
| L3-4 型エイリアス | `S2-Ch08-341-employee-type` / `S2-Ch08-342-employee-list` / `S2-Ch08-343-optional-department` |
| L4-1 関数の基本 | `S2-Ch07-411-describe-product` / `S2-Ch07-412-stock-label` / `S3-Ch07-413-fix-calc-discount` |
| L4-2 関数の書き方 | `S2-Ch07-421-arrow-upper-label` / `S2-Ch07-422-concise-arrow-pair` / `S3-Ch07-423-fix-use-before-declaration` |
| L4-3 引数 | `S2-Ch07-431-price-label-default` / `S2-Ch07-432-join-names-rest` / `S3-Ch07-433-spread-call-fix` |
| L4-4 戻り値と関数の型 | `S2-Ch07-441-show-product-void` / `S2-Ch07-442-formatter-type` / `S3-Ch07-443-return-type-annotation` |
| L4-5 コールバック | `S2-Ch09-451-bracket-all-map` / `S2-Ch09-452-filter-high-prices` / `S3-Ch09-453-in-stock-labels` |
| L4-6 分割代入とOptions Object | `S2-Ch07-461-destructure-product` / `S2-Ch07-462-label-destructured-param` / `S3-Ch07-463-options-object-search` |
