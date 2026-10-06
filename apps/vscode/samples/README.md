# 課題の見本 (`.stella/task.json`)

新しい実行基盤 (`src/runner/`) を手元で試すための見本。Extension Development Host でこのフォルダーを開き、
課題のファイルを開いた状態でコマンドパレットから **STELLA: 課題を確認する** を実行する。

| フォルダー | runner | 試せること |
| --- | --- | --- |
| `first-page/` | `static-preview` | Node.js が無くても動く HTML の確認。最初は見出しが違うので「直すところがあります」になる。`<h1>` を「今日の学習予定」に直して保存すると通る |
| `env-check/` | `env-diagnose` | Node.js・npm・Git の版を、課題の要件 (`environment`) と照合する |

## runner ごとのテンプレートから作った見本

教材のテンプレート (`packages/content/templates/runners/<runner>/`) をそのまま並べ、提出ファイルだけを「直す前」にしたもの。
どれも lint・整形も確かめる設定で、最初の確認は「直すところがあります」になる。下の「直し方」のとおりに直す
(テンプレートの同じファイルが直した後の形) と、すべて通る。

| フォルダー | runner | 直し方 |
| --- | --- | --- |
| `node-test/` | `node-test` | `src/greet.js` の戻り値の名前のあとに「さん」を付ける |
| `dom-test/` | `dom-test` | `src/counter.js` で、増やした数を `output.textContent` に表示する (lint も要修正になる) |
| `http-mock/` | `http-mock` | `src/todos.js` で、`response.ok` が false ならエラーにする (メッセージに状態コードを含める) |
| `react-test/` | `react-test` | `src/Counter.jsx` のボタンで `setCount(count + 1)` にする |
| `storybook/` | `storybook` | `src/Button.stories.jsx` に、押せない状態の見本 `Disabled` を足す (play で onClick が呼ばれないことを確かめる) |
| `api-test/` | `api-test` | `src/app.js` で、title が空なら 400 と `{ error: "title を入力してください" }` を返す |
| `db/` | `db` | `src/todos.js` の `listOpenTodos` を `where done = false` で絞る |
| `e2e/` | `e2e` | `src/main.js` で、追加したあとに入力欄を空に戻してフォーカスする |
| `next-app/` | `next-app` | `app/layout.jsx` の `metadata` に `title: "ToDo"` を足す |

- 最初の確認は `npm ci` をするので、ネットワークが要る。`e2e`・`next-app` はテスト用の Chromium もダウンロードする。2 回目からは「準備済み」で省略される。
- 定義の正しさとテンプレートとの一致は `src/runner/samples.test.ts`・`templates.test.ts` が確かめる。依存パッケージを入れて動かす確認はネットワークが要るので、この手順で手で行う。

本番の課題は教材リポジトリ (`packages/content`) が正本になり、拡張が受講者の学習フォルダーへ配る予定。
この見本は拡張の動作確認用で、受講者には配らない (VSIX にも入れない)。

## Windows・macOS の実機での確認 (Issue #37)

Linux の CI と単体テストでは、Windows・macOS の分岐を OS を差し替えて確かめている。実機では次を確かめ、
OS・Node.js・npm の版と、各見本の初回・2 回目の所要時間を Issue に記録する。

**共通 (見本 9 つそれぞれ):** 直す前は「直すところがあります」、直すと「すべて通りました」になる。2 回目は「依存パッケージの準備」が「準備済み」になる。

**Windows**

- [ ] npm の解決: 公式インストーラー (`C:\Program Files\nodejs`)・nvm-windows・Volta で「開発環境を診断する」が npm の版を出す。実行ログで npm が `node.exe …\npm-cli.js ci` の形で起動されている (`npm.cmd` を使っていない)。
- [ ] PowerShell の実行ポリシーが既定 (Restricted) のままでも動く。
- [ ] 中断: `e2e` か `next-app` の確認中に中断し、タスクマネージャーに `node.exe`・`chrome-headless-shell.exe` が残らない。
- [ ] 時間切れ: `node-test` の `src/greet.js` の中を `while (true) {}` にして確認し、約 3 分で「時間内に終わりませんでした」になり、`node.exe` が残らない (`taskkill /T /F`)。
- [ ] 日本語と空白のパス: `C:\Users\山田 太郎\web-training\課題 1\` のような場所に見本を置いて全部通る。結果のファイル名が相対パスで出て、ユーザー名を含む絶対パスが出ない。
- [ ] 長いパス: 課題フォルダーまで 200 文字を超える深さに `storybook`・`next-app` を置いて通る (`LongPathsEnabled` は既定のまま)。
- [ ] 改行: 提出ファイルを CRLF で保存しても、整形と配布ファイルの照合で要修正にならない。
- [ ] ファイアウォール: `api-test` の `npm start`、`e2e`・`next-app` の確認で、Windows Defender ファイアウォールの許可の確認が出ない。

**macOS**

- [ ] npm の解決: Homebrew (`/opt/homebrew/bin/node`)・nvm・公式 pkg で「開発環境を診断する」が npm の版を出す。Dock から起動した VS Code でも Node.js が見つかる。
- [ ] Apple Silicon (あれば Intel も) で `npm ci` が通る (ネイティブ部品 `@rolldown/binding-darwin-*`・`@next/swc-darwin-*`)。
- [ ] 中断・時間切れのあと、アクティビティモニタに `node`・`chrome-headless-shell` が残らない。
- [ ] ダウンロードした Chromium が Gatekeeper に止められずに起動する。
