# 教材動画 (ナレーション付き解説動画) 自動生成・配信 設計書

日付: 2026-09-29
ステータス: 提案 (未実装)
参考: 「テキストから音声付き解説動画を作る仕組み 設計書」(2026-09-28, Kamishibai.js + Gemini 3.8 Flash TTS。以下「参考設計書」)

## 目的

`packages/content` の各トピック (`slides.md` = 「ショート動画 1 本」) から、**ナレーション・字幕付きの解説動画 (MP4)** を自動で作り、LMS のスライドレッスンに「動画で見る」として載せる。教材の正本は今までどおり Git で、`main` への push だけで受講者の画面まで届く (手動の収録・アップロードは無い)。

- `packages/content/CLAUDE.md` の未着手課題「収録 — 動画収録は未着手」を、人の収録なしで埋める。対象は全 1,231 トピック (7,048 スライド)
- 教材 PDF 自動生成 (`2026-08-26-material-pdf-auto-conversion-design.md`) と同じ考え方にそろえる。内容ハッシュ入りの不変キー、R2 の台帳による差分生成、旧版は消さない、を踏襲する
- 参考設計書の原則をそのまま採る。LLM に秒数を決めさせない、時刻は音声の長さだけから決める、途中のファイルを直せば後ろだけ作り直す、生成物をキャッシュして同じ入力から同じ動画を作る

## 決定事項 (本設計の提案。未決事項は末尾)

| 論点 | 決定 | 理由 |
|---|---|---|
| 動画の粒度 | **トピック 1 つ = 動画 1 本** (= D1 の slides レッスン 1 つ) | STYLE_GUIDE が「1 トピック = ショート動画 1 本、2〜3 分」と定義済み |
| 映像 | **スライドそのもの**を、アプリと同じ `slides-skin.css` で描いた静止画を並べる | 絵コンテを LLM に作らせる必要がない (スライドが絵コンテ)。アプリ内スライド・配布 PDF と見た目が一致する |
| 台本の正本 | トピックごとの **`narration.json`** (新設、Git 管理)。LLM が講師ノートとスライドから下書きし、PR でレビューしてから入る | 講師ノートの 44% は演出指示で、そのままでは読めない (後述)。LLM の出力を Git を通さずに受講者へ流さない |
| 台本の LLM | **Claude** (`claude-opus-5-5`、構造化出力。一括作成は Message Batches API) | API はすでに Anthropic を使っている。教材自体も Claude Code が書いている |
| 読み上げ | **Gemini 3.8 Flash TTS** を既定にする (参考設計書どおり)。プロバイダ差し替え口を設け、既存の **Grok TTS (AI Gateway 経由)** も選べるようにする。最終決定は試聴で行う (関門 1) | Gemini は `style` 指示で字幕ごとの声色の揺れを抑えられる。Grok は面談対策で運用中なので、新しい契約なしで使える |
| 字幕 | **焼き込まない**。WebVTT を `<track>` で配る | スライドは 16:9 全面を使っているので、焼き込むと本文に重なる。オン/オフ・速度変更・アクセシビリティは `<track>` のほうが良い |
| 生成の場所 | **別ワークフロー `video.yml`**。Deploy 成功後 (`workflow_run`) と手動 (`workflow_dispatch`) で動かし、deploy の直列経路には入れない | 外部 TTS の障害でアプリのデプロイを止めない。初回 1,231 本は数時間かかる。古さ判定 (下記) があるので、動画が遅れて届いても誤った動画は見せない |
| 古さの扱い | 動画は生成元の `lessons.markdown` の指紋を持ち、**今の本文と食い違う動画は受講者に渡さない** (staff には「古い」印付きで見せる) | 面談対策の音声 (`textHash`) と同じ方針。スライドを直してから動画が作り直されるまでの間、受講者はスライドで学ぶ |
| 配信 | Worker の**署名付き短命 URL + Range 対応ストリーミング** (`/api/media/...`)。R2 のキーは返さない | `<video>` は Authorization ヘッダを送れない。今の認可プロキシは Range 非対応でシークできない。r2.dev の直リンクは本番向けではない |
| 完了条件 | スライドの 90% 表示 **または** 動画の 90% 視聴で完了 (どちらでもよい) | `lesson_progress` に `viewed_pages` と `watched_sec` の両方がすでにある。スキーマ変更は要らない |
| 旧版 | **削除しない** (PDF と同じ)。版履歴は staff のみ | PDF の版管理と運用をそろえる |

## 現状 (調査結果)

- **トピックは動画前提で書かれている。** STYLE_GUIDE は「1 トピック = ショート動画 1 本、2〜3 分、4〜6 スライド」、「各スライドに `<!-- ノート: ... -->` で講師の読み上げメモを書く (動画のナレーション台本を兼ねる)」と定めている。結論スライドは「動画のサムネになるスライド」。講座は 1,231 トピック / 7,048 スライドで、ノートはスライドごとにちょうど 1 つある。
- **講師ノートは読み上げ台本としてはそのまま使えない。** 実測は次のとおり。
  - 平均 46 字/ノート、269 字/トピックで、読み上げると約 54 秒。目標の 2〜3 分に届かない
  - 44% は「つかみ。」「強調する」「押さえる」のような演出指示の常体
  - 158 本は「実演する」「見せる」を指示している (静止画の動画では実演できない)
  - 講座ごとに差が大きい。typescript-basics・html-css・fe-kamoku-a・aws などは指示中心、claude-code-*・cli・node・git などはほぼ「です・ます」
  - したがって**書き起こし直す工程 (LLM) が要る**
- **ノートは D1 に入らない。** `manifest.ts` は `splitSlides()` の `body` と `cls` だけを `lessons.markdown` に入れ、`note` は落とす。PDF もノートを除いた本文から作る。動画パイプラインは `slides.md` を `splitSlides()` で読み直す必要がある。
- **動画レッスンの受け皿はあるが、今回の用途には足りない。**
  - `lessons.type = "video"` + `video_path` / `total_sec`、`VideoViewer.tsx` (速度プリセット、キーボード操作、続きから再生、90% で完了、終了時の「次のレッスンへ」) はある
  - ただし次の点が足りない
    - `VideoViewer` は `type === "video"` のときしか描かれない
    - URL は `VITE_MATERIALS_BASE_URL` (公開 r2.dev) の直リンク
    - 字幕は空の `<track>` があるだけ
  - seed は lessons を `on conflict do update set video_path = excluded.video_path` で上書きするので、`lessons.video_path` に動画を載せても次の seed で消える
- **認可プロキシは Range に対応していない。** `/api/materials/:id/download` は常に 200 + `Content-Disposition: attachment` を返し、Bearer 必須。`<video src>` には使えない。
- **PDF の仕組みはそのまま流用できる。**
  - `material-pdf.ts`: Playwright を持たない共有ロジック (ハッシュ・キー)
  - `build-pdf.ts`: `slidesHtml()` + `AUTOSCALE_SCRIPT` で、アプリと同じ 1280×720 の `.sf-slide` を描く
  - `upload-pdfs.ts`: 台帳 `lesson-pdf/state.json`、`PDF_KEY_SALT` による HMAC キー
  - `lib/r2.ts`: Cloudflare v4 API の put/get
  - seed: `lesson_materials` / `lesson_material_versions`
- **TTS は面談対策で運用している。**
  - `apps/api/src/lib/workers-ai.ts` が Grok TTS (`xai/grok-tts`) を AI Gateway の Unified Billing 経由で呼び、MP3 を返す
  - Workers AI 自前の TTS は日本語非対応なので使えない (面談対策で検証済み)
  - ただし `workers-ai.ts` は `authz.ts` 経由で DB 層を import していて、CI スクリプトからはそのまま使いにくい
  - 読み辞書 (表記 → 読み) は repo のどこにも無い
- **ffmpeg は repo で未使用。** Gemini の利用も無い。GitHub Secrets は `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `PDF_KEY_SALT` のみ。

## 全体構成

参考設計書の 5 段階 (① 構成 → ② 読み上げ → ③ 同期 → ④ 描画 → ⑤ 書き出し) を、stella の教材に合わせて次のように置く。**① だけが執筆時 (Git の手前) で、② 以降は CI が自動で流す。**

```
[執筆時・PR]                                    [main への push 後・CI]
slides.md (本文 + 講師ノート)
   │  ① 台本  bun run content:narrate            Deploy (既存: R2 画像 → PDF → migrate → api → seed → web)
   ▼     (Claude → 検証器 → 差し戻し最大 2 回)         │ 成功
narration.json ── PR でレビュー ── content:check    ▼
                  (台本の古さ・字数・数値を検査)    video.yml (新設)
                                                   ② 読み上げ   字幕ごとに TTS (R2 にキャッシュ)
                                                   ③ 同期       音声の長さ → timeline
                                                   ④ 描画       Playwright でスライドを静止画に
                                                   ⑤ 書き出し   ffmpeg → video.mp4 / captions.vtt / poster.jpg
                                                        │ R2 へ put (台帳で差分のみ)
                                                        ▼
                                                   D1 へ登録 (lesson_videos / _versions)
                                                        ▼
                                           受講者: スライドレッスンの「動画」タブ
                                           (本文と食い違う動画は出さない)
```

各段階は前の段階の出力だけを読む。人が直せる中間ファイルは `narration.json` (台本・読み) と読み辞書で、直して push すれば、変わった字幕の音声だけが作り直される。

## ① 台本 — `narration.json`

### ファイル

トピックディレクトリに `slides.md` と並べて置く (任意ファイル。無いトピックは動画を作らない)。

```
courses/<slug>/modules/<m>/<l>/<topic>/
├── slides.md
├── narration.json   ← 新設
└── assets/
```

```json
{
  "schema": 1,
  "slidesHash": "9f2c41d07ab35e1c",
  "draft": { "model": "claude-opus-5-5", "guide": "3b7e0a19" },
  "slides": [
    { "cues": [
      { "text": "前のトピックで、変数は値に名前を付ける仕組みだと確認しました。" },
      { "text": "ここでは、名前の付け方が2種類あることを学びます。" }
    ] },
    { "cues": [
      { "text": "変数には、変わっていく値と、変わってほしくない値があります。" },
      { "text": "税率をうっかり上書きして、金額が全部ずれる。現場で本当に起きる事故です。" }
    ] },
    { "cues": [
      { "text": "結論です。constは再代入できない、letはできる。",
        "speech": "結論です。コンストは再代入できない、レットはできる。" },
      { "text": "再代入とは、すでにある変数に、別の値を入れ直すことです。" }
    ] }
  ]
}
```

- `slides[i]` は `splitSlides(slides.md)` の i 枚目に対応する。枚数は必ず一致させる
- `text` は画面の字幕 (プレーンテキスト、60 字以内)。`speech` は読み上げる文で、省略すると `text` に読み辞書を当てたものを読む (参考設計書と同じ)
- `slidesHash` は台本を書いた時点のスライドの指紋。各スライドの本文とノート、front-matter の `title` / `takeaway` から作る。`introduces` / `requires` は含めない (語彙台帳の整理で台本が古くならないように)
- `draft` は由来の記録 (モデル ID と `NARRATION_GUIDE.md` のハッシュ)。人が直しても消さなくてよい
- **秒数・座標は持たない。** 時刻は ③ が音声の長さから決める

### 執筆ルール — `packages/content/NARRATION_GUIDE.md` (新設)

台本のルールはこの 1 ファイルに集める。**CLI がこのファイルをそのままシステムプロンプトに入れる**ので、人・執筆エージェント・一括生成で規約がずれない。主な内容は次のとおり。

- です・ます調。1 字幕 = 1 文、60 字以内 (STYLE_GUIDE と同じ)。1 スライド 1〜5 字幕。トピック全体で 600〜900 字 (約 2〜3 分)
- スライドの流れに合わせる
  - なぜ必要か: 結論を言わない
  - 結論: `takeaway` をそのまま言う
  - 最小のコード: コードを記号ごとに読み上げず、何をしているかを言葉で説明する
  - まとめ: `takeaway` の再掲だけ。新情報を足さない
- ノートの演出指示 (「強調する」「実演する」) は読まず、意図を語りに変える。「見せる」系の指示は「画面のコードでは〜」のように、静止画で成り立つ言い方にする
- **次トピックのタイトル・ID を言わない** (STYLE_GUIDE と同じ理由。問いを残して締めるのはよい)
- 数字はスライド・ノート・`doc.md` の該当節にあるものだけを使う
- そのトピックまでに `introduces` されていない語を使わない (語彙台帳を入力として渡す)
- `speech` を書くのは、読み辞書で足りないときだけ

### 読み辞書

- `packages/content/narration/readings.json` (全講座共通。例: `const → コンスト`、`TypeScript → タイプスクリプト`、`SQL → エスキューエル`、`===` → `イコール3つ`)
- 講座ごとの上書きは `courses/<slug>/narration-readings.json` (任意。講座で読みが割れる語だけ)
- 長い表記から順に置き換える。ASCII の語は単語境界で当てる (`let` が `letter` に当たらないように)

### 作り方 — `bun run content:narrate`

```bash
bun run content:narrate courses/typescript-basics/modules/m1-values/l1-variables   # 指定範囲の台本が無い/古いトピックだけ
bun run content:narrate courses/typescript-basics --batch                         # 一括 (Message Batches API、費用半額)
bun run content:narrate <path> --accept                                           # LLM を呼ばず、今の slidesHash を承認し直すだけ
bun run content:narrate <path> --force                                            # 台本があっても作り直す
```

1. 入力を渡す。`NARRATION_GUIDE.md` (システムプロンプト、キャッシュ対象)、front-matter、スライドごとの本文とノート、`doc.md` の該当トピック節、そこまでに導入済みの語彙、読み辞書
2. Claude に JSON Schema で構造化出力させる (`output_config.format`)
3. 下の検証器に通し、違反があれば理由を添えてそのトピックだけ作り直させる (最大 2 回)。それでも通らなければ止めて箇所を表示する
4. `narration.json` を書く。人は PR の差分で読み、直す

API キーはローカルの `ANTHROPIC_API_KEY` から読む (CI では呼ばない)。執筆エージェント (Claude Code) は、このスクリプトを使わずにガイドに従って直接 `narration.json` を書いてもよい。どちらの経路でも同じ検証器を通す。

### 検証 — `content:check` に追加

`check:ci` に `check_narration` を足す (`ci.yml` の verify で走る)。

| 検査 | 失敗の扱い |
|---|---|
| スキーマ (`schema: 1`、`slides[].cues[]` が空でない) | エラー |
| 枚数が `splitSlides()` と一致 | エラー |
| **`slidesHash` が今のスライドと一致** (スライドやノートを直したのに台本が古いまま) | エラー (`content:narrate` で作り直すか `--accept` で承認) |
| 字幕が 1〜60 字、改行・Markdown 記法 (`**` やバッククォート) を含まない | エラー |
| 読み上げ文 (辞書適用後) にコード記号 (`{}()[];=<>` やバッククォート) が残らない | エラー |
| 数字の列がスライド・ノート・`doc.md` 該当節に存在する | エラー |
| 結論スライドの字幕を連結すると `takeaway` を含む (句読点・かぎ括弧・空白は無視して比べる) | エラー |
| 次トピックのタイトルを含まない | エラー |
| 読み上げの推定長 (字数 ÷ 5.5 字/秒) が 90〜200 秒 | 範囲外は警告、300 秒超はエラー |
| 辞書に無い ASCII の語 | 警告 (TTS がそれなりに読むため) |

**`narration.json` の無いトピックはエラーにしない** (段階導入のため)。バックフィルが終わった講座から ADDING_COURSE.md の手順に「台本」を足し、新規トピックでは必須にする (フェーズ 4)。

## ② 読み上げ — 字幕ごとに TTS

参考設計書と同じく、**字幕 1 つにつき 1 回呼ぶ**。音声の長さがそのまま字幕の表示時間になり、文字と音声の位置合わせが要らない。

### プロバイダの差し替え口

```ts
interface TtsProvider {
  /** キャッシュキーに入る識別子 (プロバイダ・モデル・声・style・言語・出力形式) */
  identity(): string;
  synthesize(speech: string): Promise<{ bytes: Uint8Array; ext: "wav" | "mp3" }>;
}
```

- **`gemini` (既定)**: `gemini-3.8-flash-tts` を interactions API で呼ぶ (リクエストの形は参考設計書のとおり)
  - 全字幕で同じ `voice` と同じ `style` 文を使う
  - 出力は WAV (24 kHz / mono / 16 bit)
  - キーは GitHub Secrets の `GEMINI_API_KEY`
- **`grok`**: 既存の AI Gateway 経路 (`xai/grok-tts`)。`workers-ai.ts` の `buildTtsInput` / `ttsAudioField` / 署名 URL の取得を、DB 層に依存しない `packages/shared/src/ai/tts.ts` に切り出し、API と CI で共用する。キーは `AI_GATEWAY_ID` + `AI_GATEWAY_CF_API_TOKEN` (GitHub Secrets に新規登録)

声の設定は `packages/content/narration/voice.json` に 1 つだけ置き、全講座共通にする (シリーズとして同じ声に聞こえることを優先)。

```json
{ "provider": "gemini", "model": "gemini-3.8-flash-tts", "voice": "Charon",
  "style": "落ち着いた研修講師として、はっきり、ややゆっくり", "lang": "ja" }
```

### キャッシュ (声を揃える・費用を抑える)

- 字幕の音声は **R2 にキャッシュ**する (`lesson-video/tts/<cueHash>.<ext>`)
  - `cueHash` = HMAC(`PDF_KEY_SALT`, `identity()` + 読み上げ文) の先頭 32 桁
  - 字幕を 1 つ直すと、呼び直すのはその字幕だけ。他の字幕は前と同じ音声のまま (再生成で声色が揺れない)
  - 声を変えると全字幕が作り直しになる (意図どおり)
- CI は使い捨てなので、キャッシュはローカルではなく R2 に置き、台帳で有無を判定する
- 後処理 (前後の無音削り、長さの測定) は決定的なので、キャッシュするのは**プロバイダの生の出力**にする。後処理を直しても TTS は呼び直さない

### 失敗・異常の扱い

| 起きること | 対応 |
|---|---|
| 429 / 5xx | 1・2・4・8・16 秒で最大 5 回再試行。同時実行 4 |
| 音声が推定長の 40% 未満、または 200% 超 (読み飛ばし・繰り返しの疑い) | 1 回だけ作り直す。それでも外れたら、**そのトピックは公開しない** (報告に載せる) |
| トピックの一部の字幕が失敗 | そのトピックだけ公開しない。他のトピックは進める |

## ③ 同期 — 時刻は音声の長さだけから決める

参考設計書の式を、**「章」= スライド 1 枚**として使う。スライド i の字幕 j について次のとおり。

```
dur_j   = max(audio_j + h, m)
start_0 = lead,   start_j = start_{j-1} + dur_{j-1} + g
slide_i = start_{n-1} + dur_{n-1} + tail
```

| 記号 | 意味 | 既定値 |
|---|---|---|
| audio | 無音を削った音声の長さ (-45 dB、前後 0.05 秒残す) | 実測 |
| h | 話し終わってから字幕を残す時間 | 0.15 秒 |
| m | 字幕の最短表示時間 | 1.5 秒 |
| g | 字幕と字幕の間 | 0.35 秒 |
| lead | スライドが切り替わってから話し始めるまで (タイトルスライドは 1.0 秒) | 0.6 秒 |
| tail | スライドの最後の余韻 | 0.6 秒 |

動画の長さは全スライドの合計。timeline は字幕・チャプター (スライドの開始時刻と見出し) の正本として、VTT・音声の配置・映像の切り替えのすべてが読む。

## ④ 描画 — スライドを静止画にする

- `build-pdf.ts` の `slidesHtml()` と `AUTOSCALE_SCRIPT` を、Playwright を持たない共有モジュール (`src/slide-html.ts`) に切り出して PDF と共用する。アプリの `slides-skin.css`、Noto Sans JP (fontsource)、ローカルの `assets/` を使い、`file:` 以外のリクエストは遮断する (PDF と同じ決定性)
- 入力は **`lessons.markdown` と同じ本文** (manifest の出力。ノート除去済み)。アプリで見えるスライドと動画のスライドが必ず一致する
- viewport 1280×720・`deviceScaleFactor: 1.5` で、1 スライド 1 枚の 1920×1080 PNG を撮る
- サムネイル (`poster.jpg`) は結論スライド (STYLE_GUIDE で「動画のサムネになる」と決まっている。見つからなければ 1 枚目)
- 撮影前に `document.fonts.ready` を待ち、代替フォントで描かれた文字があれば止める (参考設計書のフォント検査)

**参考設計書との違い。** Kamishibai.js のテンプレートと、フレームごとの `renderAt(t)` は採らない。stella の映像はスライドで、変化はスライドの切り替えだけ。9,000 フレームを描くより、スライド 6 枚を撮って ffmpeg に並べるほうが、1,231 本を CI で回すうえで桁違いに速い。字幕に合わせた箇条書きの段階表示やコード行のハイライトは、スライドの「状態」を増やせば同じ方式で足せる (フェーズ 4)。

## ⑤ 書き出し

1. **音声を 1 本にする**: 字幕ごとの音声を timeline の時刻に無音で挟んで連結する (サンプル単位で正確)。loudnorm 2 パスで -16 LUFS / ピーク -1.5 dBTP にそろえ、AAC-LC 128 kbps / 48 kHz / mono にする。BGM は付けない
2. **映像を作る**: スライドごとに静止画を表示時間ぶんの区間として符号化し (`-loop 1 -tune stillimage -r 30 -pix_fmt yuv420p`)、concat demuxer でつなぐ。切り替えはカット (講義動画として自然で、区間ごとにキーフレームが立つのでスライド頭へのシークが正確になる)
3. **合わせる**: 映像を再圧縮せずに音声を載せ、`-movflags +faststart` を付けた `video.mp4` にする (Range 配信で頭から再生できる)
4. **字幕**: timeline から `captions.vtt` を作る。チャプター (スライド開始時刻と見出し) は登録データとして D1 に入れる
5. **報告**: `report.json` を作る (後述の品質チェック)。CI のジョブサマリにトピックごとの長さ・警告を並べ、R2 には置かない

ffmpeg は CI で apt から入れる。版は `VIDEO_GENERATOR_VERSION` に含めない。PDF と同じく、レンダラ・エンコード設定・CSS を変えたときは `VIDEO_GENERATOR_VERSION` を上げて全再生成する運用にする。

## 差分検知と R2 キー (不変・全版保持)

- **ソースハッシュ** には次をすべて入れる。これらのどれかが変わると新版になる。
  - `VIDEO_GENERATOR_VERSION`
  - 講座タイトル (スライドのヘッダ)
  - `lessons.markdown` と参照する assets の中身
  - 字幕の文言
  - 字幕ごとの `cueHash` (= 声の設定と読み上げ文)
  - timeline の定数
- キー
  - `lesson-video/<tenant>/<courseSlug>/<lessonId>/<sourceHash>/video.mp4`
  - 同じ場所の `captions.vtt` / `poster.jpg`
  - PDF と同じく `PDF_KEY_SALT` による HMAC で計算不能にする (ラベル `lesson-video` を混ぜて PDF と名前空間を分ける)
  - **上書き・削除はしない**
- 台帳 `lesson-video/state.json` は `upload-pdfs.ts` と同じ形 (キーの SHA-256 → サイズ)。TTS キャッシュの有無もここで判定する。台帳が読めなければ全件生成に倒す (内容アドレスなので正しさは崩れない)
- 出力 1 本の目安は 2.5 分で 3〜6 MB。静止画主体の映像はほぼ音声の大きさになる。`lib/r2.ts` の単発 PUT で足りる見込みだが、上限は試作で確かめる

## DB スキーマ (migration `0042_lesson_videos.sql`)

`lessons.video_path` は使わない。seed が毎回上書きするうえ、版と古さの情報を載せられないため。`lesson_materials` にも混ぜない。あれは「資料」タブのダウンロード物で、動画は閲覧の形の 1 つだから。

**`lesson_videos`** — レッスンにつき 1 行

| 列 | 内容 |
|---|---|
| `id` | `stableUuid("lesson-video:<tenant>:<courseSlug>:<lessonId>")` |
| `lesson_id` | FK → lessons (unique, on delete cascade) |
| `created_at` / `updated_at` | |

**`lesson_video_versions`** — 版 (PK: `video_id, version`)

| 列 | 内容 |
|---|---|
| `video_id` / `version` | 連番。`max(version)` が現行 |
| `source_hash` | キーのハッシュ。直前の版と同じなら積まない (冪等) |
| `markdown_sha256` | 生成元の `lessons.markdown` の SHA-256 (**古さ判定**) |
| `video_path` / `captions_path` / `poster_path` | R2 キー (クライアントへは返さない) |
| `duration_ms` / `size_bytes` | |
| `chapters` | JSON `[{ slide, startMs, title }]` |
| `voice` | 例: `gemini/gemini-3.8-flash-tts/Charon` |
| `generator_version` / `created_at` | |

- 巻き戻し (A→B→A) は PDF と同じく新しい連番を積み、R2 のオブジェクトは同じキーを使い回す
- レッスンが消えれば cascade で行は消え、R2 のオブジェクトは残す (PDF と同じ)
- **古さ判定**: API が `sha256(lessons.markdown)` と現行版の `markdown_sha256` を比べる。数 KB のハッシュなので要求ごとに計算してよい。CMS で本文を直した場合も同じ判定に掛かる

## CI — `.github/workflows/video.yml` (新設)

```yaml
on:
  workflow_run: { workflows: [Deploy], types: [completed] }   # conclusion == success のときだけ進む
  workflow_dispatch:
    inputs: { courses: {}, max_topics: { default: "200" }, force: { default: "false" } }
concurrency: { group: video-main, cancel-in-progress: false }
```

手順は次のとおり。

1. **`main` の先頭を checkout** する (`workflow_run.head_sha` ではない)。直列に待たされた間に教材が進んでいても、最新の教材で作る
2. 対象を決める。manifest と `narration.json` から全トピックのソースハッシュを計算し、台帳に無いものだけを対象にする。無ければここで終わり (1 分程度)
3. 対象があるときだけ Playwright (キャッシュ) と ffmpeg を入れる
4. `content:video:sync:remote` を流す。TTS (キャッシュ優先) → 同期 → 描画 → 書き出し → R2 put → 台帳更新。トピック単位で並列にする (既定 2。GitHub 標準ランナーの vCPU 数に合わせる。private リポジトリの標準 Linux ランナーは 2 vCPU)
5. `db:videos:register:remote` を流す。**manifest に載った全トピック** (今回作った分だけでなく) を D1 HTTP API で冪等に登録する
   - `insert … select … where exists (select 1 from lessons where id = ?)` の形にする
   - レッスンがまだ無ければ飛ばす
   - 前回登録に失敗した分もここで拾い直す
6. ジョブサマリに生成数・失敗・推定費用・警告を出す。失敗したトピックが 1 つでもあれば、成功分を登録したうえで最後にジョブを赤にする

設計上の注意は次のとおり。

- **seed との独立。** seed は `lesson_videos` を触らず、`video.yml` は lessons を触らない。書く表が分かれているので、Deploy と並走しても壊れない。deploy の concurrency group に相乗りしない。GitHub は同じグループで保留を 1 つしか持たず、動画の保留がデプロイの保留を押しのけうるため
- **遅れて届く教材との交錯。** `video.yml` が seed より新しいコミットで動画を作ると、D1 の本文はまだ古い。この場合は古さ判定で非表示になり、seed が追いついた時点で自動的に有効になる。新しいトピックは lessons が無いので登録を飛ばし、次の回に拾う
- **1 回あたりの上限。** `max_topics` (既定 200) と推定費用の上限 (`VIDEO_BUDGET_USD`、既定 20 ドル) を超える分は次の回に回す。初回のバックフィルは講座を指定して手動で流す
- **content 指紋からの除外。** 台本まわりのファイル (`narration.json`・`narration-readings.json`・`narration/`・`NARRATION_GUIDE.md`) は seed に入らないので、`content-fingerprint.ts` の対象から外す。台本だけの変更で R2 画像・PDF・seed が走らないようにする。Deploy 自体は走り、その完了で `video.yml` が起きる
- **Secrets の追加。** `GEMINI_API_KEY` (または Grok 用の `AI_GATEWAY_ID` / `AI_GATEWAY_CF_API_TOKEN`)。`CLOUDFLARE_API_TOKEN` は R2 Edit と D1 Edit の既存権限で足りる

ローカル実行は次のとおり。

```bash
bun run content:video courses/it-basics                 # dist/video/<slug>/<id>/ に mp4・vtt・poster・report を出す
bun run content:video courses/it-basics --fake-tts      # TTS を呼ばず、推定長の無音で通す (鍵なしで描画・同期・配信を試す)
bun run content:video:sync && bun run db:videos:register   # ローカル R2 (wrangler --local) + ローカル D1 に登録
```

## API

**`GET /api/lessons/:lessonId/video`** (JWT)

- 認可は資料のダウンロードと同じ (受講者は公開済みステージかつ受講中、staff は常に可)
- 動画が無い、または受講者にとって古い場合: `{ video: null }`
- ある場合は次の形を返す

```json
{ "video": {
    "version": 3, "durationSec": 154.2, "generatedAt": "2026-10-02T03:12:00Z",
    "src": "https://api…/api/media/lesson-videos/<videoId>.3/video.mp4?exp=…&sig=…",
    "captions": { "src": "…/captions.vtt?exp=…&sig=…", "lang": "ja" },
    "poster": "…/poster.jpg?exp=…&sig=…",
    "chapters": [{ "startSec": 0, "title": "constとletの違い" }, …],
    "expiresAt": "…",
    "stale": false } }
```

- `stale` は staff にだけ返す。staff は古い版も受け取る (試聴してから判断できるように)

**`GET|HEAD /api/media/lesson-videos/:ref/:file`** (JWT なし・署名付き)

- `sig` = HMAC-SHA256(`deriveKey(AUTH_JWT_SECRET, "media-url-v1")`, `ref/file:exp`)。有効期限は 4 時間
  - 新しい Secret は増やさない
  - JWT の鍵を替えれば媒体 URL も無効になる
- 期限切れ・署名不一致は 403
- `ref` から版の行を引き、R2 キーを解決する。キーはクライアントに出ない
- `MATERIALS_BUCKET.get(key, { range: req.headers, onlyIf: req.headers })` で **Range / 206 / 416 / ETag** に対応し、`Accept-Ranges: bytes` を返す
- `Cache-Control: private, max-age=<残り秒>`
- CORS は既存の全体ミドルウェア (`ALLOWED_ORIGINS`) に乗る。`<track>` はクロスオリジンだと CORS が要るため
- 静止画主体の動画でも R2 → Worker の転送は無料。Range 要求は 1 再生あたり数回で、Workers の課金は無視できる

**`GET /api/lessons/:lessonId/video/versions`** (staff): 版の一覧 (版番号・生成日時・長さ・声・古さ) と、各版の署名付き URL。

## UI

**受講者 (`LessonPlayer`)**

- slides レッスンで `…/video` が動画を返したら、ビューアの上に「動画 / スライド」の切り替えを出す
  - 既定は動画
  - 選択は localStorage (`lms_slides_view_mode_v1`、try/catch で囲む) に覚える
- 動画が無い・古いときは今と全く同じスライド表示にする (「準備中」の表示も出さない)。`stale: true` の動画はここには出さない。staff が受講者画面で見ても受講者と同じ表示になり、古い動画の試聴は staff の動画欄で行う
- `VideoViewer` を次のように直す
  - `videoPath` の代わりに完全な `src` も受け取れるようにする
  - 空の `<track>` を `captions` の実トラックに替える (`crossOrigin="anonymous"`、既定オン、CC ボタンで切り替え)
  - 署名切れで `error` になったら `…/video` を取り直し、再生位置を戻す
  - 下に小さく「音声は AI による合成音声です」を出す (参考設計書のセキュリティ要件)
- 完了は、スライドの 90% 表示または動画の 90% 視聴のどちらか。動画モードのあいだは `useStudyTime` の滞在時間を積まない (`VideoViewer` が実再生秒数を記録するため、二重計上しない)
- チャプターがあれば、動画の下にスライド見出しの一覧を出し、押すとその位置へ移る (任意。フェーズ 2 の後半)

**staff**

- レッスンの教材パネルに「動画」欄を足す
  - 現行版・長さ・声
  - **「スライドが変わったため再生成待ち」** の印
  - 版履歴と各版の試聴
- 再生成のボタンは置かない。作り直しは Git と CI だけが行う (正本を 1 つに保つ)

VS Code 拡張・スキルツリー・lesson の型 (`type`) は変えない。

## 品質チェックとテスト

**書き出しごとの自動チェック (`report.json`・ジョブサマリ)**

| 対象 | 確かめること | 基準 | 不合格時 |
|---|---|---|---|
| 音声 | 推定長との比 | 40〜200% | 1 回作り直し → だめなら非公開 |
| 音声 | 音量・音割れ | -16 LUFS ±1、ピーク -1.5 dBTP 以下 | 非公開 |
| 字幕 | 表示時間・読む速さ | 1.5 秒以上、毎秒 10 字以下 | 警告 |
| 画面 | 代替フォント・画像の欠落 | 0 件 | 非公開 |
| 画面 | スライドの自動縮小が下限 (0.8) に張り付いている | — | 警告 (アプリでも同じく窮屈なので教材側の課題) |
| 音声 | 文字起こし (Whisper、Workers AI REST) と読み上げ文の不一致率 | 10% 以下 | フェーズ 4 で導入。1 回作り直し → 警告 |

数値の出典チェックは台本の段階 (`content:check`) で済ませるので、書き出し時にはやらない。

**開発時のテスト (Vitest。既存の `packages/**/*.test.ts` の網に入る)**

- 時刻の計算 (最短表示時間・無音削り後の長さ)
- 読み辞書の置き換え順・単語境界
- VTT の書式
- `slidesHash` / `cueHash` / ソースハッシュの安定性 (同じ入力 → 同じ値。どれか 1 つ変えると変わる)
- 台本の検証器 (各規則の正例・負例)
- TTS を偽物に差し替えたときの再試行・キャッシュ・異常長の扱い
- 登録 SQL の冪等性 (同じ manifest を 2 回流しても版が増えない。A→B→A で v3 が v1 と同じキー)
- 媒体ルートの Range (`bytes=0-`、`bytes=100-199`、範囲外 416、期限切れ・改ざん 403)
- 古さ判定 (受講者には null、staff には `stale: true`)
- スモーク: `--fake-tts` で it-basics の 1 トピックを最後まで通す (ffmpeg のある CI ジョブでだけ走らせる)

## 費用・時間の見積り (全 1,231 トピック、1 本 2.5 分と仮定)

| 項目 | 見積り | 前提 |
|---|---|---|
| 台本の下書き (Claude Opus 5.5) | 約 60〜120 ドル (Batches で半額側) | 1 トピック 入力 ~7K / 出力 ~3.5K トークン、$4 / $20 per MTok |
| 読み上げ (Gemini 3.8 Flash TTS) | 約 45 ドル | 計 51 時間の音声、音声 1 秒 = 25 トークン (参考設計書の仮定)、出力 $9 / MTok |
| 読み上げ (Grok TTS を選んだ場合) | 約 4 ドル | 計 92 万字、$4.20 / 100 万字 |
| R2 保存 | 月 0.1 ドル程度 | 5〜7 GB (旧版の保持で単調増加) |
| CI 時間 (初回) | 数時間 (講座ごとに分けて流す) | 1 本 20〜40 秒 (2 vCPU) × 1,231 ÷ 並列 2 |
| 定常 | 直したトピックの本数ぶん | 字幕 1 つの修正なら TTS 1 回 + 1 本の再エンコード |

トークン換算・エンコード時間・TTS の応答時間は、どれも関門 1 の試作で実測して置き換える。

## セキュリティ・運用

- API キーは GitHub Secrets と各自の環境変数だけで渡し、ログ・ファイル・R2 に書かない
- 教材の本文は Anthropic と Google (または xAI) に送られる。社内研修教材で個人情報は含まない前提。含めてしまった場合の扱いは PDF 設計の「保持の例外」に従い、運用者が R2 と版の行を手動で消す
- 実在の人の声の複製 (カスタム声でのクローン) は使わない。音声が AI 生成であることを画面に明記する。Gemini の音声には SynthID が入る
- 受講者に返すのは期限付きの署名 URL だけ。R2 キーも公開バケットの直リンクも返さない
- 動画は `r2:orphans` の棚卸し対象外 (`lesson-video/` は `tenant/` の外。PDF と同じ)

## 実装フェーズと関門

参考設計書にならい、各フェーズの終わりに関門を置き、満たしてから次へ進む。

1. **試作 (it-basics の 9 トピック)**
   - 作るもの: `NARRATION_GUIDE.md`、`content:narrate`、台本の検証器、TTS の差し替え口 (gemini / grok)、同期・描画・書き出し、`content:video` (ローカル出力のみ。R2・D1 には触れない)
   - **関門 1**:
     - 3 本を人が視聴し、台本の質と声を承認する
     - Gemini と Grok を聴き比べて声を決める
     - 字幕ごと生成の文のつながりを確認する
     - 音声 1 秒あたりのトークン数、1 本のエンコード時間、1 本の費用を実測する
2. **配信基盤**
   - 作るもの: migration 0042、登録スクリプト、`/video`・媒体ルート (Range)・版一覧 API、`VideoViewer` の汎用化と字幕、「動画 / スライド」切り替え、staff の動画欄
   - **関門 2**: ローカルで次を手で確認する
     - シーク
     - 字幕のオン/オフ
     - 署名切れからの復帰
     - 本文を直したときに受講者から消え、staff に「古い」が出ること
     - 90% 視聴で完了すること
3. **CI 化**
   - 作るもの: `video.yml`、台帳・TTS キャッシュ・上限、`content:check` への台本検査、content 指紋から `narration.json` を外す
   - **関門 3**:
     - it-basics が本番に出る
     - 1 往復を確認する: スライドを直す → CI が台本の古さで落ちる → 作り直して push → 新版が積まれ、旧版は残る
4. **バックフィルと仕上げ**
   - 講座ごとに `content:narrate --batch` → PR レビュー → マージ → `video.yml` を手動で流す
   - Whisper による読み上げ検査、箇条書きの段階表示・コード行のハイライト (スライドの「状態」を増やす)
   - ADDING_COURSE.md・STYLE_GUIDE・`packages/content/CLAUDE.md`・AGENTS.md の更新 (新規トピックは台本必須)

## 参考設計書との対応

| 参考設計書 | 本設計 |
|---|---|
| ① 構成: LLM が章・字幕・図のテンプレートを選ぶ (`storyboard.json`) | **スライドが絵コンテ**。LLM は字幕 (読み上げ台本) だけを書く (`narration.json`)。座標も秒数も LLM に決めさせない原則はそのまま |
| ② 読み上げ: Gemini 3.8 Flash TTS、字幕単位、ハッシュ名でキャッシュ | 同じ。ただしキャッシュは CI 向けに R2 + 台帳に置き、Grok (既存経路) への差し替え口を持つ |
| ③ 同期: 音声長から timeline | 同じ式。「章」をスライド 1 枚に読み替える |
| ④ 描画: Kamishibai.js のテンプレート + `renderAt(t)` の全フレーム描画 | **アプリの `slides-skin.css` でスライドを静止画に撮る**。変化がスライドの切り替えだけなので、全フレーム描画は要らない |
| ⑤ 書き出し: 字幕焼き込み MP4 + vtt/srt + preview.html | 焼き込まない MP4 + VTT。プレビューはアプリ本体 (ローカルでは `dist/video/`) |
| CLI `kamishibai make` / 段階ごとのコマンド | `content:narrate` (執筆時) と `content:video` / `video.yml` (CI) の 2 つに分ける |
| 実行場所: 未決 | 台本はローカル (執筆時)。音声以降は GitHub Actions |
| 構成用 LLM: 未決 | Claude (repo の既存利用と、教材の執筆エージェントにそろえる) |
| BGM・2 人の掛け合い・動画サイトへの投稿 | 対象外 (下記) |

## 未決事項

- [ ] 声: Gemini の既定 30 声から選ぶか、Grok (`eve` ほか 5 声) にするか (関門 1 の試聴で決める)
- [ ] Gemini TTS を AI Gateway (Google AI Studio プロバイダ) 経由にして、鍵と課金・ログを既存の Gateway に集約できるか
- [ ] 受講者の既定表示を「動画」にするか「スライド」にするか (本設計の提案は動画)
- [ ] バックフィル PR のレビュー方針: 全文を読むか、抜き取りにするか (1 講座 30〜160 トピック)
- [ ] 1 回あたりの上限 (`max_topics` / `VIDEO_BUDGET_USD`) の値
- [ ] 準備中のプレースホルダ 17 講座 (「この講座で学ぶこと」1 トピック) に動画を付けるか (提案: 付けない。本執筆で書き直されるため)

## 対象外 (明示)

- 実写・画面収録 (Playground の実演など)。ノートの「実演する」は、静止画で成り立つ語りに置き換える
- BGM・効果音、2 人の掛け合い
- 字幕の焼き込み版、YouTube 等への自動投稿
- CMS で作った講座の動画自動生成 (CMS の動画レッスンは従来どおり手動アップロード)
- doc.md / practice.md の動画化 (動画はトピック = slides だけ)
- 受講者への版履歴の公開
