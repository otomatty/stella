# 開発環境とWebの入口のカリキュラム

状態は準備中。本文は[06 版2.3](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md)に沿って作成中である。M01に対応し、予定時間は35時間である。

## 到達目標

STELLAで課題を開き、確認・提出・結果の確認まで行える。作業フォルダーと保存先を説明し、HTMLの作成・保存・表示・再開、相対リンク、ターミナル、Node.js・npmの診断、Gitの記録、サーバーの起動・停止を資料を参照して自分で行える。困った状態と試したことを伝えられる。

## 前提ステージ

なし。スキルツリーの唯一の入口である。

## 単元構成

| 単元 | 題 | 時間 | ログイン前に読める | 主な課題 |
| --- | --- | ---: | --- | --- |
| U00 | Stellaで学ぶ流れと事前確認 | 1 | ○ | なし |
| U01 | VS CodeとSTELLA拡張の準備 | 3 | ○ | なし(接続はU02の最初の課題で確かめる) |
| U02 | はじめての課題を出す | 3 | × | 最初のページ(今のq01を改修)、見出しをもう一度変える |
| U03 | 画面とファイルの操作 | 5 | × | 基礎Q01〜Q04、修正R02 |
| U04 | ページを増やしてつなぐ | 4 | × | 接続C01・C02、修正R01・R03 |
| U05 | ターミナルとNode.js・npm | 4 | × | 基礎Q06、環境診断 |
| U06 | Gitで変更を残す | 4 | × | 学習フォルダーをGitで管理する、差分を説明する |
| U07 | ローカルサーバーで開く | 3 | × | 提供スターターの起動・停止・再起動 |
| U08 | まとめと確認A | 4 | × | 自力S01・S02、統合T01、確認A |
| 横断 | OSとファイル、Webのしくみ、記録の残し方、復習 | 4 | 一部 | 知識問題 |
| 合計 | | 35 | | |

## Stellaの機能をどこで初めて教えるか

| 機能 | 初めて出る場所 | 動画 |
| --- | --- | --- |
| スキルツリー、ガイド、学習のペース | U00 | Web収録 |
| 拡張、接続、学習フォルダー、課題文のパネル | U01 | VS Code収録 |
| 確認、提出、AIの一次レビュー、ヒント、星の進捗 | U02 | VS Code収録・Web収録 |
| 今日の復習(知識問題) | U03 | Web収録 |
| 解答例、講師に相談、類題 | U04 | VS Code収録・Web収録 |
| 環境診断 | U05 | VS Code収録 |
| 説明を添えた提出 | U06 | VS Code収録 |
| 確認A、確認B、修了、腕試し、島 | U08 | Web収録 |
| 固定した開始点 | M02以降の、前の成果物を使う最初の課題 | VS Code収録 |
| CIの照合 | `deploy-ops-basics` | (そのステージで作る) |

## 後続ステージへの引き継ぎ

| 項目 | 引き継ぐこと | 詳細 |
| --- | --- | --- |
| 手元にあるもの | VS CodeとSTELLA拡張、学習フォルダー `web-training`、Gitの学習リポジトリ、Node.js・npm、サーバーの起動・停止の経験 | [06 §9.1](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#91-修了したときに受講者の手元にあるもの) |
| スキル | 既存2個と追加9個の計11個を後続の `skills.uses` から参照する | [06 §9.2](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#92-スキルid) |
| 環境の版 | U05は `diagnose-node-01`、U06は `diagnose-git-01`。Node.js・npmは `node-test-01`、Gitは `ci-deploy-01` と一致させる | [06 §9.3](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#93-環境の版) |
| Git | 学習フォルダーをルートとし、名前とメールはリポジトリだけに設定する。`node_modules/`・`.stella/last-run.json`・`.stella/dotnet/` は管理しない | [06 §9.4](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#94-学習フォルダーとgit) |
| 確認と修了 | 全レッスンと全課題(確認Aを含む)で修了する。確認Bは確認A合格の7日後で、M02の時間に数える。修了で島が現れる | [06 §9.5](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#95-確認ab修了と島) |
| 通らない人 | 腕試しの受講者はロックせずU02の最初の課題合格まで案内する。Node.js・Gitが初めて必要なステージに診断を置く。Extra割り当てのある人へ初回の名指しを出さない | [06 §9.6](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#96-このステージを通らない人) |

## 執筆時の扱い

format 2と `stella-course` スキルの手順を使う。単元はモジュール、1コマはレッスンディレクトリに対応する。参照元は単元の `references.json` に `draft` で記録し、講師が参照元と本文を確認して承認する。AIは `approved` を付けない。

今の見本単元 `m0-first-page` (3時間)はU02の元にする。教材の本文と課題は今後改修する。OSで違う手順はまとめと課題文の `:::os` で分け、`stage.json` の `pdfByOs: true` を維持する。

新形式の執筆は[07](../../../../docs/curriculum/07-stella-adoption-redesign.md)と[ADDING_STAGE.md](../../ADDING_STAGE.md)に従う。
