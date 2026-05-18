# Ch06. ループ

`for` / `while` / `for...of` と `break` / `continue`。 「同じことを繰り返す」 という発想を生で書く章。 高階関数 (Ch09) の前提となる。

## 含まれるステージ

- **S2** 文法定着 — 単純な `for (let i = 0; ...)` / `while` / `do-while` / `break` / `continue`。 末尾に **チャレンジ** (FizzBuzz)。
- **S3** ロジック入門 — 配列の走査・累積で値を 1 つ返す。
- **S4** アルゴリズム — 二重ループ、 累積、 `break` / `continue` の活用。
- **S5** 設計演習 — ループとデータ構造を組み合わせた処理。

## MDN 既定ページ

- [ループと反復処理](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Loops_and_iteration)

## ディレクトリ構成

```
06-loops/
├── README.md
├── _index.ts
├── s2/   # Phase 7 で追加済み (16 問、 末尾はチャレンジ問題 FizzBuzz)
├── s3/   # Phase 8 で追加済み (5 問)
├── s4/   # Phase 9 で追加済み (5 問、 末尾は卒業課題 transpose)
└── s5/   # Phase 9 で追加済み (3 問、 末尾は卒業課題 top-spender-per-category)
```

## S2 で扱う問題 (16 問、 16 番目がチャレンジ問題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S2-Ch06-01-for-count-up` | for で 0-4 を出す |
| 02 | `S2-Ch06-02-for-count-down` | for で 5-1 を出す |
| 03 | `S2-Ch06-03-while-loop` | while の基本 |
| 04 | `S2-Ch06-04-do-while` | do-while で最低 1 回 |
| 05 | `S2-Ch06-05-sum-1-to-n` | 1〜10 の合計 |
| 06 | `S2-Ch06-06-factorial` | 5! を計算 |
| 07 | `S2-Ch06-07-array-iterate` | 配列要素を順に出す |
| 08 | `S2-Ch06-08-break-first-match` | break で最初の偶数 |
| 09 | `S2-Ch06-09-continue-skip` | continue で偶数をスキップ |
| 10 | `S2-Ch06-10-nested-loop` | 九九の 2 の段 |
| 11 | `S2-Ch06-11-count-even` | 偶数の個数を数える |
| 12 | `S2-Ch06-12-string-iterate` | 文字列を 1 文字ずつ |
| 13 | `S2-Ch06-13-find-max` | 配列の最大値 |
| 14 | `S2-Ch06-14-reverse-print` | 配列を逆順に出力 |
| 15 | `S2-Ch06-15-power-loop` | 2 の 8 乗をループで |
| 16 | `S2-Ch06-16-fizzbuzz-capstone` ⭐ | **[チャレンジ]** FizzBuzz |

### S2 学習ポイント

- `for (let i = 0; i < n; i++) { ... }` の三要素 (初期化・条件・更新) を理解する
- 累積パターン: `let total = 0; for { total += ... }`
- `break` は即終了、 `continue` は今回スキップ。 用途を使い分ける
- 境界条件 `i < arr.length` vs `i <= arr.length - 1`。 off-by-one バグの最頻出
- FizzBuzz では「判定の **順序** が結果を変える」 ことを体感する (15 の倍数を最初にチェック)

## S3 で扱う問題 (5 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S3-Ch06-01-countdown-string` | カウントダウン文字列を組み立てる |
| 02 | `S3-Ch06-02-multiplication-table-row` | 九九の 1 行を配列で返す |
| 03 | `S3-Ch06-03-sum-of-divisors` | 約数の総和 |
| 04 | `S3-Ch06-04-repeat-join` | 区切り文字付きで文字列を n 回繰り返す |
| 05 | `S3-Ch06-05-reverse-array` | reverse を使わず配列反転 |

### S3 学習ポイント

- 累積パターンが「数値の和」 から **「配列に push して join」** へ広がる
- カウントダウン (`i--`) と末尾走査 (`i = arr.length - 1`) を関数化して扱う
- 区切り文字をきれいに挟むには **配列 + join** が安全 (末尾余分を防げる)

## S4 で扱う問題 (5 問、 5 番目が卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S4-Ch06-01-multiplication-table` | 九九の表を二次元配列で返す |
| 02 | `S4-Ch06-02-is-prime` | 素数判定 (早期 return で打ち切る) |
| 03 | `S4-Ch06-03-matrix-sum` | 二次元配列の全要素を合計する |
| 04 | `S4-Ch06-04-find-pair-sum` | 和が target になるインデックスペアを返す |
| 05 | `S4-Ch06-05-transpose-capstone` ⭐ | **[卒業課題]** 行列の転置 |

### S4 学習ポイント

- **二重ループ** で二次元配列 (行列) を組み立てる・走査する。 外側を行・内側を列で回す王道形を体得する
- **早期脱出**: ループ内で答えが確定したら `return` で関数ごと抜ける。 `break` でフラグを立てる書き方より素直で読みやすい
- 「最初に見つかった結果」を返したいときは **二重ループ + `i < j` の組み立て** + 即 `return` が定番パターン
- 行列の転置では「外側を列・内側を行」と **二重ループの軸を反転** させる発想が要

## S5 で扱う問題 (3 問、 3 番目が S5 卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S5-Ch06-01-two-sum-map` | 二重ループ O(n²) を Map で単一周回 O(n) に置き換える |
| 02 | `S5-Ch06-02-first-duplicate-action` | Map<userId, Set<action>> + 重複が見つかった瞬間に早期 return |
| 03 | `S5-Ch06-03-top-spender-per-category-capstone` ⭐ | **[S5 卒業課題]** 多重ループを 「集計」 と 「最大選び」 に分割 + Map of Map |

### S5 学習ポイント

- **計算量を意識した設計**: S4 で書いた二重ループ O(n²) を、 「過去に見た値とその index」 を **Map に覚えながら 1 周** することで O(n) に圧縮する。 `seen.has(...)` が平均 O(1) でできるのが Map の強み
- **早期 return の徹底**: ループ内で答えが確定したら、 `break` + フラグ + 後処理ではなく **その場で `return`** する。 設計が短く、 「return の場所」 が読み手に伝わる
- **入れ子データ構造**: `Map<userId, Set<action>>` や `Map<category, Map<userId, total>>` のように、 Map の値に Map / Set を入れる二段構造で 「ユーザーごと」 「カテゴリごと」 の集計を独立に行う
- **多重ループの分割**: 「集計のためのループ」 と 「集計結果から答えを取り出すループ」 を **意図的に 2 つに分ける**。 1 周にまとめようとすると 「集計しながら最大も同時に管理」 になり読みづらい
- S4 までは for / while だけだったが、 S5 では **`new Map()` / `new Set()` のコンストラクタ呼び出し** と **`for...of` で Map のエントリを分解** するパターンを身につける
- `.map` / `.filter` / `.sort` / `.reduce` は Ch06 ではまだ使わない (Ch09 で導入)。 ループ + 比較で素直に書き切る練習

## 状態

S2: 16 問、 S3: 5 問、 S4: 5 問、 S5: 3 問追加済み (Phase 7 / Phase 8 / Phase 9)。
