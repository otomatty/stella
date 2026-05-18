# Ch00. セットアップ

実行環境、`console.log`、エラー確認など最初の操作。 「コードを書いて実行する」 体験を S0 で 1 周し、 残りの章へ進むための足がかりにする。

## 含まれるステージ

- **S0** セットアップ — 関数も変数もまだ知らない状態で、 `console.log` 1 行から始める。

## MDN 既定ページ

- [JavaScript の概要](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Introduction)

## ディレクトリ構成

```
00-setup/
├── README.md     # このファイル
├── _index.ts     # 章内 Assignment 配列の集約
└── s0/           # Stage 0 用の問題
    ├── 01-print-hello.ts      # console.log で文字を出す
    ├── 02-print-name.ts       # 自分の名前を出す
    ├── 03-print-number.ts     # 数字を出す
    ├── 04-print-calc.ts       # 計算結果を出す
    ├── 05-print-two-lines.ts  # 2 行出す
    └── 06-print-variable.ts   # 変数に入れて出す
```

## S0 セットアップ問題一覧 (全 6 問)

| #  | id                            | タイトル                  | 概念                       | 期待 stdout      |
|----|-------------------------------|---------------------------|----------------------------|------------------|
| 1  | `S0-Ch00-01-print-hello`      | console.log で文字を出す  | console.log + 文字列        | `Hello, World!`  |
| 2  | `S0-Ch00-02-print-name`       | 自分の名前を出す          | 文字列リテラル              | `Taro`           |
| 3  | `S0-Ch00-03-print-number`     | 数字を出す                | 数値リテラル                | `42`             |
| 4  | `S0-Ch00-04-print-calc`       | 計算結果を出す            | `+` 演算子                  | `15`             |
| 5  | `S0-Ch00-05-print-two-lines`  | 2 行出す                  | 複数 `console.log`          | `Hello\nWorld`   |
| 6  | `S0-Ch00-06-print-variable`   | 変数に入れて出す          | `const` 宣言 + 参照         | `Hello`          |

## 設計メモ

- すべて `testKind: "stdout"` (採点エンジンと最小限の体験を end-to-end で確認するための章)。
- 1 問あたり **3〜5 分** で完了することを目標にしている。
- スカフォールドは 4 段階:
  - `L3` 穴埋め (`____` を埋める)
  - `L2` コメント誘導 (UI が既定で表示する)
  - `L1` ひと言コメントのみ
  - `L0` 空文字列 (チャレンジモード)
- stdout の比較は **末尾の改行を無視** する (`packages/shared/test/runner.ts` の `normalizeStdout` 参照)。 そのため `console.log("Hello")` (内部で末尾 `\n` を含む) と `Hello` (改行なし) が等価になる。
- Ch00 は **S0 専用章**。 Phase 6 の matrix UI でも他ステージには現れない扱いにする。

## 状態

S0 の 6 問が定義済み。
