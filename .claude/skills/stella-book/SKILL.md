---
name: stella-book
description: "STELLA の「本棚」に入れる stella-book 形式の zip を作るスキル。本の章を Markdown の本文・朗読の音声 (md-audiobook)・先輩と後輩が図解ボードで掛け合う対話の解説動画 (Gemini TTS + HyperFrames の MP4)・表紙にまとめ、book.json を書き、STELLA と同じ規則で検査して zip にする。「本棚に入れたい」「STELLA の本棚用に」「stella-book」「本の zip を作って」「解説動画を作って」「対話形式の動画」「章ごとに動画と朗読を付けて」「本棚に追加できる形に」といった依頼で、書籍の Markdown・画像 PDF・Web 記事・章の一覧が渡されたら必ずこのスキルを使うこと。朗読や文字起こしだけなら md-audiobook でよいが、STELLA で読む・聴く・観るための形にまとめる話ならこのスキル。既存の本の章を足す・直す・作り直す依頼にも使う。"
---

# STELLA の本棚に入れる本 (stella-book) を作る

STELLA の本棚 (`/library`) は、利用者が作った zip を開くと本を登録し、どの端末からでも
読む・聴く・観ることができる。このスキルはその zip を作る。

- **本文** (`chapters/*.md`)：章ごとの Markdown。画像 PDF・Web 記事なら md-audiobook で文字起こしする。
- **朗読** (`audio/*.m4a`、任意)：本文の全部を 1 人の声で読む。md-audiobook の原文朗読モードで作る。
- **解説動画** (`video/*.mp4`、任意)：章の要点を、先輩と後輩の掛け合いと図解ボードで理解する 5〜10 分の動画。
  このスキルの中心。台本 (絵コンテ) は Claude が書き、音声・画面・書き出しは同梱のスクリプトが行う。
- **表紙** (`cover.jpg` など) と **book.json** (本の id・題名・章の一覧)。

スクリプトは `scripts/` (以下 `$SKILL_DIR/scripts/...`)。絵コンテの書き方は `references/storyboard_guide.md`。
以下の `$SKILL_DIR`・`$WORK` (本の作業フォルダー)・`$C` (章の作業フォルダー) は、実際のパスに置き換えて書く
(シェルの変数はコマンドをまたいで残らないことがあるため)。

## 0. 事前確認 (セッションの最初に一度)

**動画を作るのは Node.js 22 以上・ffmpeg・Chrome のある環境** (Claude Code など)。本文と朗読だけなら
md-audiobook が動く環境でよい。

```bash
node --version; ffmpeg -version | head -1
curl -s -o /dev/null -w "%{http_code}\n" --max-time 15 https://generativelanguage.googleapis.com/v1beta/models
```

- Gemini に届くか：`000` や接続拒否ならネットワークの許可が要る (md-audiobook の手順 0 と同じ)。
  `400/401/403` の JSON が返れば届いている。
- **API キー**：`GEMINI_API_KEY`、なければ md-audiobook と同じ `~/.config/md-audiobook/gemini_key`。
  **キーの値は表示・復唱・ログ出力しない。** Claude Code のクラウド環境なら、利用者に環境の設定へ
  `GEMINI_API_KEY` を足してもらう (チャットに貼らせない。新しいセッションから読める)。
- 動画の道具を作業フォルダーに入れる (版は `scripts/package.json` で固定してある)：
  ```bash
  mkdir -p "$WORK/node" && cp $SKILL_DIR/scripts/package.json "$WORK/node/"
  npm install --prefix "$WORK/node" --no-audit --no-fund
  "$WORK/node/node_modules/.bin/hyperframes" doctor   # Chrome・FFmpeg が ✓ か
  ```
  `$WORK` は本ごとの作業フォルダー (手順 2)。動画のスクリプトには毎回 `--node-modules "$WORK/node/node_modules"` を渡す。

## 1. 何を作るか決める

- 本の題名・著者、対象の章 (全部か、どの章か)。
- 章ごとに **本文 / 朗読 / 解説動画** のどれを付けるか。指定がなければ一度だけ聞く。
  答えがなければ「本文は全章・朗読は全章・解説動画は指定の章だけ (無ければ最初の 1 章)」で進める。
  解説動画は 1 章ごとに台本づくりと確認が要り、書き出しも動画の長さと同じくらいかかるため。
- 既存の本に章を足す・直すときは、前に作った本のフォルダー (book.json) を使う。
  **同じ book.json の id で作り直すと、STELLA では同じ本の新しい版になる** (中身が同じファイルは送り直されない)。

## 2. 本のフォルダーを用意する

```
<書名>/                   本のフォルダー (zip に入るのはここだけ)
  book.json
  cover.jpg
  chapters/01.md …
  audio/01.m4a …          (任意)
  video/01.mp4 …          (任意)
  images/…                (本文の図、任意)
<書名>_work/              作業フォルダー ($WORK。zip に入れない)
  node/                   動画の道具 (手順 0)
  ch01/storyboard.json    絵コンテ
  ch01/audio/             セリフごとの音声と timings.json
  ch01/layout/ ch01/video/ ch01/shots/
```

```bash
python3 $SKILL_DIR/scripts/book_manifest.py init "<書名>" --title "書名" --author "著者" \
  [--description "説明"] [--cover cover.jpg]
```

- 置き場所は、利用者の指定が無ければ一時的な作業領域 (スクラッチパッドなど) にする。Git のリポジトリの中には置かない
  (本の内容をうっかりコミットしないため)。前に作った本を直すときは、その本のフォルダーを使う。
- id (UUID) は init で最初に 1 度だけ作られ、あとの init では変わらない。
- 表紙：利用者の画像 (写真・出版社の画像、.jpg/.png/.webp、10MB まで) があればそれを置く。無ければ仮の表紙を作る：
  ```bash
  node $SKILL_DIR/scripts/make_cover.mjs --title "書名" --author "著者" --note "本文・朗読・解説動画" \
    --out "<書名>/cover.jpg" --work "$WORK" --node-modules "$WORK/node/node_modules"
  ```
- 絵コンテ・作業の音声は本の内容から作ったもの。利用者の手元か利用者のドライブに置き、共有のリポジトリには置かない。

## 3. 本文 (chapters/NN.md)

- 画像 PDF・Web 記事は **md-audiobook の手順 2A / 2B** で Markdown にし、そこでの確認 (重複チェック・紙面との照合)
  まで済ませる。〔 〕の補完の印は残してよい (本棚にもそのまま出る)。
- 1 章 1 ファイル、2MB まで。章の題名は book.json に書くので、先頭の `# 章の題名` は梱包のときに外れる。
- 文字起こしのページ印 `<!-- p.N -->` などの HTML コメントも梱包のときに外れる (本棚では文字のまま出てしまうため)。
  コードブロックとインラインコードの中は本文なので残る。外すと空になる章は梱包で止まる。
  それ以外の生の HTML タグは梱包が警告するので、Markdown に直す。
- 図は `images/` に置き、本文から `![説明](../images/fig-1-1.png)` のように指す (`images/` の外は表示されない)。

## 4. 解説動画 (video/NN.mp4)

章ごとに次を行う。`$C` = `$WORK/ch01` など。

**4-1. 絵コンテを書く。** `references/storyboard_guide.md` を読み、章の本文全体を読んでから `$C/storyboard.json` を書く。

```bash
python3 $SKILL_DIR/scripts/check_storyboard.py "$C/storyboard.json" --source "<書名>/chapters/01.md"
```

エラーは直す。書いたら一度、原文と照らして抜け・誤り・原文にない事実がないかを読み直す。

**4-2. 画面だけを組んで静止画で確かめる** (音声なし・長さは推定。API を呼ばないので何度でもできる)：

```bash
node $SKILL_DIR/scripts/build_video.mjs --storyboard "$C/storyboard.json" --layout-only --out "$C/layout" \
  --node-modules "$WORK/node/node_modules"
"$WORK/node/node_modules/.bin/hyperframes" snapshot "$C/layout" --no-end -o "$C/shots" \
  --at "$(python3 $SKILL_DIR/scripts/snapshot_times.py "$C/layout/timeline.json")"
```

`$C/shots/contact-sheet-*.jpg` を見て、ガイドの 7 章の点 (はみ出し・字幕の段数・枠の位置・矢印) を確かめる。
直したら同じ場面だけ撮り直す (`snapshot_times.py --scene s3`)。

**4-3. セリフの音声を作る。** まず計画だけ見る (API を呼ばない)：

```bash
python3 $SKILL_DIR/scripts/synth_lines.py "$C/storyboard.json" -o "$C/audio" --dry-run
python3 $SKILL_DIR/scripts/synth_lines.py "$C/storyboard.json" -o "$C/audio"
```

- 1 行 1 リクエストで、行ごとの長さを測る (字幕と図をセリフに合わせるため)。成功した行はキャッシュされ、
  失敗した行は同じコマンドの再実行で続きから作る。台本を直した行だけが作り直される。
- 依頼全体の音声が 60 分を超えそうなら、長さを伝えてから進める (料金がかかるため)。
- `--mock` は API を呼ばない試験用の音。本番の動画には使えない (build_video.mjs が止める)。

**4-4. 組み立てて書き出す** (書き出しは動画の長さと同じくらいかかる。長いときはバックグラウンドで)：

```bash
node $SKILL_DIR/scripts/build_video.mjs --storyboard "$C/storyboard.json" --audio "$C/audio" --out "$C/video" \
  --node-modules "$WORK/node/node_modules"
"$WORK/node/node_modules/.bin/hyperframes" render "$C/video" -o "<書名>/video/01.mp4" --fps 30
ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=duration -of compact "<書名>/video/01.mp4"
```

H.264 (1920×1080)・AAC で、長さが `$C/video/timeline.json` の `total` とほぼ同じなら良い。
出来上がりから 3 枚ほど取り出して見る (`ffmpeg -ss <秒> -i video/01.mp4 -frames:v 1 frame.png`)。

## 5. 朗読 (audio/NN.m4a、任意)

**md-audiobook の手順 3 (原文朗読) と手順 5** で作る。出力は `--format m4a` (章マーカー付き) にし、
`<書名>/audio/01.m4a` に置く。台本は手順 3 の本文 (〔〕を外した読み上げ用) から作る。

## 6. book.json に章を書き、zip にまとめる

```bash
python3 $SKILL_DIR/scripts/book_manifest.py chapter "<書名>" --id ch01 --title "1章 …" \
  --text chapters/01.md [--audio audio/01.m4a] [--video video/01.mp4]
python3 $SKILL_DIR/scripts/pack_book.py "<書名>" --check
python3 $SKILL_DIR/scripts/pack_book.py "<書名>" -o "<書名>.zip"
```

- 章の id (`ch01` など) は絵コンテの `chapter.id` と同じにする。章の順は book.json の並び。
- `pack_book.py` は STELLA の取り込みと同じ規則で検査する (欠け・形式・大きさ・危険なパス)。
  エラーが出たら zip を作らないので、直して再実行する。警告 (外したコメントの数など) は報告に添える。
- 上限：本文 2MB・画像と表紙 10MB・音声 1GB・動画 2GB・1 冊 4GB・1000 ファイル・300 章。

## 7. 渡し方

- zip を利用者に渡す (SendUserFile など)。利用者は STELLA の「本棚」で「本を追加」を押すか、zip を棚に落とす。
  確認の画面で表紙・章の数・音声と動画の有無が出て、「本棚に追加」で登録される。大きな動画は自動で分けて送られる。
- 報告は短く：本の題名、章の数、朗読と動画を付けた章、動画の長さ、zip の大きさ、梱包の警告。
  動画を作った章は、台本 (`storyboard.json` の行) を Markdown にして一緒に渡すと確認しやすい。
- 絵コンテと音声のキャッシュ (`<書名>_work/`) は残しておくと、直すときに変わった行だけを作り直せる。

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `hyperframes doctor` で Chrome が ✗ | HyperFrames は初回の書き出し・静止画で専用の Chrome (chrome-headless-shell) をダウンロードする。ネットワークで止まるときは Chrome の入った環境で動画の手順を行う (本文・朗読・梱包は Chrome なしでできる) |
| 静止画で項目がボードからはみ出す | ボードの文言を短くする (ガイドの 4 章の長さ)。`flow` の縦は 6 段まで |
| 字幕が 3 段を超える | `check_storyboard.py` の 72 字の制限を守り、長い行は同じ話者の行に分ける |
| 「ショートポーズ」と読まれる・演技指示が読まれる | 本文からタグ・括弧の指示を消し、`style` に移す |
| HTTP 429 が続く | `synth_lines.py --workers 2` (成功した行は再利用される) |
| `timings.json は試験用の音` で止まる | `--mock` で作った音。`--mock` なしで synth_lines.py を実行し直す |
| 取り込みで「…がありません」「使えない形式」 | `pack_book.py --check` の指摘どおり book.json のパスとファイルを合わせる |
| 本棚に `<!-- p.3 -->` が出る | 古い zip。`pack_book.py` で作り直す (コメントは梱包で外れる) |
| 同じ本が 2 冊になった | book.json の id が変わっている。前の本のフォルダーの book.json を使って作り直す |
