# M01 初心者向けの環境構築とVS Code基本操作

作成日 2026年10月4日  
版 2.2  
状態 設計案  
[全体設計へ戻る](00-overall-design.md)

M01は、VS Codeを初めて使う人が、学習用のフォルダーを開き、HTMLを保存・表示・変更し、次の教材を始められる環境を準備する教材にする。ソフトウェアを入れる手順と、日々使う操作を覚える演習を分ける。手順を見ながら導入できたことと、後日も自分で操作できることを別に記録する。

既存のM01の35時間を細分化する提案であり、18教材パック・36週間・1,260時間の計画は維持する。本書は教材制作とLXP実装のための設計である。配布するインストーラーの版、LXP拡張の配布方法、スクリーンショット、スターターと診断機能は、実装・確認してから教材を公開する。

## 1 M01の到達目標

学習者が、次の行動を資料を参照しながら自分で行えることを目標にする。

| 行動 | 完了の証拠 | 後続の教材で使う場面 |
| --- | --- | --- |
| VS CodeとLXPを起動する | 教材を開き、閉じた後も同じ単元へ戻れる | 全教材の学習開始 |
| 作業フォルダーを開く | 開いているフォルダーと、保存先を説明できる | 教材やプロジェクトの切替 |
| ファイルを作成・編集・保存する | index.htmlを保存し、閉じて開き直せる | HTML・CSS・JSの実装 |
| ブラウザで表示・更新する | 変更した見出しが表示される | 画面の制作と確認 |
| ターミナルを使う | 開いている場所を確認し、指定したコマンドを一つずつ実行できる | JSの実行、依存関係、開発サーバー |
| Node.js・npm・Gitを確認する | 教材で指定した版が使える | M03以降の実行と変更管理 |
| ローカルサーバーを起動・停止する | 表示されたURLでページを開き、停止後に再起動できる | Webアプリの開発 |
| 変更を記録・説明する | Gitの保存と差分を確認し、変更箇所を説明できる | 提出、レビュー、修正 |
| 困った状態を説明する | どこまで成功し、何が起きたかを短く伝えられる | 調査と相談 |

用語は行動の直前か直後に説明する。「フォルダー」は作業場所を開くとき、「拡張機能」はLXPを入れるとき、「サーバー」はURLでページを表示するときに扱う。キーボードのショートカットを暗記することは進級条件にしない。

## 2 導入前から教材を読めるようにする

VS Code未導入の学習者は、WebView内の教材をまだ読めない。そのため、導入案内を通常のブラウザでも閲覧できるようにする。

```text
ブラウザで開始案内を読む
  → PCとOSを確認する
  → VS Codeを導入する
  → 日本語表示とLXP拡張を準備する
  → VS Code内でLXPを開く
  → 同じ単元の続きから学ぶ
```

ブラウザの案内は、VS Codeを再起動する間も開いておける構成にする。LXPのログインや拡張の起動がうまくいかない場合も、外側の案内と問い合わせ先を読めるようにする。必要な導入ページは配布・印刷用にも出力する。

ブラウザ版とWebView版は、共通の教材ID、単元ID、教材版、ステップIDを使う。ログイン前の進捗は、開始時に手動でステップを選び直せるようにする。ログイン後は保存した位置を共有する。ブラウザとVS Code拡張の接続方式は、実際のLXPの認証・配布方式を確認して決める。

ブラウザだけでは、ローカルのソフトウェアやファイルの状態を十分に確認できない。導入前は学習者の確認と講師の支援を使い、拡張が起動した後に、許可された作業領域と決めた確認コマンドで診断する。

## 3 標準環境と導入の順序

Windowsを主教材の初期案とし、macOSは独立した操作手順で用意する。受講者のOSを確定してから、対象OS・CPU・インストール方法と確認画面を制作する。WindowsとmacOSのコマンドや画面を一つの手順へ混在させない。

| 準備するもの | 導入する時点 | 設計上の扱い |
| --- | --- | --- |
| 既存のブラウザ | 開始前 | 研修で確認した対応ブラウザを案内する |
| VS CodeのStable版 | U01 | 研修で検証した版を記載し、公式配布元を案内する |
| 日本語表示 | U01 | 公式の表示言語手順に沿い、Language Packを確認する |
| LXP拡張 | U01 | 公開済みなら拡張ID・発行者を指定する。未公開なら研修側のVSIX配布・更新手順を決める |
| Node.jsとnpm | 最初のHTML表示後、U04 | 検証したLTSの具体的な版をコース環境へ登録する。既存の適合版は再インストールしない |
| Git | U05 | 採用する版と公式の導入手順を記載する |
| ローカルサーバー用スターター | U06 | 研修側が準備し、起動方法と依存関係を固定する |

最初のHTML表示までは、ブラウザとVS Codeで進める。React、Next.js、DB、Docker、WSL、GitHubへの公開は、それを必要とする後続教材で導入する。最初の単元で用途がまだ分からない設定を大量に行わせない。

WindowsのVS Code導入は、通常の個人用環境では公式のUser setupを入口にする。会社が管理する端末では、研修担当者が認められた導入方法を先に確認する。[VS CodeのWindows向け導入資料](https://code.visualstudio.com/docs/setup/windows)はUser setupとSystem setupを区別している。

学習フォルダーは、学習者が書き込める自分のユーザーフォルダーにweb-trainingを作る初期案とする。講師は実際の端末で場所を確認する。教材に出す絶対パスのユーザー名は例であることを明示し、その文字列をそのまま作らせない。

Windowsの主教材はPowerShell、macOSは研修で検証したシェルを使う。ターミナルの種類は画面上に表示する。Windowsでnpm.ps1の実行制限が起きる場合に備え、PowerShell向け手順ではnpm.cmdを使う方法を用意する。組織の設定や実行ポリシーを一律に変更させる手順にはしない。

## 4 35時間の単元構成

時間には説明、操作、反復、関連知識、支援、確認を含む。未経験者の試行で調整し、インストールの待ち時間やネットワーク障害を学習者の能力の評価へ入れない。

| 単元 | 学ぶ内容 | 時間 | 手を動かす課題 |
| --- | --- | ---: | --- |
| U00 開始と事前確認 | PC、OS、ブラウザ、権限、配布元、学習の進め方 | 1 | 自分の環境を確認し、該当する手順を選ぶ |
| U01 VS CodeとLXPの準備 | 導入、日本語表示、拡張、LXPの起動、戻り方 | 3 | 起動・終了・再起動、同じ単元への復帰 |
| U02 画面とファイルの操作 | エクスプローラー、エディタ、タブ、作業フォルダー、作成・保存 | 5 | ファイルを作る、名前を変える、閉じて開き直す |
| U03 最初のWebページ | 提供HTML、保存、ブラウザ表示、更新、リンクと相対パス | 5 | 見出しや文章を変えて表示し、別ページを作る |
| U04 ターミナルと実行環境 | 入力場所、現在のフォルダー、コマンド、Node.js・npm | 4 | 場所と版を確認し、エディタへの誤入力を直す |
| U05 Gitで変更を残す | Git導入、初期保存、変更と差分、再度の保存 | 4 | 文章の変更を記録し、前後の差分を説明する |
| U06 ローカルサーバーとWebの入口 | 提供スターター、起動、localhost、ポート、停止、再起動 | 3 | 同じページをURLで開き、停止・再起動する |
| U07 統合・修正・自力確認 | 新しい作業場所、既習操作、よくある失敗、確認A | 4 | 別題材のページを自分で準備し、保存・表示・変更・記録する |
| 横断学習と調整 | OSとファイル、Webの歴史、開発の記録、復習、支援の余裕 | 6 | 操作と用語をつなぎ、学習記録を残す |
| 合計 | M01の全時間 | 35 | 次のM02を始められる状態を確認する |

横断学習の6時間に加え、各単元の中でも基礎知識・品質・確認を扱う。コース全体の実装・基礎・読書等の時間に二重計上しない。初週は導入と操作の比重を調整する。

初日は、環境が正常なら、最初の3〜4時間を目安に「保存したHTMLの文字を変え、ブラウザで確認する」体験へ到達する構成を試す。U02・U03の残りの反復は後日に回せる。最初の一日がソフトウェアの導入だけで終わることを避け、環境に問題がある学習者には講師が導入支援を行う。

確認BはM02開始後、おおむね一週間を空けて実施する。再インストールはさせず、閉じた状態から作業を再開し、別の短い仕様を実行できるかを確認する。M02の評価・復習時間へ計上する。

## 5 一つの操作を説明する形式

一つのステップは通常5〜10分の小さな操作にする。インストールのダウンロードや待機は別に扱う。クリックごとに大量の試験を置かず、作業フォルダーを開く、保存する、表示する等の意味のある節目で確認する。

| 画面に載せる項目 | 内容 |
| --- | --- |
| 今回すること | 「学習用のフォルダーを開く」等、一つの行動 |
| 始める状態 | どのアプリを開き、どの画面から始めるか |
| 操作 | メニュー名、クリックする場所、入力する文字。最初はメニュー操作を主にする |
| 操作例の画像 | 対象OS・表示言語・確認した版で撮影し、操作箇所を示す |
| こうなれば完了 | 保存先、表示された文字、URL、版等の観察できる結果 |
| よくある違い | 想定と異なる画面と、元の状態へ戻る方法 |
| 小さな練習 | ファイル名や文章を変え、同じ操作を再度行う |
| 参照元 | 公式ページの該当節、確認日、教材独自の判断 |

画像の中だけに操作内容を書かず、本文にもメニュー名と入力内容を記載する。小さい画面では画像を拡大できるようにする。動画を付ける場合も、静止画と短い手順で同じ操作をたどれるようにする。

コードやコマンドにはコピー用のボタンを付ける。コピーする範囲へプロンプト記号や実行結果を混ぜない。実行結果は別の枠へ置き、版やパスが学習者によって違う箇所を説明する。最初は一つのコマンドを実行し、結果を読んでから次へ進む。

### 保存と更新のステップ例

| 項目 | 学習者に見せる内容 |
| --- | --- |
| 今回すること | 見出しの変更を保存し、ブラウザで確かめる |
| 始める状態 | VS Codeでindex.htmlを開き、同じファイルをブラウザでも表示している |
| 操作1 | 見出しの文章を「今日の学習予定」に変更する |
| 操作2 | VS Codeの「ファイル」メニューから「保存」を選ぶ |
| 操作3 | ブラウザへ移り、更新ボタンを押す |
| 完了条件 | ブラウザの見出しが「今日の学習予定」になっている |
| 変わらない場合 | 保存したか、ブラウザのURLが同じファイルかを確認する |
| 次の練習 | 見出しを別の文章へ変更し、同じ操作を行う |

この例は教材独自の操作課題である。保存操作は[VS Code Editor tutorial](https://code.visualstudio.com/docs/editing/getting-started/editor-tutorial)、文書構造はMDN HTMLを参照する。OS・表示言語別の実画面を撮影して操作箇所を追加する。

### 最初のページの例

U03では、次の教材独自のひな形を渡す。各タグの詳しい説明はM02で扱い、ここでは保存と表示の操作を練習する。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>はじめてのページ</title>
</head>
<body>
  <h1>Web学習を始めました</h1>
  <p>この文章を変更して、保存と表示を確かめます。</p>
</body>
</html>
```

1. VS Codeで開いた練習フォルダーにindex.htmlを作る。
2. ひな形を入力またはコピーし、明示的に保存する。
3. OSのファイル操作から、保存したindex.htmlをブラウザで開く。
4. 見出しを変更し、保存してからブラウザを更新する。
5. VS Codeを閉じ、同じフォルダーとファイルを開き直す。

ここではHTMLをローカルファイルとして表示する。U06でローカルサーバー経由の表示を追加し、ファイルの表示とHTTPでの取得の違いを確認する。ひな形は独自制作、要素と文書構造の参照元は[MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)と[HTML Living Standard](https://html.spec.whatwg.org/multipage/)とする。

### 環境確認コマンドの例

WindowsのPowerShell向けの初期案である。実教材では各コマンドを別々の操作ステップへ分ける。macOSはnpm.cmdをnpmに替えた独立した手順を制作する。

```powershell
node --version
```

```powershell
npm.cmd --version
```

```powershell
git --version
```

「何か数字が出たら合格」とはせず、コース環境に登録した対象版と照合する。ソフトウェアの導入後に認識されない場合は、保存してVS Codeとターミナルを再起動し、再確認する。

ターミナル操作は[VS CodeのTerminal Basics](https://code.visualstudio.com/docs/terminal/basics)、名前が同じコマンドと拡張子の扱いは[PowerShellのCommand Precedence](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence)を参照する。採用するシェルの版で手順を再現確認してから公開する。

## 6 基礎操作を繰り返す課題

M01にも、基礎課題、接続練習、自力演習、修正演習を用意する。OS上の削除や移動の演習は、作り直せる練習ファイルに限定する。

| 種類 | 課題の例 | 今回確かめること |
| --- | --- | --- |
| 基礎Q01 | note.txtを作り、一行書いて保存する | 作成・入力・保存 |
| 基礎Q02 | 閉じたnote.txtを再度開く | タブを閉じることとファイルの削除の違い |
| 基礎Q03 | 練習ファイルの名前を変える | ファイル名と拡張子 |
| 基礎Q04 | practice-aとpractice-bを別々に開く | 作業フォルダーの切替 |
| 基礎Q05 | 見出しだけを変え、保存・更新する | 編集・保存・表示の関係 |
| 基礎Q06 | ターミナルの現在の場所を確認する | ファイルの保存場所とコマンドの実行場所 |
| 接続C01 | U02で作ったフォルダーへU03のページを置く | ファイル操作とHTML表示 |
| 接続C02 | 二つのページをリンクでつなぐ | 名前・位置・相対パス |
| 自力S01 | 別の練習フォルダーで「学習予定」のページを表示する | 手順を組み合わせて再現する |
| 自力S02 | アプリを閉じた状態から作業を再開し、内容を変更する | 翌日の再開 |
| 修正R01 | 保存されていない変更を表示させる | 未保存とブラウザ更新 |
| 修正R02 | 違うフォルダー・違うファイルを開いている状態を直す | 対象の確認 |
| 修正R03 | ファイル名が違うリンクを直す | 表示結果から保存先・名前を照合する |
| 統合T01 | 提供スターターを起動し、ページを変更して差分を残す | フォルダー、実行、表示、変更管理 |

ファイル名や文章を変える小さな反復から始める。反復で扱った操作を、別題材の自力演習と後日の確認へつなぐ。すべてのインストールを繰り返すことは求めない。

U05では、学習リポジトリ内にコミットの名前・メールを設定する手順を用意する。研修の識別ルールを使い、個人の既存Git設定を一括で上書きしない。設定の範囲は[Git config](https://git-scm.com/docs/git-config)、リポジトリ作成は[Git init](https://git-scm.com/docs/git-init)を参照する。GitHubアカウント作成、push、PRは後続の共同作業・提出教材で追加する。

## 7 LXPの画面と記録

LXPでは「読む」「操作する」「確認する」を一つのステップとして表示する。画面上には現在のOS、ステップ、今回の完了条件を示し、長い環境構築手順を一ページにまとめない。

| LXPで用意する項目 | 要求 |
| --- | --- |
| 導入案内のWeb表示 | VS Code未導入・未ログインでも必要な案内を読める |
| OS別の手順 | 自分のOSだけを表示し、操作例・コマンド・確認画面を切り替える |
| ステップの保存 | 完了、保留、手動確認、診断結果を区別して残す |
| ブラウザとWebViewの引継ぎ | 共通IDと教材版で続きへ戻れる |
| 環境診断 | 拡張起動後に対象版、必要なファイル、登録した実行定義を確認する |
| 画面の復元 | 教材を閉じた場合や端末を再起動した場合も再開手順が分かる |
| 困ったときの案内 | 現象を選ぶと、確認箇所と一つずつの復帰操作を示す |
| 参照元 | ステップの近くに読む箇所を表示し、単元の一覧からも開ける |
| 支援の記録 | 自力、手順参照、ヒント、講師操作、環境の不具合を分ける |

環境診断は、既存のLXP拡張が提供できる範囲を調べてから実装する。ブラウザ内で動くLXPの状態だけを見て、Node.jsやGitがローカルで使えると判断しない。WebViewへ任意のコマンド入力欄を設けず、runnerIdで登録した確認・実行を拡張へ依頼する。

スターターは、学習者が作ったファイルを暗黙に上書きしない。練習ごとに別の作業フォルダーを使い、準備先と衝突を表示する。環境が壊れても、教材の表示と講師へ現象を伝える機能を使えるようにする。

状態は少なくとも「未開始」「進行中」「環境の問題で保留」「環境準備完了」「確認A合格」「確認B合格」を分ける。実装上は環境状態と習得状態を別の記録にする。クリックで完了を押しただけでは、操作スキルの合格へ変換しない。

## 8 よくあるつまずきと支援

| 現象 | 最初に確認すること | 教材で示す復帰方法 |
| --- | --- | --- |
| VS Codeの画面が例と違う | OS、表示言語、開いているビュー | メニューから必要なビューを開く。色や位置の違いだけで誤操作としない |
| フォルダーが表示されない | 単独ファイルだけ開いていないか | 指定したフォルダーを開き直す |
| 変更がブラウザに出ない | 保存、更新、開いているファイルの場所 | 保存して更新し、URL・保存先を照合する |
| HTMLが文章として開く | ファイル名、拡張子、ブラウザへの関連付け | 保存した名前を確認し、ブラウザで対象ファイルを開く |
| nodeやgitが見つからない | 導入状態、PATH、導入前から開いているVS Code | 保存してVS Codeを再起動し、採用版を再確認する |
| npm.ps1を実行できない | WindowsのPowerShellでどのコマンドを実行したか | 検証済みのnpm.cmd手順へ案内する。制限の一括解除を求めない |
| LXPが起動しない | 拡張ID・版、有効状態、必要なログイン、Workspace Trust | 該当する確認から一つずつ行い、ブラウザ版で案内を読む |
| npmの準備が失敗する | 作業フォルダー、package.json・lockfile、ネットワーク | 準備先と提供スターターの版を確認する。組織の接続条件は講師へ引き継ぐ |
| サーバーを開けない | 起動したターミナル、表示されたURL、停止、ポート競合 | 実際のURLを開き、登録した停止・再起動手順を使う |
| 端末の設定変更が必要 | 会社の管理方法、操作権限 | 研修担当者の導入支援へ回し、学習スキルの不合格にしない |

Workspace Trustは、自分で作った練習フォルダーや、出所を確認した研修資料を対象に説明する。すべてのフォルダーを一律に信頼させない。Restricted ModeでのLXP拡張の動作はmanifestと実装を確認する。[VS CodeのWorkspace Trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust)を参照元にする。

相談欄は「何をしようとしたか」「どこまで成功したか」「実行した操作またはコマンド」「表示されたメッセージ」を記入する形式にする。添付する画面やログの範囲を指定し、不要なユーザー名・認証情報等は含めない。相談できることもM01の到達目標として扱う。

## 9 完了条件と進級

環境の準備は、VS Code、LXP、作業場所、Node.js・npm・Git、提供スターターの起動を確認して完了にする。手動確認と自動診断は記録上で区別する。

操作の確認Aは、導入済みの環境で、初めて見る短いページ仕様を渡して行う。メニュー、公式資料、操作早見表の参照は許可する。講師が代わりに操作した場合は、環境を整えたことと学習者の自力確認を区別する。

| 確認項目 | 合格の条件 |
| --- | --- |
| 作業場所 | 指定した新しい練習フォルダーを開いている |
| 作成・保存・表示 | 指定した文章のHTMLを保存し、該当するページをブラウザで表示する |
| 変更 | 一箇所の追加要求を実装し、保存・更新して確認する |
| 実行 | ターミナルの場所を確かめ、提供プロジェクトを起動・停止する |
| 記録 | 自分の変更をGitで残し、差分を説明する |
| 修正・相談 | 誤った保存先等を直せる。環境の問題は現象と試したことを伝えられる |

確認Bは、VS Codeを閉じた状態から再開する別題材の短い課題にする。確認Aの手順を記憶しただけでは完了できないように、フォルダー名と変更内容を変える。参照や支援の扱いは[反復演習と評価](03-repeated-practice-and-assessment.md)を引き継ぐ。

環境に問題がある場合は環境支援へ回し、可能なブラウザ上の用語・歴史の学習を進める。自力操作の不足は、その操作を使う短い問題を追加し、別の仕様で再確認する。M02は環境準備と確認Aを満たして開始し、遅延確認Bの結果は後続の自力・統合課題の進行へ反映する。

## 10 参照元と公開前の制作確認

参照先は2026年10月4日に確認した。これは入口の選定であり、採用端末で手順を再現した記録とは分ける。実教材には該当する節・対象版・利用目的を追加し、[情報源と参照元の記載](05-sources-and-attribution.md)の条件で公開する。

| 資料 | 主に使う単元・説明 |
| --- | --- |
| [VS Code Windows setup](https://code.visualstudio.com/docs/setup/windows)、[macOS setup](https://code.visualstudio.com/docs/setup/mac) | U00〜U01。導入方法、対象OS、導入後の確認 |
| [VS Code Editor tutorial](https://code.visualstudio.com/docs/editing/getting-started/editor-tutorial)、[User interface](https://code.visualstudio.com/docs/editing/getting-started/userinterface) | U02。画面の名称、メニュー、ファイルの操作 |
| [VS Code Display Language](https://code.visualstudio.com/docs/configure/locales)、[Extensions](https://code.visualstudio.com/docs/configure/extensions/extensions) | U01。日本語表示、拡張の導入・確認 |
| [VS Code Workspaces](https://code.visualstudio.com/docs/editing/workspaces/workspaces) | U02。ファイルと作業フォルダーの違い |
| [VS Code Terminal Basics](https://code.visualstudio.com/docs/terminal/basics) | U04・U06。入力場所、コマンド、実行中の処理 |
| [VS Code Workspace Trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust) | U01と支援。信頼する対象と拡張の動作 |
| [MDN Installing basic software](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Installing_software)、[MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML) | U00・U03。ツールの役割、ページの表示、文書の構造 |
| [Node.js公式Download](https://nodejs.org/en/download)、[Node.js Learn](https://nodejs.org/learn/getting-started/introduction-to-nodejs) | U04。採用版、実行環境の役割 |
| [Git for Windows](https://git-scm.com/install/windows)、[Git公式Reference](https://git-scm.com/docs) | U05。導入、版、変更の保存と差分 |
| [PowerShell Command Precedence](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_command_precedence) | U04と支援。コマンド名・拡張子・シェルの違い |
| [CERNのWeb史](https://home.cern/science/computing/the-birth-of-the-web/short-history-web/) | 横断学習。文書、ブラウザ、サーバーが必要になった理由 |

次の確認を終えてから、この設計を学習者向け教材として公開する。

1. 対象OS・CPU・VS Code・Node.js・npm・Git・LXP拡張の版と導入方法を確定する。
2. VS Code未導入の端末から、ブラウザ案内、導入、LXP起動までを通して確認する。
3. 学習者が使う権限・接続条件で手順を再現し、OS別の画像と結果を記録する。
4. LXPの拡張ID、配布・更新方法、ログイン、再開、診断の範囲を確認する。
5. 提供スターターのpackage.json、lockfile、起動・停止、表示URLを固定し、授業環境で確認する。
6. 独自課題、使用した資料、画像の制作・利用条件を登録する。
7. VS Code未経験者に試してもらい、迷った操作、時間、支援、翌日の再現を観察する。

公式資料のURLや転送先は更新される。基本操作の参照先にはEditor tutorialの現行URLを採用し、資料名、該当する節、ページの内容が教材の目的と一致することを公開前に確認する。

## 11 VS Code拡張の選定と段階的な導入

初日の標準構成は日本語表示とLXP拡張にする。M02でPrettier、M03でESLintを追加し、通信・テスト等の拡張はその操作を学ぶ単元で導入する。拡張の導入と使い方は、必要となる教材の時間へ含め、M01の35時間にすべてを詰め込まない。

以下は2026年10月4日に公式資料・各拡張の配布元を確認した選定案である。拡張のIDは似た名称の拡張を区別するために記載する。実際の採用版と教材環境との互換性は、研修側の端末で確認してから確定する。

### 標準として採用する候補

| 拡張と参照元 | 拡張ID | 導入時期 | 教材での用途と確認課題 |
| --- | --- | --- | --- |
| [Japanese Language Pack](https://marketplace.visualstudio.com/items?itemName=MS-CEINTL.vscode-language-pack-ja) | MS-CEINTL.vscode-language-pack-ja | M01 U01 | メニューを日本語で表示する。再起動後に教材の画面と照合する |
| 開発中のLXP拡張 | 実際のmanifestで確定する | M01 U01 | 教材、プレビュー、提出、再開を案内する。公開先・ID・版は未確認 |
| [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | esbenp.prettier-vscode | M02 | HTML・CSSの整形から始め、JS・TSへ継続する。手動で整形し、前後の差分と読みやすさを確かめる |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | dbaeumer.vscode-eslint | M03 | 未使用の変数等、教えた規則に対する診断を表示する。メッセージを読み、自分で原因を直す |

Prettierは記述形式を整える道具、ESLintは設定した規則でコードを検査する道具として区別する。どちらも、仕様どおりに動くことを保証するテストとは別に扱う。導入するだけで規則や対象コードが整うとは説明しない。

PrettierとESLintの実行用パッケージ・設定・lockfileは、教材のスターターに用意する。VS Code拡張の版と、プロジェクト内のPrettier・ESLintの版を別々に記録する。ローカルの実行パッケージと設定で、エディタ、LXPの確認、CIのチェックを対応付ける。参照元は[Prettierの導入](https://prettier.io/docs/install)と[ESLintの導入](https://eslint.org/docs/latest/use/getting-started)とする。

最初は手動整形を練習し、保存と整形の役割を確認してから保存時の整形へ進む。ESLintもメッセージの理由を読むところから始め、自動修正を扱う際は差分を確認する。Reactのアクセシビリティでは、必要な段階で[eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)等のプロジェクト側の規則を追加できる。これは追加のVS Code拡張とは区別する。

### 学習段階で追加する候補

| 拡張と参照元 | 拡張ID | 導入時期 | 用途と前提 |
| --- | --- | --- | --- |
| [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) | humao.rest-client | M07・M11 | .httpファイルからHTTPリクエストを送り、応答を見る。メソッド、ヘッダー、JSON、状態コードを観察する |
| [Vitest](https://marketplace.visualstudio.com/items?itemName=vitest.explorer) | vitest.explorer | M05の単体テスト導入時 | Testingビューで実行・失敗・デバッグを確認する。先に教材のVitestをコマンドで実行できる状態を準備する |
| [Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright) | ms-playwright.playwright | M10の画面連携・E2E導入時 | テスト実行と失敗の調査を行う。教材のPlaywright、対象ブラウザ、設定を準備する |
| [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) | bradlc.vscode-tailwindcss | Tailwind CSSを採用した教材だけ | クラスの補完等を利用する。Tailwind自体の導入と設定が前提であり、現段階では必修に追加しない |
| [Error Lens](https://marketplace.visualstudio.com/items?itemName=usernamehw.errorlens) | usernamehw.errorlens | M03以降の任意 | 診断をコード付近にも表示する。標準の問題ビューの読み方を先に学び、表示量を調整する |

VitestとPlaywrightは、CLIでの実行とエディタでの操作を同じ設定へ結び付ける。拡張の操作確認は[VitestのIDE連携](https://vitest.dev/guide/ide)と[PlaywrightのVS Codeガイド](https://playwright.dev/docs/getting-started-vscode)を参照する。拡張からの成功はローカル確認の証拠であり、LXPの正式評価は既存の方針に従う。

REST Clientの教材用リクエストは、提供APIか学習用のローカルAPIへ送る。実サービスの認証情報をサンプルへ書き込まず、教材で用意したデータと確認する操作を使う。HTTPそのものの根拠はM07の標準資料、拡張の使い方の根拠は配布元の資料として分ける。

### 標準機能とプレビューの構成

HTML・CSS・JavaScript・TypeScriptの言語支援、Emmet、Gitの基本操作、JavaScriptのデバッグは、VS Codeの標準機能を学習の入口にする。参照元は[HTML](https://code.visualstudio.com/docs/languages/html)、[CSS](https://code.visualstudio.com/docs/languages/css)、[JavaScript](https://code.visualstudio.com/docs/languages/javascript)、[TypeScript](https://code.visualstudio.com/docs/languages/typescript)、[Source control](https://code.visualstudio.com/docs/sourcecontrol/overview)とする。Node.js、Git、コンパイラ等の実行用ソフトウェアは別途準備する。

プレビューは、M01のローカルファイル表示と提供スターター、後続のVite・Next.js等の開発サーバーをLXPの実行定義で案内する。採用したVS Code版に応じて、[標準のIntegrated Browser](https://code.visualstudio.com/docs/debugtest/integrated-browser)でローカルHTMLやサーバーのURLを開く構成も使える。LXP教材を表示するWebViewと、学習者が作ったページのプレビューは、画面上で区別する。

静的ページの簡易サーバーが別途必要なら、[MicrosoftのLive Preview](https://marketplace.visualstudio.com/items?itemName=ms-vscode.live-server)を追加候補として検証する。確認時の掲載内容には開発中・プレリリースの説明があるため、Stable版の研修で使うリリースと挙動を確認してから採用する。通常の教材で使うプレビュー経路は一つに決め、起動・停止・表示URLを統一して説明する。

### 教材の推奨一覧と設定例

教材のスターターには、段階ごとの.vscode/extensions.jsonを同梱する。次はM02の公開済み拡張の推薦例であり、LXP拡張の実IDが確定したら追加する。

```json
{
  "recommendations": [
    "MS-CEINTL.vscode-language-pack-ja",
    "esbenp.prettier-vscode"
  ]
}
```

このファイルは推薦の一覧であり、拡張の自動インストールや版の固定には使えない。採用版の記録、導入手順、実際に有効かの確認を別に用意する。参照元は[VS CodeのWorkspace recommended extensions](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_workspace-recommended-extensions)とする。

M02の.vscode/settings.jsonは次の初期案にする。プロジェクトには.prettierrc.json等のPrettier設定と、実行用の依存関係を用意する。この例は既存の受講者環境へ適用していない。

```json
{
  "files.autoSave": "off",
  "editor.formatOnSave": false,
  "prettier.requireConfig": true,
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

M03ではJavaScript、M07ではTypeScript、M08ではReact用の言語設定を追加する。保存時の整形を有効にする変更も、教材の操作として説明する。既存の利用者設定の上書きを避けるため、必要に応じて講師が[研修用Profile](https://code.visualstudio.com/docs/configure/profiles)を準備し、教材のワークスペース設定と使い分ける。

### LXPとの連携と導入の確認

各教材の環境定義には、拡張ID、採用版、導入目的、必要となる単元、必須・推奨・任意、依存パッケージ、参照元、確認日を登録する。LXPは現在の課題で必要なものを示し、拡張の導入、有効状態、設定、操作確認を分けて記録する。任意拡張がないことを進級の不合格にしない。

LXP拡張から別の拡張を操作する場合は、採用版の公開APIや利用可能なコマンドを確認する。対象が変わる内部コマンドの呼出しを当然の前提にせず、通常のTestingビュー、ターミナル、メニューからの操作も用意する。LXPの学習画面を外部拡張の表示だけに依存させない。

公開前には、研修の標準Profileで整形・診断・プレビュー・テスト・教材表示が同時に使えることを確認する。拡張本体のIDと対象版、プロジェクト内の実行パッケージ、設定ファイル、CLIの結果を照合する。導入する拡張を追加する際は、各教材の参照元にも配布元と利用した節を登録する。
