# Ch05. 条件分岐

`if` / `else`、 比較、 論理演算、 `switch`。 「場合分けして違う処理をする」 ことを S2 から導入し、 後続全ステージで使い続ける。

## 含まれるステージ

- **S2** 文法定着 — `if` / `else if` / `else` の基本形、 比較演算子、 `switch`、 三項演算子。
- **S3** ロジック入門 — 三項演算子・短絡評価、 関数内での分岐。
- **S4** アルゴリズム — 複数条件の組み合わせ、 早期 return。
- **S5** 設計演習 — 状態遷移・パターンマッチに近い分岐の整理。

## MDN 既定ページ

- [制御フローとエラー処理](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)

## ディレクトリ構成

```
05-conditionals/
├── README.md
├── _index.ts
├── s2/   # Phase 7 で追加済み (15 問)
├── s3/   # Phase 8 で追加済み (5 問)
├── s4/   # Phase 9 で追加済み (5 問。 最後の 1 問は卒業課題)
└── s5/   # Phase 9 で追加済み (3 問。 最後の 1 問は卒業課題)
```

## S2 で扱う問題 (15 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S2-Ch05-01-if-positive` | if で正数判定 |
| 02 | `S2-Ch05-02-if-else-even-odd` | if/else で偶奇判定 |
| 03 | `S2-Ch05-03-else-if-grade` | else if で 3 段階成績判定 |
| 04 | `S2-Ch05-04-and-operator` | && で AND 連結 |
| 05 | `S2-Ch05-05-or-operator` | `\|\|` で OR 連結 |
| 06 | `S2-Ch05-06-not-operator` | ! で真偽値反転 |
| 07 | `S2-Ch05-07-ternary-basic` | 三項演算子で値選択 |
| 08 | `S2-Ch05-08-strict-equal` | === で厳密等価 |
| 09 | `S2-Ch05-09-not-equal` | !== で不等価 |
| 10 | `S2-Ch05-10-truthy-falsy` | 空文字は falsy |
| 11 | `S2-Ch05-11-switch-day` | switch で曜日判定 |
| 12 | `S2-Ch05-12-ternary-chain` | 三項を 2 段で連結 |
| 13 | `S2-Ch05-13-range-check` | && で範囲チェック |
| 14 | `S2-Ch05-14-default-fallback` | `\|\|` でデフォルト値 |
| 15 | `S2-Ch05-15-switch-default` | switch の default 分岐 |

### S2 学習ポイント

- `if (条件) { ... }` の `条件` には **真偽値になる式** を書く
- `==` ではなく `===` を使う (型まで比較。 lint プリセットでも `eqeqeq` を error にしている)
- `&&` / `||` は短絡評価。 `||` はデフォルト値の指定として 1 行で書ける
- `switch` は値の一致を複数候補と比較。 各 case の末尾に `break;` を忘れない
- 三項演算子 `条件 ? 真 : 偽` は **値を選ぶ式**。 ネストは 2 段までに留める

## S3 で扱う問題 (5 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S3-Ch05-01-classify-number` | 正 / 負 / ゼロ の 3 分岐 |
| 02 | `S3-Ch05-02-day-kind` | `\|\|` で曜日番号 → 平日 / 休日 |
| 03 | `S3-Ch05-03-categorize-age` | 範囲の連続分岐で世代カテゴリ |
| 04 | `S3-Ch05-04-compare-count` | 2 値比較の 3 通り分岐 |
| 05 | `S3-Ch05-05-max-of-three` | Math.max を使わず 3 値の最大 |

### S3 学習ポイント

- **早期 return** を使うと分岐の階層が浅く保てる
- 「等しい」 判定を後置すると、 `>` `<` の境界が明確になる
- AST `IfStatement` を必須にすることで、 三項だけで済ませない練習にもなる

## S4 で扱う問題 (5 問)

| # | ID | 主題 |
|---|---|---|
| 01 | `S4-Ch05-01-order-status-transition` | `switch` で状態遷移を整理する |
| 02 | `S4-Ch05-02-validate-user-input` | ガード節 (`if (...) return;`) で異常系を順番に弾く |
| 03 | `S4-Ch05-03-score-band` | 入力検証 + 範囲判定 (`>=` の階段) でスコア帯を返す |
| 04 | `S4-Ch05-04-business-hours` | `&&` / `\|\|` の複合条件と短絡評価で営業時間を判定する |
| 05 | `S4-Ch05-05-account-action-capstone` | [卒業課題] `switch` × ガード節で口座の状態機械を組む |

### S4 学習ポイント

- **状態 (status) ベースで分岐するときは `switch`**。 `if` の連鎖よりも「どんな状態がありうるか」 が一目で分かる
- **ガード節 (guard clause)** で異常系を関数の冒頭に集めると、 後段の「正常系」 のロジックが薄くなる
- 範囲判定は **`>=` の階段** で書く。 `if (avg >= 90) ...; if (avg >= 80) ...;` の順なら、 上の条件で外れた値の範囲が自動的に確定する
- 入力検証は \`Number.isInteger\` などの組み込みで型と範囲をまとめて押さえる
- 卒業課題では **状態の switch の中で、 さらに操作の switch / ガード節** を組み合わせる「2 段の場合分け」 を練習する

## S5 で扱う問題 (3 問、 3 番目が S5 卒業課題)

| # | ID | 主題 |
|---|---|---|
| 01 | `S5-Ch05-01-vending-machine-transition` | 多次元の状態オブジェクト (status × balance × selectedItem) を switch + スプレッドで安全に更新する不変更新パターン |
| 02 | `S5-Ch05-02-shipping-fee-priority` | 仕様の優先順位 (入力検証 → 会員特典 → 閾値特典 → 通常計算) どおりに guard 節を並べ、 早期 return で深いネストを避ける |
| 03 | `S5-Ch05-03-permission-matrix-capstone` ⭐ | **[S5 卒業課題]** 長い if/switch 連鎖を 「データ + ルックアップ + 配列メソッド」 に置き換え、 ロール継承の連鎖を while で辿るデータ駆動分岐 |

### S5 学習ポイント

- **状態遷移表**: status × action の組み合わせを 2 段 switch で表現し、 スプレッド構文で **元の state を破壊しない新オブジェクト** を返す不変更新パターン
- **仕様優先順位**: 上位仕様 (異常入力・会員特典・閾値特典) から **早期 return** で離脱し、 残ったケースだけが通常計算に進む構造。 `max-depth ≤ 3` の S5 lint 制約とも自然に馴染む
- **データ駆動**: 長い if/switch を **オブジェクトのルックアップ + 配列メソッド (`includes`)** に置き換える。 卒業課題では AST で `SwitchStatement` を **禁止** することで、 データ構造で書くことを強制する
- **継承の連鎖**: マトリクスの \`inherits\` を辿る while ループは、 無限ループ防止のため depth カウンタで上限を設ける
- **拒否理由の区別**: 卒業課題では戻り値を \`{ allowed, reason }\` 形式にし、 5 種類の拒否理由 (\`invalid-input\` / \`unknown-role\` / \`unknown-resource\` / \`action-not-allowed\` / \`ok\`) を分けて返す
- **純粋関数性**: 卒業課題のテストには 「呼び出し前後で `PERMISSIONS` の構造が変わらない」 「同じ引数で 2 回呼んで同じ結果を返す」 という不変条件が含まれる

## 状態

S2: 15 問、 S3: 5 問、 S4: 5 問、 S5: 3 問追加済み (Phase 7 / Phase 8 / Phase 9)。 Ch05 条件分岐 章は完成。
