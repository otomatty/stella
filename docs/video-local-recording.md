# 教材動画の VS Code の操作を手元で撮る

教材動画の新方式 ([VIDEO_GUIDE.md](../packages/content/VIDEO_GUIDE.md)) は、実際に画面を操作している動画 (クリップ) をつないで作ります。Web アプリの操作はクラウドの Claude Code でも撮れますが、**VS Code の操作は Windows の手元でしか撮れません** (VS Code を Playwright で起動して撮る収録が Windows 専用のため)。この文書は、手元の Claude Code に続きを頼むための手引きです。

## いまの状態

| 素材 | 状態 |
| --- | --- |
| Web アプリの操作 (`clips/web/*`) | 撮影済み。`bun run --filter=@stella/web tutorials:clips` で撮り直せる |
| VS Code で課題を確認する操作 (`clips/vscode/run-check`) | 既存の収録 `stages/dev-env-basics/modules/u02-first-task/l1-first-task/t3-run-check/screen.mp4` の区間を使っている |
| VS Code に課題が開く操作 (`clips/vscode/open-task`) | 撮影済み。`bun run --filter=@stella/web tutorials:vscode -- --clip open-task` で撮り直せる |
| VS Code で「提出」を押して送る操作 (`clips/vscode/submit`) | 撮影済み。`bun run --filter=@stella/web tutorials:vscode -- --clip submit` で撮り直せる |

2 本とも `packages/content/clips/vscode/` に `.mp4` と `.json` があり、`00-1-1` の `video.json` に組み込み済みです。

## 手元で撮るもの

### 1. `vscode/open-task` — VS Code に課題が開く

課題のファイルと課題文のパネルが開く場面を撮ります。台本は `apps/web/scripts/tutorials/vscode/scenarios/06-open-task.ts` です。

`vscode/run.ts` は、次の手順で収録します。

1. 台本に `lms: true` があると、`lib/environment.ts` の `TutorialEnvironment` で収録用のローカルの API と Web を起動します。収録用プロファイルのユーザー設定に、ローカルの URL を `stella.serverUrl`・`stella.webUrl` として入れます。
2. VS Code は最初から収録用の学習フォルダーを開いて起動します。拡張が窓を読み込み直さずに課題を開くので、撮り続けられます。VS Code とその CLI の起動時だけ `USERPROFILE`・`HOME` を一時フォルダーに差し替え、自分の `~/web-training` には触れません。
3. 録画の前に、課題やレッスンを開かない無害な URI (`vscode://saedgewell.stella-lms/lesson`) を 1 度開きます。「拡張機能がこの URI を開くことを許可しますか」の確認を済ませ、通知を閉じます。
4. 録画中に台本から `ctx.openTask()` を呼びます。Web アプリは操作せず、同じ API (`POST /api/auth/vscode-link`) で接続コードを発行します。
5. `vscode://saedgewell.stella-lms/task?taskId=…&code=…` を、収録中の VS Code に渡します。同じ `--user-data-dir`・`--extensions-dir` を付けた VS Code の CLI の `--open-url` を使います。拡張が接続コードを交換し、API から課題を受け取って学習フォルダーに置きます。
6. `t.mark("open", …)` で課題が開くまでを区間にします。ファイルと課題文の表示に加え、学習フォルダーに課題が置かれたことも確かめます。

Web アプリ側の「押す」場面は撮影済みの `clips/web/open-task` を使えます。ブラウザーと VS Code を 1 つの画面で同時に撮る必要はありません (つなぎは動画の側で入れます)。

### 2. `vscode/submit` — 確認が通ったあと、提出する

「すべて通りました」のあと「提出」を押し、振り返りを書いて送り、「提出しました」が出る場面を撮ります。台本は `apps/web/scripts/tutorials/vscode/scenarios/07-submit.ts` です。

録画の前 (`setup`) に `ctx.openTask()` で課題を開き、見出しを直して確認を通します。録画では `t.mark` で、提出を押す `press-submit`・振り返りを書く `write`・送る `sent` に分けます。送ったあと `GET /api/submissions/mine` で提出一覧を読み、この課題の提出が届いたことを確かめます。

どちらの台本も、WebView の中身は `helpers.ts` の `webviewWith(page, selector, timeout)` で探します。入れ子のフレームも含めて指定の要素を探し、そのフレームの `body` を返します。

## まだスライドの読み上げのままの動画と、置き換えに要る収録

`video:check` で「スライドを読み上げるだけの動画」と警告されるトピックです。

01-1-1・01-1-2・0-1-2 は絵コンテ (`video.json`) に置き換えました。
使うクリップは次のとおりです。

- `web/vscode-download`
- `vscode/display-language`
- `vscode/japanese-ui`
- `vscode/install-extension`
- `vscode/open-in-browser`
- `web/open-html`

インストーラーの画面は撮っていません。
インストール済みの PC では、更新の画面になるためです。
OS のファイルの画面 (Windows のエクスプローラー) も撮っていません。
デスクトップ全体の録画は、PC の中身が映るためです。
手順は `doc.md` の OS 別の説明に任せています。

| トピック | 要る収録 |
| --- | --- |
| `html-css-basics` 01-1-1 確認Aに取り組む | VS Code の課題文のパネルで確認Aを開く操作を撮る。 |

## 撮り直したクリップ

7本のクリップと、収録2本を撮り直しました。
対象のクリップは次のとおりです。

- `web/read-lesson`
- `web/open-task`
- `web/read-result`
- `vscode/open-task`
- `vscode/run-check`
- `vscode/submit`
- `vscode/open-in-browser`

収録は `t1-edit-save` の `screen.*` です。
`t3-run-check` の `screen.*` も同じです。
ステージ名は「STELLAの使い方」です。
拡張 0.10.1 の画面です。
名称は、教材・クイズ・「提出・レビューを確認する」に統一したあとです。
「課題を確認する」はエディターの右上です。

画面の名称や拡張の見た目が変わったら、同じものを撮り直します。

- 上のクリップ7本を撮り直します。
- 上の収録2本を撮り直します。

撮り直したあとは、次を確かめます。

- 絵コンテ `t1-learning-loop` と `t3-open-from-web` の静止画を見直します。
- 絵コンテ `t4-submit` と `t2-open-in-browser` の静止画を見直します。
- 静止画は `video:scenes -- <トピック> --stills` で出します。
- 3単元の `references.json` の `contentHash` を更新します。

ふだん使いの VS Code が更新の再起動待ちのときは、収録用の VS Code が起動しません。
`firstWindow` の待ち時間切れになります。
VS Code を再起動して、更新を終えてから撮ります。

`devlab-ts-ch00` の「進め方とルール」は図解で代用しています。問題つきの課題（TypeScript、1 問 1 ファイル）を VS Code で確認して提出する操作を撮ったら、図解を操作のキャプチャに置き換えます。

## 撮り方

前提: Windows・VS Code・Bun・ffmpeg。`apps/api/.dev.vars` に `AUTH_JWT_SECRET`。クリップの収録に `GEMINI_API_KEY` は要りません。

```bash
bun install
bun run --filter=@stella/web tutorials:vscode -- --clip open-task
bun run --filter=@stella/web tutorials:vscode -- --clip submit
```

台本は `apps/web/scripts/tutorials/vscode/scenarios/` に、`clip: "vscode/open-task"` のように `clip` を付けて書きます。出力は `packages/content/clips/vscode/<名前>.mp4` と `.json` です。`regions` は動画 (1600×1000) のピクセルで台本に書きます。

### Windows での注意

- ffmpeg は JPEG のコマから `yuvj420p` を出すことがあります。`lib/recorder.ts` は scale に `out_range=tv` を付け、`format=yuv420p` で出力します。
- API は `taskkill /T` で子のプロセスごと止めます。bun だけを止めると、wrangler や workerd が D1 の写しをつかんだままになります。
- D1 の写しは `reset` のたびに新しいフォルダーへ作ります。API の停止を待ってから復元し、開発用の `.wrangler/state` には触れません。

## 撮り直したあとに確かめること

`packages/content/stages/dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop/video.json` の差し替えは済んでいます。

1. 撮り直したクリップの区間が、次の参照と合っていることを確かめます。
   - 「VS Code に切り替わり、課題が開きます。」の文: `"clip": "vscode/open-task#open"`
   - 「確認が通ったら、提出します。」の文: `"clip": "vscode/submit#press-submit"`
2. 定義を検査し、静止画と本番の音声付き動画で見え方を確かめます。
   ```bash
   bun run --filter=@stella/content video:check
   bun run --filter=@stella/content video:scenes -- dev-env-basics --stills
   bun run --filter=@stella/content video:scenes -- dev-env-basics --tts gemini   # GEMINI_API_KEY が要る
   ```
3. 撮り直すと単元の内容指紋が変わるので、`bun run --filter=@stella/content hash:unit -- dev-env-basics/u00-start` で確かめ、`references.json` の版と `contentHash` を更新します。

## 手元の Claude Code への頼み方 (例)

```
docs/video-local-recording.md を読んで、撮影済みの 2 本 (vscode/open-task と vscode/submit) を撮り直してください。
apps/web/scripts/tutorials/vscode/scenarios/ の既存の台本を使い、収録した動画のコマを見て不自然な点を直してください。
video.json の参照する区間と合っていることを確かめ、video:check と video:scenes --stills を実行してください。
本番の音声 (--tts gemini) で動画を書き出して見せ、hash:unit で内容指紋を確かめて references.json を更新してください。
```
