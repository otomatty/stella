# Ch04. 配列

配列の作成、 参照、 更新、 基本メソッド。 後続のループ・高階関数・アルゴリズムすべての基礎になる、 もう 1 つの「重い章」。

## 含まれるステージ

- **S1** 文法体験 — `[]` リテラル、 添字アクセス、 `length`。
- **S2** 文法定着 — `push` / `pop` / `slice` などの基本操作。
- **S3** ロジック入門 — 配列を引数に取り、 値を 1 つ返す関数。
- **S4** アルゴリズム — 走査・集計・二重ループでの処理。
- **S5** 設計演習 — 複数の配列・データ構造を組み合わせて整形する。

## MDN 既定ページ

- [インデックス付きコレクション](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Indexed_collections)

## ディレクトリ構成

```
04-arrays/
├── README.md
├── _index.ts
├── s1/   # Phase 5 で追加済み (12 問、 末尾はチャレンジ問題)
├── s2/   # Phase 7 で追加済み (13 問、 末尾はチャレンジ問題)
├── s3/   # Phase 8 で追加済み (9 問、 末尾は卒業課題)
├── s4/   # Phase 9 で追加 (5 問、 末尾は S4 卒業課題)
└── s5/   # Phase 9 で追加 (3 問、 末尾は S5 卒業課題)
```

## S1 で扱う問題 (12 問、 12 番目がチャレンジ問題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S1-Ch04-01-array-literal` | [ ] で配列を作る |
| 02 | `S1-Ch04-02-index-access` | 添字 [i] で要素を取り出す |
| 03 | `S1-Ch04-03-length` | .length で要素数を取る |
| 04 | `S1-Ch04-04-push` | push で末尾に追加 |
| 05 | `S1-Ch04-05-pop` | pop で末尾を取り除く |
| 06 | `S1-Ch04-06-unshift` | unshift で先頭に追加 |
| 07 | `S1-Ch04-07-shift` | shift で先頭を取り除く |
| 08 | `S1-Ch04-08-print-array` | 配列をそのまま console.log で出す |
| 09 | `S1-Ch04-09-nested-access` | matrix[i][j] でネスト配列にアクセス |
| 10 | `S1-Ch04-10-update-element` | letters[i] = 値 で要素を上書き |
| 11 | `S1-Ch04-11-array-of-strings` | 添字と length を組み合わせる |
| 12 | `S1-Ch04-12-cart-total-capstone` ⭐ | **[チャレンジ]** 商品リストの合計額を出す |

### S1 学習ポイント

- 添字は **0 から数える**。 最後は `arr.length - 1`
- ループは S2 以降。 S1 では添字を 0, 1, 2 と並べて書く範囲に絞る
- `push` / `pop` (末尾)、 `unshift` / `shift` (先頭) の対比
- `const` で宣言した配列の **中身は書き換え可能** (要素更新・push 可)

## S2 で扱う問題 (13 問、 13 番目がチャレンジ問題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S2-Ch04-01-indexOf` | indexOf で要素位置を取得 |
| 02 | `S2-Ch04-02-includes` | includes で要素の有無 |
| 03 | `S2-Ch04-03-slice-basic` | slice(start, end) で部分配列 |
| 04 | `S2-Ch04-04-slice-negative` | 負の引数で末尾を取る |
| 05 | `S2-Ch04-05-concat` | concat で結合 |
| 06 | `S2-Ch04-06-join` | join で区切り文字列に |
| 07 | `S2-Ch04-07-reverse` | reverse で逆順 (破壊的) |
| 08 | `S2-Ch04-08-array-isarray` | Array.isArray で判定 |
| 09 | `S2-Ch04-09-copy-via-slice` | slice() でコピーを作る |
| 10 | `S2-Ch04-10-flat` | flat で二重配列を平らに |
| 11 | `S2-Ch04-11-fill` | new Array(n).fill(v) |
| 12 | `S2-Ch04-12-at-negative` | at(-1) で末尾要素 |
| 13 | `S2-Ch04-13-sum-capstone` ⭐ | **[チャレンジ]** for ループで配列合計 |

### S2 学習ポイント

- `indexOf` / `includes` で要素の検索。 `includes` は真偽値、 `indexOf` は位置 (見つからないと -1)
- `slice` は **破壊しない**、 `reverse` / `sort` は **破壊する**。 元配列を残したいときは `slice()` でコピーしてから呼ぶ
- `Array.isArray` で型判定 (`typeof` だと "object" になる)
- `at(-1)` で末尾要素を読みやすく取得
- チャレンジでは for ループ (Ch06 で詳しく扱う) と配列を組み合わせる

## S3 で扱う問題 (9 問、 9 番目が S3 卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S3-Ch04-01-sum-array` | for...of で合計を計算 |
| 02 | `S3-Ch04-02-max-value` | Math.max を使わず最大値を更新 |
| 03 | `S3-Ch04-03-count-positive` | 条件カウント |
| 04 | `S3-Ch04-04-filter-even` | push で偶数だけ集める |
| 05 | `S3-Ch04-05-last-element` | 末尾要素 (空なら undefined) |
| 06 | `S3-Ch04-06-unique-values` | includes で重複排除 |
| 07 | `S3-Ch04-07-array-average` | 合計 / 要素数で平均 |
| 08 | `S3-Ch04-08-find-first-index` | indexOf を使わず添字探索 |
| 09 | `S3-Ch04-09-stats-capstone` ⭐ | **[S3 卒業課題]** sum/min/max/avg を 1 オブジェクトで返す |

### S3 学習ポイント

- 配列処理の **for ループ + 累積** が S3 の基本形 (reduce / filter は Ch09 で扱う)
- 「新しい配列を作る」 系は \`const result = []\` + push が定番
- min / max は **初期値を arr[0]** にすると安全
- 1 回のループで複数の集計を同時にやれると S4 アルゴリズムへの足がかりになる

## S4 で扱う問題 (5 問、 5 番目が S4 卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S4-Ch04-01-prefix-sum` | 累積和テーブル `prefix[i] = arr[0]..arr[i-1]` を作る |
| 02 | `S4-Ch04-02-range-sum` | 累積和で区間 `[l, r)` の合計を O(1) で取り出す |
| 03 | `S4-Ch04-03-running-max` | 各位置までの累積最大値を 1 周で配列に書き出す |
| 04 | `S4-Ch04-04-max-window-sum` | 固定幅 k のスライディングウィンドウで最大合計を O(n) で求める |
| 05 | `S4-Ch04-05-split-by-threshold-capstone` ⭐ | **[S4 卒業課題]** 閾値以上が連続する区間 `{start, end, sum}` を全て抽出 |

### S4 学習ポイント

- **前処理パターン**: 累積和を 1 度作っておけば、 任意区間の合計は `prefix[r] - prefix[l]` で O(1) (Q01 / Q02)
- **走査 + 状態**: 「ここまでの最大」 (Q03)、 「現在の区間」 (Q05) のように、 状態を保持して 1 周で答えを出す
- **スライディングウィンドウ**: 差分更新 (新要素を足し、 抜ける要素を引く) で O(n*k) を O(n) に落とす (Q04)
- **S3 との違い**: S3 は単純走査・単発集計が中心。 S4 では **前処理 / 状態遷移 / 差分計算** など 1 段上のアルゴリズム発想が主役
- `reduce` / `map` / `filter` / `slice` は Ch09 で扱うので、 ここでは添字 for と if で手書きする

## S5 で扱う問題 (3 問、 3 番目が S5 卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S5-Ch04-01-top-tags-ranking` | タグの出現回数を集計 → Object.entries → sort + slice で上位 N 件 |
| 02 | `S5-Ch04-02-students-above-average` | 名前配列と点数配列を index 連動で合成 → 平均超えだけ filter → sort |
| 03 | `S5-Ch04-03-popular-products-capstone` ⭐ | **[S5 卒業課題]** 購入ログから 商品ごとの 延べ件数 と ユニークユーザー数 を集計してランキング |

### S5 学習ポイント

- **パイプライン化**: オブジェクトで集計した結果を `Object.entries(...)` で配列に戻し、 `.map → .sort → .slice` で 「整形 → 並べ替え → 切り出し」 のチェーンに乗せる
- **2 段ソート**: `sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))` のように `||` で第 2 キーを書く定型を覚える
- **複数配列の連動**: 同じ index で対応する 2 配列は `names.map((name, i) => ({ name, score: scores[i] }))` で **オブジェクト配列に合成** してから filter / sort すると設計がきれい
- **配列を状態として使う**: capstone では `users: []` を `includes` でユニーク判定しながら成長させる。 オブジェクトに対する「値の中身が配列」 のパターンも S5 では頻出
- S4 までと違って **`map` / `filter` / `sort` / `slice` を積極的に使う** のが S5。 ループでも書けるが、 チェーンで読みやすく書く設計力を育てる

## 状態

S1: 12 問、 S2: 13 問、 S3: 9 問、 S4: 5 問、 S5: 3 問追加済み (Phase 5 / Phase 7 / Phase 8 / Phase 9)。 Ch04 配列 章は完成。
