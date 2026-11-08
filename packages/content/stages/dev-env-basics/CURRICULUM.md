# 開発環境とWebの入口のカリキュラム

状態は、U00〜U08 の本文と課題の下書きがそろい、講師の承認待ち。本文は[06 版2.3](../../../../docs/curriculum/06-m01-beginner-setup-and-basic-operations.md)に沿って作成した。M01に対応し、予定時間は35時間である。

## 到達目標

STELLAで課題を開き、確認・提出・結果の確認まで行える。作業フォルダーと保存先を説明し、HTMLの作成・保存・表示・再開、相対リンク、ターミナル、Node.js・npmの診断、Gitの記録、サーバーの起動・停止を資料を参照して自分で行える。困った状態と試したことを伝えられる。

## 前提ステージ

なし。スキルツリーの唯一の入口である。

## 単元構成

| 単元 | フォルダー名 | 題 | 時間 | ログイン前に読める | 主な課題 |
| --- | --- | --- | ---: | --- | --- |
| U00 | `u00-start` | STELLAで学ぶ流れと事前確認 | 1 | ○ | なし |
| U01 | `u01-vscode-setup` | VS CodeとSTELLA拡張の準備 | 3 | ○ | なし（接続はU02の最初の課題で確かめる） |
| U02 | `u02-first-task` | はじめての課題を出す | 3 | × | 最初のページを作る、見出しをもう一度変える |
| U03 | `u03-files` | 画面とファイルの操作 | 6 | × | 基礎Q01〜Q04、修正R02 |
| U04 | `u04-links` | ページを増やしてつなぐ | 5 | × | 接続C01・C02、修正R01・R03 |
| U05 | `u05-terminal-node` | ターミナルとNode.js・npm | 4 | × | 基礎Q06、環境診断 |
| U06 | `u06-git` | Gitで変更を残す | 5 | × | 学習フォルダーをGitで管理する、差分を説明する |
| U07 | `u07-local-server` | ローカルサーバーで開く | 3 | × | 提供スターターの起動・停止・再起動 |
| U08 | `u08-check-a` | まとめと確認A | 5 | × | 自力S01・S02、統合T01、確認A・確認B（後日） |
| 合計 | | | 35 | | |

横断の4時間は、U03・U04・U06・U08 の最後のレッスンに1時間ずつ置く。順に「OSとファイル」「Webのしくみ」「記録の残し方」「復習」を扱う。表の各単元の時間に含め、別枠では加算しない。

## 単元ごとの課題の一覧

| 単元 | 課題フォルダー | 題 | 種別 |
| --- | --- | --- | --- |
| U00 | — | 課題なし | — |
| U01 | — | 課題なし | — |
| U02 | `q01-first-page` | 最初のページを作る | `basic` |
| U02 | `q02-heading-again` | 見出しをもう一度変える | `basic` |
| U03 | `q01-note-file` | メモのファイルを作る | `basic` |
| U03 | `q02-reopen` | 閉じて開き直して書き足す | `basic` |
| U03 | `q03-rename` | ファイルの名前を変える | `basic` |
| U03 | `q04-two-folders` | 2つのフォルダーを使い分ける | `basic` |
| U03 | `r02-wrong-folder` | 違うフォルダーのファイルを直していた | `debug` |
| U04 | `c01-place-page` | フォルダーの中にページを置く | `connection` |
| U04 | `c02-link-pages` | 2つのページをリンクでつなぐ | `connection` |
| U04 | `r01-unsaved` | 直したはずの見出しが出ない | `debug` |
| U04 | `r03-broken-link` | リンクを押すとページが無いと言われる | `debug` |
| U05 | `d01-node-check` | Node.js と npm の版を確かめる | `basic` |
| U05 | `q01-where-am-i` | ターミナルの場所を確かめてファイルを作る | `basic` |
| U06 | `d01-git-check` | Git の版を確かめる | `basic` |
| U06 | `q01-init-repo` | 学習フォルダーの記録を始める | `basic` |
| U06 | `q02-commit-change` | 変更を記録して説明する | `basic` |
| U07 | `q01-start-server` | ローカルサーバーでページを開く | `basic` |
| U08 | `a01-check-a` | 確認A: 自己紹介の 2 ページ | `assessment-a` |
| U08 | `b01-check-b` | 確認B: 1週間の予定の 2 ページ | `assessment-b` |
| U08 | `s01-plan-page` | 学習予定のページを作る | `independent` |
| U08 | `s02-resume` | 次の日に続きを書く | `independent` |
| U08 | `t01-starter-commit` | サーバーで確かめて記録する | `integration` |

確認Bは遅延確認であり、U08 の5時間には加算しない。

## STELLAの機能をどこで初めて教えるか

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

U02 `u02-first-task` (3時間)は、保存・表示の2トピックと、確認・提出の5トピック、課題2問の草稿を用意した。OSで違う手順はまとめと課題文の `:::os` で分け、`stage.json` の `pdfByOs: true` を維持する。

新形式の執筆は[07](../../../../docs/curriculum/07-stella-adoption-redesign.md)と[ADDING_STAGE.md](../../ADDING_STAGE.md)に従う。


## 制作の残り

U00〜U08 の本文・まとめ・知識問題と、U02〜U08 の課題の下書きがそろった。
U07 は5トピック・課題1件、U08 は5トピック・課題5件である。
U07・U08 は公開しない（`public: true` を付けない）。
確認Bは確認Aの合格から7日後に出し、次のステージの復習時間に数える。
参照元の URL・読む節・本文と受入条件の対応は、講師の承認待ちである。

### 使い方動画と導入動画

- Web の収録: スキルツリー・ガイド・学習のペース、提出後の結果・相談・復習、確認A・確認B・修了証・次の星・島・腕試し。
- VS Code の収録: 接続と信頼・再開、課題文のパネル、保存・確認・提出・結果、ヒント・解答例・相談、環境診断、Git の記録と説明、サーバーの起動・停止・再起動。
- OS の導入の動画: Windows / macOS の VS Code・日本語表示・STELLA 拡張、Node.js・npm・Git。実機の手順と対象版を確認してから制作する。
- 参照元の承認: `references.json` の全使用箇所と、新規資料の `review.status` を講師が確認する。AI が `approved` を付けない。

画像は今回は置かない。次のスクリーンショットを撮影する。すべて対象OSの版、表示言語、VS Code Stable の具体的な版（Webだけの画面では対象として使った版）を記録する。ブラウザーの種類と版、STELLA 拡張の版も併記する。実機で手順を再現してから確定する。

| 対象 | 必要な画面 | OS・表示言語・VS Code の版 |
| --- | --- | --- |
| U00 OSの確認 | Windows の「設定 > システム > バージョン情報」と winver、macOS の「この Mac について」 | Windows / macOS、日本語、対象版は撮影時に記録 |
| U00 ホーム | クリア・進行中・解放済み・鍵・ぼやけの星、ガイド、学習のペースの設定、右上の「?」 | Windows / macOS、日本語、対象版は撮影時に記録 |
| U01 導入 | Windows User setup の既定の選択とPATH、macOS のzip展開・アプリケーションへの移動・初回の「開く」 | Windows / macOS、日本語（導入画面の英語表記も記録）、Stable の版を記録 |
| U01 日本語表示 | 右下の通知、コマンドパレットの Configure Display Language、日本語の選択、言語パックの発行元とID、再起動後のメニュー | Windows / macOS、英語→日本語、Stable の版を記録 |
| U01 拡張 | 四角の拡張機能アイコン、STELLA の検索、発行元・IDと有効状態 | Windows / macOS、日本語、Stable と拡張の版を記録 |
| U01 接続 | Web のボタン、ブラウザーの確認、学習フォルダー選択、信頼の確認、左右2列の画面 | Windows / macOS、日本語、Stable と拡張の版を記録 |
| U01 学習フォルダー | 自分のホームの web-training とステージ・単元・課題の並び、衝突時の通知 | Windows / macOS、日本語、Stable の版を記録。実ユーザー名を写さない |
| U01 信頼と再開 | 制限モード、信頼の管理画面、すべて保存、閉じてWebから再開した同じ課題 | Windows / macOS、日本語、Stable と拡張の版を記録 |
| U01 PCへの引き継ぎ | スマートフォン・タブレットのリンクを送るボタン | 端末OSと版、日本語、PC側の Stable の版を記録 |
| U02 課題文のパネル | 左の index.html、右の「進め方」の4段と「いまここ」、右上・ステータスバーの「課題を確認する」「課題文」 | Windows / macOS、日本語、Stable と拡張の版を記録 |
| U02 確認の結果 | q01 を変更せず確認した結果（文書は通る・見出しは通らない）、項目のメッセージ、未保存時の「保存して確認する / 保存せずに確認する」 | Windows / macOS、日本語、Stable と拡張の版を記録 |
| U02 提出のボタン | 修正・保存後に全項目が通った結果と「提出する」のボタン | Windows / macOS、日本語、Stable と拡張の版を記録 |
| U02 結果の表示 | 拡張の「ヒント・解答・レビューの結果」、合格・再提出・講師の確認待ち、Web の「提出・添削を確認する」と通知ベル、合格後の星の進捗 | Windows / macOS、日本語、Stable と拡張・ブラウザーの版を記録 |
| U03 一覧とタブ | diary.txt を開いたエクスプローラー、保存してタブを閉じた一覧と開き直した本文 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U03 作成と改名 | フォルダー選択、新しいファイルのボタン・右クリックメニュー、memo.txt から plan.txt への名前の変更（拡張子を含む） | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U03 作業場所 | 単独ファイルだけを開いた画面、「ファイル > フォルダーを開く」、web-training を開いた一覧 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U03 保存先 | practice-a・practice-b の同名ファイルとパンくずリスト、site・site-old の見比べ | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U03 OSとファイル | 入れ子のフォルダー、Windows の「表示 > 表示 > ファイル名拡張子」「隠しファイル」、Finder の「設定 > 詳細 > すべてのファイル名拡張子を表示」、隠し項目の表示を切り替えた .stella | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U03 今日の復習 | ホームのガイドの「今日の復習」と知識問題に答える画面 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U04 ページとリンク | index.html・pages/about.html の一覧、a 要素の href、ブラウザーで行き帰りを押した表示 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U04 修正の手がかり | 未保存の「●」、保存後のタブと再読み込み後の表示、リンクの綴りと実ファイル名の照合 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U04 支援 | 修正課題と修正記録、接続課題のヒント後の解答例、修正課題の解放条件、「講師に相談」と入力項目、今日の復習に出た類題 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U04 Webのしくみ | HTML の h1 とブラウザーの見出しの対比、URL のスキーム・ホスト・パスが分かるアドレス欄 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を撮影時に記録 |
| U05 ターミナル | 「表示 > ターミナル」、PowerShell / zsh の種類、プロンプト、pwd の結果、学習フォルダーから3階層の移動、課題フォルダーの「統合ターミナルで開く」、notes/hello.txt の作成結果 | Windows / macOS、日本語、OS・Stable・拡張の版を撮影時に記録。ユーザー名は伏せる |
| U05 Node.js・npm | 公式ページで22系・24系 LTS と CPU を選ぶ画面、.msi / .pkg の導入、VS Code 再起動後の版表示、npm.ps1 の制限と npm.cmd の結果、環境診断の成功・不足項目 | Windows / macOS、日本語、OS・CPU・Stable・Node.js・npm・拡張・ブラウザーの版を記録 |
| U05 相談 | 「講師に相談」の欄に目的・できたところ・操作・メッセージを文字で貼った状態 | Windows / macOS、日本語、Stable・拡張の版を記録。個人情報・認証情報を含めない |
| U06 Gitの導入 | Git for Windows の既定の導入、macOS の開発者ツールの「インストール」、git --version、環境診断 | Windows / macOS、日本語、OS・CPU・Stable・Git・拡張の版を記録 |
| U06 最初の記録 | web-training での pwd・git init、ローカルの名前・メール設定、直下の .gitignore の3行、git status・add・commit の前後 | Windows / macOS、日本語、Stable・Git・拡張の版を記録。実在の名前・メールは写さない |
| U06 変更と提出 | h1 の変更前後、git diff の - / +、git log --oneline、提出時の説明欄（ファイル・変更内容・理由） | Windows / macOS、日本語、Stable・Git・拡張の版を記録 |

| U07 サーバー | file:// と localhost のアドレス欄、課題フォルダーのターミナル、起動メッセージ、保存・再読み込み、Ctrl+C 後の入力待ち、再起動、ポート競合と3001のURL | Windows / macOS、日本語、OS・Stable・Node.js・拡張・ブラウザーの版を記録 |
| U08 確認と修了 | 確認Aの仕様と説明欄、確認Bが出たガイド、修了条件・修了証、次のHTML/CSS・JavaScriptの星、割り当てのある島、星のカードの「腕試し」 | Windows / macOS、日本語、OS・Stable・拡張・ブラウザーの版を記録 |
