# 問題ファイル ルート

このディレクトリは新カリキュラム (Stage × Chapter の 2 軸) で再設計中。 旧 20 章 (`00-first-function/` 〜 `19-async/`) は Phase 2 (#26) で全削除済み。

## 章フォルダ一覧

各章 README は当該フォルダの `README.md` を参照。

| フォルダ | 章 | 含まれるステージ |
|---|---|---|
| [`00-setup/`](./00-setup/README.md) | Ch00 セットアップ | S0 |
| [`01-variables/`](./01-variables/README.md) | Ch01 変数 | S1, S2, S3 |
| [`02-numbers/`](./02-numbers/README.md) | Ch02 数値・演算 | S1, S2, S3, S4 |
| [`03-strings/`](./03-strings/README.md) | Ch03 文字列 | S1, S2, S3, S4, S5 |
| [`04-arrays/`](./04-arrays/README.md) | Ch04 配列 | S1, S2, S3, S4, S5 |
| [`05-conditionals/`](./05-conditionals/README.md) | Ch05 条件分岐 | S2, S3, S4, S5 |
| [`06-loops/`](./06-loops/README.md) | Ch06 ループ | S2, S3, S4, S5 |
| [`07-functions/`](./07-functions/README.md) | Ch07 関数 | S2, S3, S4, S5 |
| [`08-objects/`](./08-objects/README.md) | Ch08 オブジェクト | S3, S4, S5 |
| [`09-higher-order/`](./09-higher-order/README.md) | Ch09 高階関数 | S3, S4, S5 |
| [`10-data-structures/`](./10-data-structures/README.md) | Ch10 データ構造 | S4, S5 |
| [`11-algorithms/`](./11-algorithms/README.md) | Ch11 アルゴリズム | S4, S5 |
| [`12-debug/`](./12-debug/README.md) | Ch12 デバッグ | S0, S1, S2, S3, S4, S5 |
| [`13-error-handling/`](./13-error-handling/README.md) | Ch13 エラー処理 | S3, S4, S5 |
| [`14-regex/`](./14-regex/README.md) | Ch14 正規表現 | S3, S4, S5 |
| [`15-class/`](./15-class/README.md) | Ch15 class | S4, S5 |
| [`16-async/`](./16-async/README.md) | Ch16 非同期 | S4, S5 |

## 章フォルダの構造

各 `XX-chapter/` の中身:

```
XX-chapter/
├── README.md     # 章の概要 + 含まれるステージ + 既定 MDN URL（章 README 内に記載）
├── _index.ts     # 当該章の Assignment[] を集約 (現在は空配列)
└── s{N}/         # ステージ別サブフォルダ。 1 ファイル = 1 課題で配置
    ├── ...
```

## ルート集約

[`./index.ts`](./index.ts) が 17 章の `_index.ts` を import して `assignments` / `chapters` を結合する。 章 × ステージ matrix UI 向けに、 以下の helper を提供する:

- `assignments`: 全課題の配列
- `chapters`: 全章の配列 (`packages/shared/src/curriculum/chapters.ts` 由来)
- `findAssignment(id)`: 課題 ID で検索
- `findChapter(id)`: 章 ID で検索
- `assignmentsByChapter(chapterId)`: 指定章の課題のみ
- `assignmentsByStage(stage)`: 指定ステージの課題のみ

## 関連ドキュメント

- [`../types.ts`](../types.ts) — `Assignment` / `Stage` / `Chapter` などの型定義
- [`../curriculum/stages.ts`](../curriculum/stages.ts) — ステージ定義
- [`../curriculum/chapters.ts`](../curriculum/chapters.ts) — 章定義 (`defaultMdnPage` / `mdnPageTitle`)
- [`./_common.ts`](./_common.ts) — 全章共通の Lint ルール骨格

## 問題作成ガイド

### 前提

- **1 課題 = 1 ファイル**。`XX-topic/s{N}/` に `export const xxx: Assignment = { ... }` で置く。
- その章の `_index.ts`（例: [`01-variables/_index.ts`](./01-variables/_index.ts)）から export し、ルート [`./index.ts`](./index.ts) の import に繋がっていること。
- 章単位の説明・問題一覧は当該 [`XX-topic/README.md`](./01-variables/README.md) にも反映すると、ブラウザ外でのレビューが楽になる。

### MDN を軸にする

カリキュラムを組み立てるときの **主な参照元** は次の 2 系統である。

- **Learn（動的スクリプティング）** — チュートリアル・課題が並んだ入門コース。[JavaScript による動的スクリプティング](https://developer.mozilla.org/ja/docs/Learn_web_development/Core/Scripting)
- **JavaScript ガイド** — 言語機能の横断的な説明。[JavaScript ガイド](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide)

**章レベル**では [`../curriculum/chapters.ts`](../curriculum/chapters.ts) の `defaultMdnPage` に「その章を代表する 1 ページ」の URL を、`mdnPageTitle` にブラウザタイトルから ` | MDN` や ` | ウェブ開発の学習 | MDN` を除いた **実ページ名** を書く。

**課題レベル**では `Assignment.mdnSections` に **必ず 1 件以上** 入れる（新規・改稿時の方針）。

- **同一ページ内の見出し** — `heading` のみ（省略時、URL の `#` は `heading` と一致する日本語アンカーを想定）。ベース URL は章の `defaultMdnPage`（フラグメントは UI 側で除去してから `#見出し` を付与）。
- **別ページを指すとき** — `pageUrl` に該当ページのベース URL（`#` なし）、**必ず** `pageTitle` にそのページの MDN タイトルも書く。例: [`01-variables/s1/11-template-literal-basic.ts`](./01-variables/s1/11-template-literal-basic.ts)

記号を含む見出しでアンカーが自動生成とずれる場合は `anchor` を明示する（[`../types.ts`](../types.ts) の `MdnSection` 参照）。

### `Assignment` チェックリスト

型定義は [`../types.ts`](../types.ts)。

| 項目 | メモ |
|------|------|
| `id` | `S{stage}-Ch{nn}-{連番}-{slug}` など、リポジトリ内で一意。 |
| `stage` / `chapterId` / `sequence` | 一覧・並び順に直結。 |
| `title` / `newConcept` | UI の見出し・バッジ用。 |
| `estimatedMinutes` / `difficulty` | 目安。 |
| `testKind` | `stdout`（`console.log` 捕捉）か `function`（式評価）か。ステージの [`../curriculum/stages.ts`](../curriculum/stages.ts) と整合させる。 |
| `description` | Markdown。**よく使う見出し**: `## やること` / `## 期待する出力` / `## ポイント`。 |
| `starterFiles` | エディタの初期表示ファイル群 (`AssignmentFile[]`)。 単一ファイル課題では [`_common.ts`](./_common.ts) の `singleFile(\`...\`)` ヘルパで生成する (`starterFiles: singleFile(\`...\`)` の形)。 コメントの書き方は [スターターのコメント規約](#スターターのコメント規約) に従う。 |
| `tests` | `stdout` なら `expectedStdout`（末尾改行は比較時に無視）、`function` なら評価する `code` 式。 |
| `entryPoints` | `function` 採点で抽出する名前。 |
| `solution` | 模範解答。CI の回帰で「全チェック通過」に使う。 |
| `badSolutions` | あえて不正解なコード（テスト / Lint / AST のどれかが必ず失敗すること）。 |
| `staticAnalysis` | ESLint ルールや AST の `required` / `forbidden`。 |
| `mdnSections` | 上記 MDN 方針に従い、**1 件以上** を目標にする。 |

### スターターのコメント規約

エディタの初期表示は学習者が **最初に目にする情報** であり、 ここで答えそのものを露出させると課題として成立しない。 全章共通で次のルールに従う。

1. **リテラル JS をコメントに書かない。** `// const x = 1;` のような JavaScript コードを並べると、 学習者は `//` を消すだけで正解にできてしまう。 構文 (`const ... = ...;` / `function name() { ... }` / `if (...) { ... }` など) は学習者が自分で書く部分として残し、 コメントには **操作の意図** だけを自然言語で書く。
2. **1 コメント = 1 処理** に分解する。 そのコメントの **すぐ下の行** が学習者がコードを書く場所になるようにし、 コメントブロックとコメントブロックの間には空行を 1 行入れて視覚的に区切る。 課題に手順が複数あるときは、 上から実行順に並べる。
3. **「何を」 を書き、 「どう書くか」 は書かない。** コメントは「教科名を `const` の変数に入れる」のように **やる操作** を書く。 「`const subject = "JavaScript";` と書く」のように **構文の見本** を書かない (それは `hints` 配列で段階開示する役目)。
4. **罠の回避だけは括弧コメントで補足する。** `badSolutions` で潰したい誤答 (例: 計算結果を直接書く・1 回の `console.log` で `\n` を使う) があるなら、 該当する処理コメントの直下に `// (...のように書かないこと)` を 1 行だけ添える。 補足は最小限にする。
5. **変数名・具体値はコメントから出さない。** AST で `staticAnalysis.ast.required` の `name` で固定している変数名や、 期待出力に対応するリテラル値 (`"Hello"` / `42` / `80 + 15` など) は **starter には書かず、 `description` に集める**。 starter のコメントは「教科名を `const` の変数に入れる」「2 つの数値を `+` で足し算してから `const` の変数に入れる」のように **抽象度を 1 段上げて** 書く。 学習者には説明文を読ませる前提にする (説明文には「期待する出力」「変数名」「値」をすべて明記しておく)。
6. **ヒント (`hints`) と切り分ける。** `starterFiles` は「最低限のスキャフォールド」、 `hints` は「段階的に開示する補助」、 `solution` は「最終的な答え」、 と役割を分ける。 コードの見本やリテラル断片は `hints` 以降にだけ置く。

#### スカフォールド強度の目安

[`00-setup/README.md`](./00-setup/README.md) で定義済みの 4 段階を全章のデフォルトとする。 上に行くほど手厚い。

| レベル | 用途 | スターターの中身 |
|---|---|---|
| `L3` 穴埋め | 入門・初出概念 | `____` を含む不完全コードを置く。 学習者は `____` だけ埋める |
| `L2` コメント誘導 | 標準 (大半の課題) | 上記 1〜6 の規約に沿って 1 処理 = 1 コメントを並べる |
| `L1` ひと言コメント | 慣れてきた章 | 全体方針を 1〜2 行のコメントで示す程度 |
| `L0` 空 | チャレンジ / capstone | 空文字列 + 末尾改行のみ。 ただし capstone でも、 章の難易度カーブによっては L2 を採用してよい |

#### 例

良い例 ([`00-setup/s0/07-score-challenge.ts`](./00-setup/s0/07-score-challenge.ts)):

```js
// 教科名を const の変数に入れる


// 2 つのテストの点数を + で足し算して、 計算結果を const の変数に入れる
// (答えを直接書かずに、計算式のまま入れる)


// 1 つ目の変数を console.log で出力する


// 2 つ目の変数を console.log で出力する
```

学習者は `description` を読み、 「教科名 = `"JavaScript"`」「変数名 = `subject`/`total`」「点数 = `80` と `15`」を把握する前提。

悪い例 1 (リテラル JS を並べているだけで `//` を外せば正解):

```js
// 1. const subject = "JavaScript";
// 2. const total = 80 + 15;
// 3. console.log で subject と total を順に出す
```

悪い例 2 (変数名・値を starter のコメントに露出している):

```js
// 教科名 "JavaScript" を const の変数 subject に入れる
// 2 つのテストの点数 (80 と 15) を + で足し算して const の変数 total に入れる
// subject を console.log で出力する
// total を console.log で出力する
```

#### 既存課題の自動チェック

スキャナがあるので、 既存・新規の課題が規約 1 / 3 / 5 を破っていないか確認できる:

```bash
bun --filter @falcon/shared scan-starter-comments            # 全課題の詳細を表示
bun --filter @falcon/shared scan-starter-comments --summary  # 章別件数のみ
```

検出はヒューリスティック (リテラル JS の混入を中心に拾う) なので、 false positive はあり得る。 0 件でなければ少なくとも目視チェック対象として扱うのが目安。

### 章を丸ごと見直す手順（テンプレ）

1. Learn / Guide の該当章を開き、目次と見出しを眺める。
2. 既存の各課題と MDN 見出しの対応表を書く（スプレッドシートやメモでよい）。
3. 抜け・重複・難易度の飛びを洗い出す。
4. 課題ファイルを 1 本ずつ更新（`mdnSections` / 語句 / `tests` / `solution`）。
5. 章の `_index.ts` と [`../curriculum/chapters.ts`](../curriculum/chapters.ts) の URL・タイトルがまだ妥当か確認する。

### 動作確認

リポジトリルートで:

```bash
bun --filter @falcon/shared typecheck
bun --filter @falcon/shared test
bun --filter @falcon/shared check-integrity
bun --filter @falcon/code-runner typecheck
```

クライアントのビルドまで確認する場合は `bun --filter @falcon/code-runner build`。
