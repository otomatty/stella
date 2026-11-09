# 開発環境とWebの入口のカリキュラム

状態は、5単元・12トピック・課題5つの本文と台本の草稿がそろい、参照元と本文は講師の承認待ちである。[06 版2.4](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md)に沿う。M01に対応し、予定時間は4時間である。

2026-11-09のオーナーの決定で、予定35時間から4時間へ縮めた。STELLAの網羅的な説明より、VS Codeを使った主要な操作を優先する。

## 到達目標

VS CodeとSTELLA拡張を入れ、Webから課題を開き、編集・保存・ブラウザーでの表示、新しいファイルの作成、名前の変更、課題の確認と提出、結果の確認まで行える。学習フォルダーと保存先を確かめ、閉じたあとも開き直せる。

## 前提ステージ

なし。スキルツリーの唯一の入口である。

## 単元構成

| 単元 | フォルダー名 | 題 | 時間 | ログイン前に読める |
| --- | --- | --- | ---: | --- |
| U00 | `u00-start` | STELLAで学ぶ流れ | 0.5 | ○ |
| U01 | `u01-vscode-setup` | VS CodeとSTELLA拡張の準備 | 1 | ○ |
| U02 | `u02-first-task` | はじめての課題を出す | 1 | × |
| U03 | `u03-files` | ファイルとフォルダーの操作 | 1 | × |
| U04 | `u04-check-a` | 確認A | 0.5 | × |
| 合計 | | | 4 | |

## 単元の課題

| 単元 | 課題フォルダー | 題 | 種別 |
| --- | --- | --- | --- |
| U00・U01 | — | 課題なし | — |
| U02 | `q01-first-page` | 最初のページを作る | `basic` |
| U03 | `q01-note-file` | メモのファイルを作る | `basic` |
| U03 | `q03-rename` | ファイルの名前を変える | `basic` |
| U04 | `a01-check-a` | 確認A: 自己紹介のフォルダーを整える | `assessment-a` |
| U04 | `b01-check-b` | 確認B: 1週間の予定のフォルダーを整える | `assessment-b` |

確認A・Bは `static-preview` のファイル操作の課題とし、Gitと相対リンクを含めない。確認Bは確認A合格の7日後に出し、4時間には加算せず、次のステージの評価・復習時間に数える。修了は全レッスンの完了と課題の合格で判定する。確認Bの遅延確認の扱いは[06 §9.5](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#95-確認ab修了と島)に従う。

## 後続ステージへの引き継ぎと削った内容

引き継ぐものはVS CodeとSTELLA拡張、学習フォルダー `web-training` と `<ステージ>/<単元>/<課題>/` の並び、編集・保存・表示・再開と確認・提出の経験である。

このステージで評価するスキルは `stella-task-loop`・`open-learning-folder`・`file-save-reopen`・`html-document`・`preview-changes` の5個である。

相対リンク、ターミナル、Node.js・npmの準備と環境診断、Gitのローカルの記録、ローカルサーバーは最初に使う後続ステージの冒頭で扱う。旧構成の自力・統合の課題と復習のレッスンも置かない。具体的なステージは執筆時(#41)に決める。`relative-link`・`terminal-location`・`node-npm-ready`・`git-local-commit`・`local-server-run`・`report-problem` は `skills.json` に残すが、このステージでは評価せず、最初に使うステージで評価する。

Node.jsやGitを初めて要するステージでは、最初の課題の前に環境診断の課題を1つ置く。腕試しで飛んだ人も、このステージを修了した人も対象である。詳細は[06 §9](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md#9-後続のステージへの引き継ぎ)に従う。

## 執筆時の扱いと制作の残り

format 2を使い、OSで違う手順は `:::os` で分け、`stage.json` の `pdfByOs: true` を維持する。参照元は `references.json` に `draft` で記録し、講師が参照元と本文を確認する。AIは `approved` を付けない。

固定IDを保つため、U02のトピックIDは旧見本単元の `0-1-*` のままとする。U00は `00-1-1`、U01は `01-1-*`、U03は `03-1-*`、U04は `04-1-1` である。

12トピックすべてに読み上げ台本 `narration.json` がある。GitHub Secret `GEMINI_API_KEY` を登録するとデプロイで動画が生成される。現在は未登録で、動画はまだ生成されていない。実機での手順確認、画像と使い方動画の収録、参照元と本文の講師による確認を進める。

新形式の執筆は[07](../../../../docs/curriculum/07-stella-adoption-redesign.md)と[ADDING_STAGE.md](../../ADDING_STAGE.md)に従う。
