# STELLA 本棚の実装計画

作成日 2026年10月11日 / 改訂 2026年11月3日  
状態 R1〜R4 実装済み、R5 (zip を作るスキル) は初版 (`.claude/skills/stella-book`)。本物の音声での 1 章の試作と確認が残り (#148)  
[設計](book-library-design.md) / [開発・検証の手順](book-library-development.md)

2026年11月の見直しで、本棚は「PDF を STELLA が処理する」形から「利用者が作った zip を STELLA が保管・配信する」形に変えた。

## 1 段階

| 段階 | 内容 | 状態 |
| --- | --- | --- |
| R1 | 名称を「本棚」に。形式 `stella-book` v1 の規則と検査 (`@stella/shared/library/book-package`) | 済み |
| R2 | zip の取り込み (ブラウザで読む・続きから・更新・multipart)、表紙のサムネイル、棚の見た目 | 済み |
| R3 | 読む・聴く・観る画面、音声・動画の位置と済みの印の保存 | 済み |
| R4 | PDF 処理の退役 (narrator・book-core・PDF の API とテーブル・secret・deploy の step) | 済み (本番の Worker は次のデプロイで消える) |
| R5 | zip を作る Claude のスキル `stella-book` (本文・朗読・対話の解説動画・梱包) | 初版。本物の音声での試作と確認が残り (#148) |

## 2 R5 zip を作るスキル

本文と朗読は既存のスキル md-audiobook の手順 (画像 PDF・Web ページの文字起こし、原文朗読) を使い、新しいスキル `stella-book` が解説動画を足して zip にまとめる。md-audiobook 自体は変えない。

対話形式の解説動画は次の方針で利用者の了承を得ている。まず 1 章で試作して見てもらい、そのあとスキルにする。

- 朗読音声は本文の全部、動画は要点を図で理解する対話 (先輩と後輩)。長さは原文の 25〜35% (1 章 5〜10 分、長くても 15 分)。
- 1920×1080・30fps。上に章と節の名前と節の進み、中央に「図解ボード」(要点カード・箱と矢印の図・比較表・8 行までのコード・まとめ) がセリフに合わせて現れ、下に話者付きの字幕 (台本の文をそのまま焼き込む)。2 人は抽象的なアイコンで、話している方が光る。
- 台本は md-audiobook の対話ガイドのルール (声 Charon / Aoede、原文にない事実を足さない) に、場面とボードの指定を足した絵コンテにする。
- 音声はセリフごとに Gemini 3.8 Flash TTS で作り、ffprobe で長さを測ってから画面の時間を決める (字幕と図をセリフに合わせるため)。
- 画面は HyperFrames (Apache-2.0、HTML、Node 22 + FFmpeg + headless Chrome) で組む。場面ごとに静止画を 3 枚書き出して確認してから全体を書き出す。MP4 は H.264/AAC・faststart。
- 実写風の AI 映像は使わない。本の図版は切り貼りせず描き直す。

梱包では book.json を形式どおりに書き、`planPackageFiles` と同じ規則 (パス・拡張子・上限) を満たすことを確かめてから zip にする。音声・動画は無圧縮で入れる。

### スキルの初版 (2026-11-03)

- 置き場は `.claude/skills/stella-book/`。このリポジトリで Claude Code を開くとプロジェクトのスキルとして読み込まれる。
  claude.ai で使うときは、同じフォルダーをスキルとしてプロフィールに保存する。
- `SKILL.md` (手順)・`references/storyboard_guide.md` (絵コンテの書き方)・`scripts/`。
  - `book_manifest.py`・`make_cover.mjs`・`check_storyboard.py`・`synth_lines.py`
  - `build_video.mjs` と `video.css`・`snapshot_times.py`・`pack_book.py`
  - `package.json` (HyperFrames 0.9.7・GSAP 3.13.0・Noto Sans JP 5.2.8 に固定)
- 梱包の検査 (`pack_book.py`) は Python で `parseBookManifest`・`planPackageFiles` と同じ規則を持つ。
  ずれは `packages/shared/src/library/stella-book-skill.test.ts` が検査するので、形式の規則を変えたらスキルも直す。
- 本文の HTML コメント (文字起こしのページ印) と、章の題名と同じ先頭の見出しは梱包で外す (本棚では文字のまま出る・題名が重なるため)。
- 試験用の音 (`synth_lines.py --mock`) で 1 章 (11 分) を通し、8 分ほどで H.264・AAC・faststart の MP4 (約 38MB) になり、
  本棚に取り込んで途中から再生できることを確かめた。本物の音声での試作は Gemini の API キーが要る (#148)。

## 3 残りと確かめていないこと

- スマホ実機での長い音声のバックグラウンド再生・画面ロック中の位置保存は未確認 (位置は一時停止・画面を離れるときにも保存する)。
- 2GB 近い動画の multipart 送信は小さな部分の大きさでしかテストしていない (64MiB ずつの実機の送信は未確認)。
- 端末に保存してオフラインで聴く機能は持たない。
