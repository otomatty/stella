# 教材動画の VS Code の操作を手元で撮る

教材動画の新方式 ([VIDEO_GUIDE.md](../packages/content/VIDEO_GUIDE.md)) は、実際に画面を操作している動画 (クリップ) をつないで作ります。Web アプリの操作はクラウドの Claude Code でも撮れますが、**VS Code の操作は Windows の手元でしか撮れません** (VS Code を Playwright で起動して撮る収録が Windows 専用のため)。この文書は、手元の Claude Code に続きを頼むための手引きです。

## いまの状態

| 素材 | 状態 |
| --- | --- |
| Web アプリの操作 (`clips/web/*`) | 撮影済み。`bun run --filter=@stella/web tutorials:clips` で撮り直せる |
| VS Code で課題を確認する操作 (`clips/vscode/run-check`) | 既存の収録 `stages/dev-env-basics/modules/u02-first-task/l1-first-task/t3-run-check/screen.mp4` の区間を使っている |
| **Web アプリの「VS Code で開く」から、VS Code に課題が開くまで** | **未撮影。** いまの動画は、Web アプリのクリップと VS Code のクリップを「窓が入れ替わる」つなぎで並べている |
| **VS Code で「提出」を押して送るまで** | **未撮影。** いまの動画は静止画 (`shots/vscode/check-pass`) で代えている |

## 手元で撮るもの

### 1. `vscode/open-task` — Web アプリから VS Code に切り替わり、課題が開く

見せたいこと: Web アプリで「VS Code で開く」を押すと、VS Code が前に出てきて、課題のファイルと課題文のパネルが開く。

進め方の案 (未検証。手元で画面を見ながら決める):

1. 収録用の環境 (`apps/web/scripts/tutorials/lib/environment.ts` の `TutorialEnvironment`) でローカルの API と Web を起動する。
2. VS Code を収録用のプロファイルで起動する (`vscode/run.ts` と同じ)。プロファイルのユーザー設定に `stella.serverUrl`・`stella.webUrl` をローカルの API・Web にして入れる (ワークスペース設定は読まれない)。
3. Web アプリの課題文のレッスンで「VS Code で開く」を押し、アプリが開こうとする `vscode://saedgewell.stella-lms/task?taskId=…&code=…` を取り出す (OS の確認ダイアログには頼らない)。
4. その URL を、収録中の VS Code に渡す (同じ `--user-data-dir`・`--extensions-dir` を付けた VS Code の CLI の `--open-url`)。拡張が接続コードを交換し、課題を学習フォルダーに置いて開く。
5. 初回の「学習フォルダーを作る」の確認を、台本で操作する。学習フォルダーは収録用の一時フォルダーにする (自分の `~/web-training` を触らない)。
6. `t.mark("open", …)` で「VS Code の窓に課題が開くまで」を区間にする。

Web アプリ側の「押す」場面は撮影済みの `clips/web/open-task` を使えます。ブラウザーと VS Code を 1 つの画面で同時に撮る必要はありません (つなぎは動画の側で入れます)。

### 2. `vscode/submit` — 確認が通ったあと、提出する

見せたいこと: 「すべて通りました」のあと「提出」を押し、説明を入れて送り、「提出しました」が出る。

1 と同じ接続済みの VS Code で、確認を通したあとの提出を台本にします。`t.mark("press-submit", …)`・`t.mark("sent", …)` のように区間を分けます。ローカルの API に提出が届くこと (`POST /api/submissions`) を `t.expect` で確かめます。

## 撮り方

前提: Windows・VS Code・Bun・ffmpeg。`apps/api/.dev.vars` に `AUTH_JWT_SECRET`。クリップの収録に `GEMINI_API_KEY` は要りません。

```bash
bun install
bun run --filter=@stella/web tutorials:vscode -- --clip open-task
bun run --filter=@stella/web tutorials:vscode -- --clip submit
```

台本は `apps/web/scripts/tutorials/vscode/scenarios/` に、`clip: "vscode/open-task"` のように `clip` を付けて書きます。出力は `packages/content/clips/vscode/<名前>.mp4` と `.json` です。`regions` は動画 (1600×1000) のピクセルで台本に書きます。

## 動画に組み込む

1. `packages/content/stages/dev-env-basics/modules/u00-start/l1-how-stella-works/t1-learning-loop/video.json` の該当の文を、撮ったクリップに差し替える。
   - 「VS Code に切り替わり、課題が開きます。」の文: `"clip": "vscode/open-task#open"`
   - 「確認が通ったら、提出します。」の文: `"image"`・`"click"` をやめて `"clip": "vscode/submit#press-submit"`
2. 確かめる。
   ```bash
   bun run --filter=@stella/content video:check
   bun run --filter=@stella/content video:scenes -- dev-env-basics --stills
   bun run --filter=@stella/content video:scenes -- dev-env-basics --tts gemini   # GEMINI_API_KEY が要る
   ```
3. 素材を足すと単元の内容指紋が変わるので、`references.json` を更新する (`bun run --filter=@stella/content hash:unit -- dev-env-basics/u00-start`)。

## 手元の Claude Code への頼み方 (例)

```
docs/video-local-recording.md を読んで、未撮影の 2 本 (vscode/open-task と vscode/submit) を撮ってください。
台本は apps/web/scripts/tutorials/vscode/scenarios/ に clip 付きで書き、収録した動画のコマを見て不自然な点を直してください。
撮れたら video.json の該当の文をクリップに差し替え、video:check と video:scenes --stills で確かめ、
本番の音声 (--tts gemini) で動画を書き出して見せてください。
```
