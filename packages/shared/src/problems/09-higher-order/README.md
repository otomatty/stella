# Ch09. 高階関数

コールバック、 `map` / `filter` / `reduce` などの配列処理。 Ch06 ループの「同じことを繰り返す」 を、 関数を渡す形で抽象化し直す章。

## 含まれるステージ

- **S3** ロジック入門 — `map` / `filter` / `reduce` / `find` を使い分ける。
- **S4** アルゴリズム — `reduce` での集計、 高階関数の合成。
- **S5** 設計演習 — 複数の高階関数を組み合わせたデータ変換パイプライン。

## MDN 既定ページ

- [Array](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Array)

## ディレクトリ構成

```
09-higher-order/
├── README.md
├── _index.ts
├── s3/   # Phase 8 で追加済み (8 問、 末尾は S3 卒業課題)
├── s4/   # Phase 9 で追加済み (5 問、 末尾は S4 卒業課題)
└── s5/   # Phase 9 後半で追加済み (3 問、 末尾は S5 卒業課題)
```

## S3 で扱う問題 (8 問、 8 番目が S3 卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S3-Ch09-01-double-all` | map で要素を変換 |
| 02 | `S3-Ch09-02-only-positive` | filter で条件抽出 |
| 03 | `S3-Ch09-03-sum-with-reduce` | reduce で合計 (初期値必須) |
| 04 | `S3-Ch09-04-names-of` | map でプロパティを取り出す |
| 05 | `S3-Ch09-05-adults` | filter でオブジェクト条件抽出 |
| 06 | `S3-Ch09-06-count-true` | reduce で集計値を作る |
| 07 | `S3-Ch09-07-find-by-name` | find で最初の一致を取り出す |
| 08 | `S3-Ch09-08-pipeline-capstone` ⭐ | **[S3 卒業課題]** filter → map → reduce パイプライン |

### S3 学習ポイント

- S3 は高階関数の **使う側**。 自作する側 (`myMap` / `myFilter`) は S4-S5 で扱う
- `reduce` は **初期値を必ず指定** する (空配列で TypeError を防ぐ)
- メソッドチェーンで filter → map → reduce のパイプラインを書くと宣言的になる

## S4 で扱う問題 (5 問、 5 番目が S4 卒業課題)

S3 で「使う側」 だった高階関数を、 S4 では **自分で作る側** に回る。 `reduce` を必須化し、 `map` / `filter` / `groupBy` / `partition` / `scan` といった他章で既製品として使われるユーティリティを 1 周ループで組み立てる。

| # | ID | 主題 |
|---|---|---|
| 01 | `S4-Ch09-01-my-map` | `reduce` で `map` を自作する |
| 02 | `S4-Ch09-02-partition` | `reduce` で `partition` (述語で 2 配列に分ける) を 1 周で自作する |
| 03 | `S4-Ch09-03-group-by` | `reduce` で `groupBy` (key 関数で `Map` にグルーピング) を自作する |
| 04 | `S4-Ch09-04-scan` | `reduce` の累積過程を配列で残す `scan` を自作する |
| 05 | `S4-Ch09-05-pipeline-capstone` ⭐ | **[S4 卒業課題]** reduce + Map + sort + slice の 4 段パイプラインでカテゴリ別売上トップ N |

### S4 学習ポイント

- **`reduce` を必須化**: AST 制約で `reduce` を使わせ、 `for` ループや `forEach` での代替を禁じている問題がある。 \`acc\` を **return することを忘れない** のが落とし穴
- **コンテナを変えると挙動が変わる**: `groupBy` は `new Map()` を初期値にして `instanceof Map` を満たす (plain object で返さない)
- **1 周で書く意識**: `partition` を `filter` 2 回呼びで書くと配列を 2 周してしまう。 `reduce` の初期値を `[[], []]` にして 1 周で両方を組み立てる
- **累積過程を残す `scan`**: `reduce` が最終値のみを返すのに対し、 中間結果も配列で残すと「累積和」 「累積最大」 などが書ける。 戻り値の先頭は **必ず `init`**
- **複数パイプラインの組み合わせ**: 卒業課題では `reduce` で Map 集計 → `entries()` → `sort` → `slice` の 4 段を 1 つの関数にまとめる

## S5 で扱う問題 (3 問、 3 番目が S5 卒業課題)

S4 までの 「1 つの関数にロジックを詰める」 段階から、 **データ変換の 1 段 = 1 関数** に切り分けて再利用する設計演習の段階へ進む。 4 段以上の `filter` → `map` → `reduce` パイプラインを、 役割の違う名前付き関数に分解し、 メインから順に呼び出して合成する。 さらに `pipe` を自作することで、 「高階関数を受け取り、 高階関数を返す」 関数の練習も行う。

| # | ID | 主題 |
|---|---|---|
| 01 | `S5-Ch09-01-build-leaderboard` | ランキング生成パイプラインを `onlyActive` / `toRanking` / `takeTop` / `buildLeaderboard` の 4 関数に責務分割する |
| 02 | `S5-Ch09-02-pipe-reports` | `pipe(...fns)` を `reduce` で自作し、 同じ部品 (`paidOnly` / `withLineTotal` / `sumLineTotals`) の異なる組み合わせから 2 つのレポート関数を派生させる |
| 03 | `S5-Ch09-03-monthly-sales-report-capstone` ⭐ | **[S5 卒業課題]** 売上ログから月次レポートを生成する 5 段パイプライン (`excludeRefunded` / `withRevenue` / `groupByMonth` / `summarizeMonth` / `monthlySalesReport`) |

### S5 学習ポイント

- **責務分離**: 「データ変換の 1 段 = 1 関数」 に切り出す。 `buildLeaderboard` のような集約点関数は、 自前で `filter` / `map` を書かず、 ヘルパー関数を **呼び出す形** で組み立てる
- **`pipe` で関数合成**: `(x) => fns.reduce((acc, fn) => fn(acc), x)` の 1 行で関数合成ユーティリティが作れる。 これを使うと 「同じ部品から異なるパイプラインを派生」 でき、 `paidRevenue` と `paidOrderCount` を 1 行ずつで定義できる
- **4 段以上のパイプライン**: 卒業課題では `filter` → `map` → `reduce + new Map()` → 各月の `summarizeMonth` を `map` → `sort` の 5 段を、 役割の違う関数に切り分けて組み立てる
- **`sort` はコピーしてから**: `[...arr].sort(...)` でコピーしてから並べ替える規律を S5 全体で守る (`Array.sort` は元配列を破壊する)
- **同点先勝ち**: `>` で比較する (`>=` ではない) ことで、 Map の挿入順 + 安定ソートにより 「先に登場したものを優先」 が自然に達成できる

## 状態

S3: 8 問追加済み (Phase 8)。 S4: 5 問追加済み (Phase 9)。 S5: 3 問追加済み (Phase 9 後半)。
