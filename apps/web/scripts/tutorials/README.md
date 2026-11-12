# 使い方動画の自動収録

STELLA の使い方動画は、人が画面を録画するのではなく、**AI が書いたシナリオをヘッドレスブラウザが実行して自動で撮影**します。画面を変更したら `bun run tutorials` を実行するだけで、すべての動画が最新の画面で撮り直されます。

```
apps/web/scripts/tutorials/
  run.ts            収録の司令塔（ビルド → 起動 → 専用 D1 の復元 → 各シナリオを録画 → MP4 化 → manifest 出力）
  lib/
    director.ts     シナリオから使う操作 API（カーソル移動・クリック・入力・キー表示・字幕・強調）
    narration.ts    字幕とタイトルカードの読み上げ（Gemini TTS）と、映像への合成
    overlay.ts      ページに重ねる表示（カーソル・クリックの波紋・押したキー・字幕・タイトル）
    recorder.ts     Chrome DevTools Protocol のスクリーンキャストで録画し、ffmpeg で H.264 に変換
    types.ts        シナリオの型
    environment.ts  開発用 JWT・専用 D1 の写し・API / Web の起動と停止
    source-hash.ts  画面と台本のハッシュ
    captions.ts     チャプター → WebVTT の純関数
  scenarios/        1 ファイル = 1 本の動画
```

## 操作 API（`t`）

| メソッド | 説明 |
| --- | --- |
| `t.caption(text, { hold?, say? })` | 字幕を表示し、動画のチャプター（ステップ）として記録。少し待ってすぐ操作に移り、読み終わる時間は次の字幕の前に確保する（操作の結果が字幕と一緒に映る）。`say` があれば、画面の字幕ではなくその文を読み上げる |
| `t.expect(selector, { text?, hidden?, count? })` | 操作の結果を確かめる。期待どおりでなければ**収録を失敗させる**（壊れた動画を公開しないため） |
| `t.expectUrl(/正規表現/)` | 画面の移動を確かめる |
| `t.poster()` | 一覧に出すサムネイルを、字幕なしでこの瞬間の画面から撮る |
| `t.park()` | カーソルを邪魔にならない場所へ移す（キーボード操作の前に） |
| `t.click(selector)` | カーソルを滑らかに動かしてクリック（波紋を表示） |
| `t.hover(selector)` | カーソルを移動してとどまる |
| `t.type(text)` | 人が打つ速さで入力（日本語も可） |
| `t.press("Ctrl+k")` / `t.press("g i")` | キーを押し、押したキーを画面に大きく表示（2 打鍵のシーケンスも可） |
| `t.highlight(selector)` | 要素を光らせて注目させる |
| `t.drag(from, to)` | ドラッグ＆ドロップ |
| `t.scroll(selector, dy)` | スクロール |
| `t.goto(path)` | Web のルートからの画面へ移動 |
| `t.wait(ms)` | 待つ |
| `t.settle()` | 今の字幕・音声を読み終えるまで待つ |
| `t.title(badge, heading, sub, ms?)` | タイトルカードを表示して読む |
| `t.finish()` / `t.hideCaption()` | 最後の字幕を待つ / 字幕を隠す |
| `t.locate(selector)` | Playwright の Locator を取り出す |
| `t.moveTo(target, opts?)` / `t.moveToPoint(x, y, steps?)` | カーソルだけを移動する |

セレクタは `data-testid` を優先して使います（E2E テストと共通）。

## シナリオの項目

`defineScenario` に次の項目を渡します。`seedSql` は操作 API ではなく、収録前のデータ準備です。

| 項目 | 説明 |
| --- | --- |
| `id` / `order` | 動画の ID と収録順 |
| `screen` | ヘルプの route と同じ文字列 |
| `title` / `summary` | 動画の題と説明 |
| `start` | 収録を始める画面のパス |
| `user?` / `freshUser?` | seed の利用者。既定は `seed-learner`、`freshUser: true` なら `seed-learner2` |
| `theme?` / `draft?` | テーマと、動作確認用の台本かどうか |
| `seedSql?: string[]` | 台本に固定で書いた収録用 SQL。シナリオごとの写しの復元後、API 起動前に配列順で適用する。`wrangler d1 execute stella-db --local --persist-to <作業場所> --command <SQL>` に引数の配列で渡し、シェルを通さない。外部入力から SQL を作らない。`--url` 指定時は適用せず警告を出す |
| `run(t)` | 操作 API を使う台本の本体 |

## 新しい動画を AI に作らせるには

Claude などの AI に、次のように依頼すると新しいシナリオを書いてもらえます。

```
apps/web/scripts/tutorials/scenarios/ に、STELLA の「〇〇」画面の使い方動画のシナリオを追加してください。
- 既存のシナリオ（例: 00-smoke.ts）と同じ書き方で、defineScenario を使う
- 本番用の台本には draft を付けない（00-smoke.ts は動作確認用）
- キー操作は Ctrl で書く
- 1 本 40〜70 秒、字幕は 1 文 30 文字程度までのやさしい日本語
- 字幕はそのまま読み上げられるので、声に出して自然な文にする
- 各ステップで「何を押すと、何が起きるか」が画面上で分かるようにする
- 操作のあとに t.expect で結果を確かめ、いちばん分かりやすい瞬間で t.poster() を呼ぶ
- セレクタは apps/web/src/ の data-testid を使う
- 書いたら `bun run tutorials -- <id>` で収録し、動画のフレームを確認して不自然な点を直す
```

AI は画面のコードを読んで操作手順を組み立て、収録した動画のフレームを見て自分で手直しできます。

## 収録の流れ

1. 空いている API / プレビュー用ポートを選ぶ
2. migrations と教材 (`packages/content/stages`)・seed の処理のハッシュから専用 D1 の写しを探す。なければ `os.tmpdir()/stella-tutorials/seed-<hash>` に migrate・seed する（初回は数分）。成功した写しを次回も使う
3. `VITE_SERVER_URL=http://127.0.0.1:<API ポート>` で `vite build` し、`vite preview --strictPort` を起動する
4. シナリオごとに API を停止して写しを専用の作業場所へ復元し、`seedSql` があれば順に適用してから `wrangler dev --local --persist-to <作業場所>` を起動する。`/api/healthz` を待つ。開発者の `.wrangler/state` は使わない
5. HS256 の開発用 JWT を作り、ページを開く前に `stella_auth_token_v1` に入れる。署名鍵は環境変数 `AUTH_JWT_SECRET`、なければ `apps/api/.dev.vars`。プロフィールは `user`（既定 `seed-learner`）、`freshUser: true` なら受講 0 件の `seed-learner2`
6. Chromium（1280×800・deviceScaleFactor 1.5）で操作し、CDP → ffmpeg で 30fps / 1600×1000 / H.264 に変換する。Mac の偽装はせず、台本のショートカットは `Ctrl` で書く
7. 字幕とタイトルカードの音声を AAC で重ねる（`--no-narration` なら省略）。サムネイル JPG・チャプターから変換した WebVTT も書き出す
8. `apps/web/public/tutorials/manifest.json` にタイトル・説明・長さ・チャプター時刻・`narration`・`sourceHash`・`captions: "<id>.vtt"` を書く。Vite ビルド後は `dist/tutorials/` に入り、同じオリジンの Static Assets で配られる

必要なものは Bun、起動できる Playwright Chromium、`ffmpeg` です。ブラウザーのインストール処理は行いません。コマンドはリポジトリのルートから実行できます。

動作確認用の `00-smoke.ts` だけが入っています。`draft: true` の台本は通常は収録せず、`--include-drafts` のときだけ収録します。明示的に収録した draft も manifest に載りますが、`tutorials:check` は draft を数えません。

```bash
bun run tutorials -- --include-drafts --no-narration smoke
```

`--url` は起動済みの Web と API をそのまま使い、ビルド・サーバー起動・データ初期化を行いません。`seedSql` も適用せず、指定のある台本ごとに警告を出します。Web はローカル API を `VITE_SERVER_URL` に指定したビルドが必要です（本番向けビルドは開発用トークンを送りません）。

`t.expect` が 1 つでも失敗したシナリオは動画を書き出さず、終了コード 1 で終わります。

## 動画が古くなっていないか確かめる

```bash
bun run tutorials:check
```

`apps/web/src/`・`apps/web/scripts/tutorials/lib/`・シナリオのどれかが収録時から変わっていると、撮り直しが必要な動画を一覧にします（CI でも警告として表示されます）。ナレーションの付いていない動画も、同じ一覧に入ります。

manifest が無いか空のときは「まだ収録した動画はありません」と出して正常終了します。画面への動画の組み込みと本番シナリオは次のタスクです。

## ナレーション

字幕（`t.caption`）とタイトルカード（`t.title`）は、Gemini の TTS モデルで読み上げて MP4 に重ねます。読み上げは字幕が出た瞬間に始まり、読み終わるまで次の字幕へ進みません。タイトルカードは「見出し。要約」を読みます（見出しがすでに「。」で終わっていれば、句点は重ねません）。

`GEMINI_API_KEY` が無く、`--no-narration` も無いときは、ビルドや起動の前に終了コード 1 で止まります。

```
GEMINI_API_KEY が設定されていません。ナレーションなしで撮るときは --no-narration を付けてください
```

API キーの値は、ログにもエラーにもファイルにも出しません。

### 環境変数

| 変数 | 既定 | 内容 |
| --- | --- | --- |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | `/opt/pw-browsers/chromium` があれば使用、なければ Playwright の既定 | Chromium の実行ファイルのパス。設定した場合は最優先で使用 |
| `GEMINI_API_KEY` | （なし。ナレーションには必須） | Gemini API のキー |
| `GEMINI_TTS_MODEL` | `gemini-3.8-flash-tts` | TTS のモデル名。未設定か空なら既定 |
| `GEMINI_TTS_VOICE` | `Kore` | 声。未設定か空なら既定 |
| `GEMINI_TTS_STYLE` | 下の指示文 | 読み上げ方の指示。読み上げ文とは別に `speechMetadata.style` として送ります（Gemini 3.8 の TTS は本文をそのまま読むため、指示を本文に入れると読み上げられてしまいます）。未設定か空なら既定 |
| `GEMINI_TTS_CONCURRENCY` | `3` | 先読みの同時リクエスト数。1 未満、または数値として読めないときは 3 |
| `GEMINI_TTS_RPM` | `10` | 1 分あたりに送るリクエストの上限。Gemini API の無料枠・Tier 1 の TTS は 1 分 10 回。1 未満、または数値として読めないときは 10 |
| `GEMINI_TTS_TEMPO` | `1.2` | 読み上げの速さの倍率。0.5〜2。範囲外や数値でないときは既定。合成した音声を ffmpeg の atempo で速めるので声の高さは変わらない。速さはキャッシュのハッシュに入らないので、変えても API を呼び直さない |
| `GEMINI_TTS_BATCH` | 有効 | `0` / `false` / `off`（大文字小文字は問わない）で 1 文ずつ読む |
| `GEMINI_API_BASE_URL` | `https://generativelanguage.googleapis.com` | API のベース URL（テストやプロキシ用） |

`GEMINI_TTS_STYLE` の既定:

```
Calm, warm and clear narration for a software tutorial video, at a relaxed, slightly slow pace.
```

開始時のログにはモデルと声と速さが出ます（例: `gemini-3.8-flash-tts / Kore / 1.2 倍速`）。

### まとめ読み

1 本の動画の読み上げ文は、読む順のまま最大 8 文ずつに分け、1 リクエストでまとめて読ませます。返ってきた音声は、いちばん長い無音を文の区切りの数だけ選んで切り分け、それぞれのキャッシュに置きます。選んだ無音が、残りの無音よりはっきり長く（1.3 倍以上、かつ 0.3 秒以上長い）、区切りの無音を除いた発話の長さで、文字数から見込んだ位置の近く（1 秒、または前後の文の見込みの長さの 4 分の 1 の、長いほう）にあるときだけ切ります。見分けがつかないときは切り分けに失敗したとみなし、同じまとまりをもう 1 回だけ読み直します。それでもだめなときは、そのまとまりだけ 1 文ずつ読み上げます。準備が終わると、API へ送ったリクエストの回数がログに出ます（例: `ナレーションを準備しました（API へのリクエスト 12 回）`）。

`GEMINI_TTS_BATCH` を切ったときは、これまでどおり 1 文ずつ読みます。

先読みも、収録の途中で取りに行くときも、直近 1 分に送り始めたリクエスト数が `GEMINI_TTS_RPM` に達していれば空くまで待ってから送ります。1 分あたりの上限に達したときは待ってから送り直し、1 日あたりの上限に達したとき（応答が 1 日の上限を示すとき、または再試行までの待ち時間が 120 秒を超えるとき）は、そこで止まります。

### キャッシュ

同じ文を何度も API に送らないよう、読み上げ済みの PCM を OS の一時ディレクトリに置きます。場所は `os.tmpdir()` の `stella-tutorials/_narration` です（Linux では `/tmp/stella-tutorials/_narration`）。ファイル名は `{ v: 3, baseUrl, model, voice, style, speech }` の JSON を sha256 した値です。`speech` は読み替えたあとの文です。API のベース URL（`GEMINI_API_BASE_URL`）も含むので、模擬サーバーで試した音声が本物の API での収録に混ざりません。ベース URL・声・モデル・指示文のどれかを変えると、別のファイルになります。

倍率が 1 でないときは、このファイル（無音を削った合成結果）を残したまま、ffmpeg の atempo で速めた PCM を `<ハッシュ>.t1.2.pcm` として置きます（`1.2` は倍率です）。収録に使うのは速めたファイルです。倍率が 1 のときは、合成したファイルをそのまま使います。

収録の前に、各シナリオのタイトルと、ソースから集めた字幕を先に読み上げてキャッシュします（ビルドやサーバー起動と並行。進捗は「ナレーションを準備しています（12/108）」のように出ます）。キャッシュに無い文を収録の途中で取りに行くときは、そのあいだ録画を止めます。API の待ち時間は動画に入りません。

上限で停止したときも、作成済みの音声はキャッシュに残ります。次の実行では、足りない文だけを続きから取得します。

`--speed` は操作の待ちだけを変えます。読み上げの長さは倍率で割りません。読み上げの速さは `GEMINI_TTS_TEMPO` で変えます。

### 記号の読み替えと `say`

字幕の記号は、読み上げの前に言い換えます。`+` は前後の空白ごと「プラス」になります。連続する空白は 1 つにまとめ、前後は削ります。

| 字幕 | 読み上げ |
| --- | --- |
| `⌘K（Ctrl+K）のパレットから` | `コマンド K、または コントロール プラス Kのパレットから` |
| `⇧` / `⌥` | `シフト` / `オプション` |
| `G → I` | `G のあとに I` |
| `J / K` | `J と K`（英字 1 文字どうしの ` / `） |
| `/ キー`（先頭、または空白のあと） | `スラッシュキー` |
| `↓` `↑` `←` `→` | `下矢印キー` `上矢印キー` `左矢印キー` `右矢印キー`。空白で挟んだ `→` は「のあとに」 |
| `★` `×` `@` | `星のマーク` `バツ` `アットマーク` |
| `? を押す` | `はてなキー を押す` |
| `Esc` | `エスケープ` |
| `STELLA` / `Stella` | `ステラ` |
| `VS Code` / `XP` / `Ctrl` | `ブイエスコード` / `エックスピー` / `コントロール`（単語の途中は変えない） |
| `##` | `シャープ 2 つ`（うしろの空白は残る。`## で` は `シャープ 2 つ で`） |
| `、- で` / 先頭の `- で` | `、ハイフンで` / `ハイフンで` |
| `（1 = 緊急）` | `（1 は緊急）` |

画面に出す文と、読んで自然な文が違うときは `say` を付けます。画面は第 1 引数のまま、読み上げは `say` です。`say` の文も、上の読み替えを通ります。

```ts
await t.caption("説明は Markdown で書けます。## で見出し、- で箇条書き", {
  say: "説明は Markdown で書けます。シャープ 2 つで見出し、ハイフンで箇条書き",
});
```

## オプション

```bash
bun run tutorials -- board inbox        # id の一部で絞り込み
bun run tutorials -- --skip-build       # 前回の収録ビルドを再利用（API ポートも再利用）
bun run tutorials -- --keep-frames      # 録画したフレーム画像を残す（調査用）
bun run tutorials -- --url http://...   # 起動済みの Web / ローカル API で収録（データを初期化しない）
bun run tutorials -- --no-narration     # ナレーションなしで撮る（API キーがなくても撮れる）
bun run tutorials -- --include-drafts   # 動作確認用などの draft も収録
bun run tutorials -- --theme dark       # light / dark。既定は light。それ以外の値はエラー
bun run tutorials -- --speed 0.8        # 操作の速さ。既定は 1。0.8 なら 2 割ゆっくり。正の数以外はエラー
```

テーマはシナリオの `theme` → `--theme` → `light` の順で決まり、収録したテーマは `manifest.json` の各動画の `theme` に残します。

## VS Code の操作動画

Windows だけに対応しています。Bun、PATH 上の `ffmpeg`、インストール済みの VS Code が必要です。VS Code は `VSCODE_EXECUTABLE`、未設定なら `%LOCALAPPDATA%/Programs/Microsoft VS Code/Code.exe` を使います。日本語の言語パックが専用プロファイルに無いときは自動で入れるため、初回はネットワーク接続が必要です。

リポジトリのルートから、STELLA 拡張をビルドして収録します。

```powershell
bun run --cwd apps/vscode build
bun run tutorials:vscode -- --no-narration
```

`vscode/scenarios/` の台本をファイル名順に収録します。現在は「編集して保存する」(`edit-save`)、「課題を確認する」(`run-check`)、「新しいファイルを作る」(`new-file`)、「ファイルの名前を変える」(`rename`)、「保存先を確かめる」(`where-saved`) の 5 本です。id の一部を並べると、そのどれかを含む台本だけ収録します。

```powershell
bun run tutorials:vscode -- run-check new-file
bun run tutorials:vscode -- --no-narration rename
bun run tutorials:vscode -- --save
```

オプションは `--no-narration`、調査用のフレーム画像を残す `--keep-frames`、教材へコピーする `--save` です。ナレーションを付ける場合は `GEMINI_API_KEY` を設定し、`--no-narration` を外します。`--save` と `--no-narration` は同時に指定できません。上記のナレーション用環境変数と `os.tmpdir()/stella-tutorials/_narration` のキャッシュを共用します。

台本の `topic` は `packages/content/stages` から見たトピックの相対パスで、保存先には `slides.md` が必要です。`task` は取り組む課題の `<ステージ>/<単元>/<課題>`、`others` は学習フォルダーに一緒に置く課題です。`open` は起動時に開くファイルで、既定は `index.html`、`null` なら開きません。`prepare` で起動前にファイルを用意し、`setup` で録画前の画面を整えます。どの台本でも、右に課題文のパネルを開いてから録画します。

出力は `os.tmpdir()/stella-tutorials/vscode/out/<id>.mp4`・`<id>.jpg`・`<id>.vtt` です。`--save` では、成功した動画を `packages/content/stages/<topic>/screen.mp4`・`screen.vtt`・`screen.jpg` にもコピーします。この 3 ファイルを教材の正本としてコミットすると、既存の教材動画の生成・同期・seed の経路で配信されます。収録コマンド自体はアップロードしません。

操作の字幕帯は動画に焼き込まず、チャプターから VTT に書き出します。レッスン画面では字幕トラックとして表示されます。タイトルカード・カーソル・クリックの波紋・押したキー・光る枠は動画に残ります。

プロファイルは `os.tmpdir()/stella-tutorials/vscode/profile/{user-data,exts}` に保存して再利用し、毎回エクスプローラーの開閉状態を初期化します。普段の VS Code の設定や拡張には触れません。
