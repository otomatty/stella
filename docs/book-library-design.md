# STELLA 本棚の設計

作成日 2026年10月11日 / 改訂 2026年11月3日  
状態 採用設計（実装済み。段階と残りは [実装計画](book-library-implementation-plan.md)）  
[開発・検証の手順](book-library-development.md)

本棚 (`/library`) は、利用者が自分で作った本を STELLA に置き、どの端末からでも読む・聴く・観るための機能である。本は `stella-book` 形式の zip で、Markdown の本文・朗読の音声・対話形式の解説動画と表紙をまとめる。zip を開くと本の情報が自動で登録され、一覧は表紙を棚に並べた見た目にする。

## 1 決めたこと

| 項目 | 決定 |
| --- | --- |
| 名称 | 「本棚」（旧「個人の本棚」） |
| 登録 | 書籍情報は手で入力しない。アプリが定める zip を開くと登録される |
| 一覧 | 表紙のサムネイルを棚板の上に並べる |
| 中身 | Markdown の本文、朗読の音声、対話形式の解説動画。PDF は扱わない |
| 作り方 | 利用者が手元で Claude のスキルを使って作る。STELLA は作らない（保管と配信だけ） |
| 共有 | しない。本人の端末間で使うだけ（サーバーに保存し、講師・管理者も他人の本は読めない） |

2026年11月に、PDF を OCR・章分割・読み上げ生成する仕組み（`apps/narrator`・`packages/book-core`・Web の PDF 分割）を退役させた。登録済みの本は移行せず削除した（migration 0070 が旧テーブルを落とし、R2 のファイルを片付けの対象に積む）。本番の `stella-narrator` Worker と secret `GEMINI_API_KEY` は `deploy.yml` の退役の step が消す。

## 2 本の形式 `stella-book` v1

```text
<任意の名前>.zip
├── book.json                     必須
├── cover.(webp|jpg|jpeg|png)     必須 (book.json の cover が指す。縦 2:3 推奨)
├── chapters/*.md                 必須 (章ごと 1 ファイル。UTF-8)
├── audio/*.(m4a|mp3)             任意 (章の朗読)
├── video/*.mp4                   任意 (章の対話解説。H.264/AAC、faststart)
└── images/*.(png|jpg|jpeg|webp|gif)  任意 (本文から相対パスで参照する図)
```

```json
{
  "format": "stella-book",
  "version": 1,
  "id": "6f1c2a8e-1b2c-4d3e-8f90-123456789abc",
  "title": "書名",
  "authors": ["著者"],
  "language": "ja",
  "description": "紹介文 (任意)",
  "cover": "cover.webp",
  "chapters": [
    { "id": "ch01", "title": "第1章 ...", "text": "chapters/01.md",
      "audio": "audio/01.m4a", "video": "video/01.mp4" }
  ]
}
```

規則の正本は `@stella/shared/library/book-package`（`parseBookManifest`・`planPackageFiles`・`resolveMarkdownImage`）で、Web（取り込み前の確認）と API（受け取り）が同じ関数を使う。

- `format` は `"stella-book"`、`version` は `1` だけ。知らない項目は誤りにする（綴り違いを黙って捨てない）。
- `id` は UUID。同じ利用者が同じ `id` の zip を開き直すと、その本の新しい版になる。別の利用者の同じ `id` は別の本。
- `title` 1〜200 文字、`authors` 10 人まで、`language` は既定 `ja`、`description` 2000 文字まで。
- `chapters` は 1〜300 個。章の `id` は英小文字・数字・`-`・`_` の 64 文字以内で、本の中で一意。読書位置は章の `id` で版をまたいで引き継ぐ。
- パスは zip の中の相対パス。先頭の `/`・`\`・`..`・制御文字は拒む。拡張子で種類を決め、HTML・SVG は受け付けない（同じオリジンで配信するため）。
- 上限は本文 2MB、画像・表紙 10MB、音声 1GB、動画 2GB、1 冊 4GB・1000 ファイル、1 人 20GB。
- zip には book.json・表紙・章のファイル・`images/` の画像だけを入れる。`__MACOSX/`・`.DS_Store` などは黙って無視し、それ以外の余計なファイルは「取り込まないファイル」として見せる。
- 本文の画像は `![説明](../images/fig1.png)` のように .md からの相対パスで書く。外部 URL の画像は読み込まず、説明の文字だけを出す。生の HTML は描かない。
- zip を作るときは、音声・動画を無圧縮（STORED）で入れ、MP4 は `-movflags +faststart` で書き出す（先頭から再生を始められる）。

## 3 取り込みの流れ

zip はサーバーで展開しない（Workers のメモリ 128MB・要求本文 100MB）。

1. 本棚にドロップするか「本を追加」で zip を選ぶ。ブラウザ（`@zip.js/zip.js`）が中央ディレクトリだけを読み、book.json を検査し、表紙を幅 360px の JPEG に縮める。
2. 表紙・書名・章の数・音声と動画の数・合計サイズ・取り込まないファイルを見せて、利用者が「本棚に追加」で確定する。
3. `POST /api/library/imports` に book.json と一覧（パス・大きさ・CRC-32）とサムネイルの SHA-256 を送る。サーバーは同じ規則で検査し直し、版を作り、送るべきファイルを返す。
4. ブラウザは zip から 1 ファイルずつ取り出して送る。90MB 以下は 1 回の PUT、それより大きいものは R2 の multipart（64MiB ずつ。取り出しながら送り、全体をメモリに載せない）。
5. 全部送り終えたら `POST .../imports/:revision/complete` で版を切り替える。前の版だけが使っていたファイルは片付けに回す。

同じ本の版の間で、中身が同じファイル（CRC-32・サイズ・形式が同じ）は送り直さない。送信が途中で止まっても、同じ zip を開き直せば送り終えたファイルを飛ばして続きから送る。違う zip を開けば、取り込み中だった版を置き換える。版を切り替えるまでは前の版を読める。

## 4 保存と配信

- 本の情報・本棚・読書位置は D1、ファイルは非公開 R2 `stella-library-private`（binding `LIBRARY_BUCKET`）。R2 キーは `library/<tenantId>/<bookId>/files/<fileId>` で、zip の中のパスやファイル名からは作らない。
- 本番は Web と API が同じオリジン（Web の Worker が `/api/*` を中継）で、ログインは Better Auth の Cookie。表紙・画像・音声・動画は `<img>/<audio>/<video>` に API の URL をそのまま渡す。短期の配信チケットは作らない。API が別オリジンのローカル開発だけ、fetch して blob URL にする（`useLibraryMediaUrl`）。
- `GET /api/library/books/:id/content/<パス>` は今の版のファイルを返す。`Range`（1 範囲）・`206`・`HEAD`・範囲外の `416` に対応する。
- 利用者が上げたファイルは、拡張子の許可表から決めた Content-Type、`X-Content-Type-Options: nosniff`、`Content-Security-Policy: sandbox; default-src 'none'`、`Cross-Origin-Resource-Policy: same-origin`、`Referrer-Policy: no-referrer` で返す。キャッシュは `private, no-store`、表紙のサムネイルだけ URL に版を入れて `private, max-age=31536000, immutable`。

## 5 データモデル（migration 0070）

| テーブル | 内容 |
| --- | --- |
| `library_books` | 本。所有者・book.json の id・表示用の書誌・今の版 (`current_revision`)・取り込み中の版 (`pending_*`)・状態 (`importing / ready / deleting`) |
| `library_files` | ファイル。中身の鍵 (`content_key`)・種類・Content-Type・大きさ・R2 キー・送信状態・multipart の ID。版をまたいで使い回す |
| `library_revision_files` | 版ごとの「zip の中のパス → ファイル」 |
| `library_chapters` | 版ごとの章 (id・順番・題・本文/音声/動画のパス) |
| `library_shelf_entries` | 本人の読書状態・お気に入り・タグ・最後に開いた章 |
| `library_reader_states` | 本人×章の音声・動画の位置と済みの印。項目ごとの端末の時刻 (`audio_client_at`・`video_client_at`・`completed_client_at`) より古い送信は、その項目だけを巻き戻さない |
| `library_r2_purges` | R2 から消す接頭辞 (本 1 冊かファイル 1 つ) |

親子は `(tenant_id, id)` の複合外部キーでテナントを跨がない。多くの行は JSON の配列を 1 つの値として渡して 1 文で書く（D1 の 1 文 100 変数の制限）。

## 6 API（`/api/library/*`、すべて `getCaller` の本人）

| API | 用途 |
| --- | --- |
| `GET /capabilities` | 使えるか (`LIBRARY_ENABLED` と R2 の束ね) と上限 |
| `GET /mine?filter=all\|reading\|unread\|finished\|favorite` | 本棚 |
| `POST /imports` | 取り込みの開始・再開・更新 |
| `PUT /books/:id/files/:fileId` | ファイル 1 つを送る (90MB 以下) |
| `POST .../multipart`、`PUT .../multipart/parts/:n`、`POST .../multipart/complete` | 大きいファイルを分けて送る |
| `POST /books/:id/imports/:revision/complete`、`DELETE /books/:id/imports/:revision` | 版の切り替え・取り消し |
| `GET /books/:id` | 本と章と本人の位置 |
| `GET /books/:id/cover`、`GET /books/:id/content/*` | 表紙のサムネイル・本の中のファイル |
| `PUT /books/:id/chapters/:chapterId/state` | 音声・動画の位置と済みの印 |
| `PUT /shelf/:id` | 読書状態・お気に入り・タグ・最後に開いた章 |
| `DELETE /books/:id` | 削除 (すぐ 404 にし、R2 と行は cron が片付ける) |

講師・管理者も他人の本は 404。無効化した利用者は 403。

## 7 画面

- `/library`：表紙を棚板の上に並べる（幅に応じて 1 段 3〜8 冊）。表紙の上に音声・動画の有無、お気に入り、読書中なら進み具合を小さく出す。絞り込みは「すべて / 読書中 / 未読 / 読了 / お気に入り」。ページ全体に zip をドロップできる。
- `/library/$bookId`：表紙・書名・著者・紹介、「続きから」、お気に入り、読書状態・タグ、「更新版を読み込む」（book.json の id が違う zip は拒む）、削除、章の一覧。
- `/library/$bookId/$chapterId`：解説動画、本文、画面下に固定した朗読のプレイヤー（15 秒戻る・30 秒進む・速度 0.75〜2.0・Media Session）。位置は 15 秒ごと・一時停止・画面を離れるときに保存し、開き直すと続きから再生する。動画と朗読は同時に流さない。

## 8 削除と片付け

本の削除は `status='deleting'` にして直ちに読めなくし、`library/<t>/<b>/` を `library_r2_purges` に積む。API の 15 分 cron（`runLibraryPurge`）が、積んでから 10 分以上たった接頭辞の R2 を消し、消し終えた本の行を消す（送信中のファイルを途中で消さないため待つ）。1 回の R2 の呼び出しは 20 までにし、ほかの cron と枠を分け合う。7 日以上止まったままの取り込みは捨てる（最初の版なら本ごと削除）。送信の完了時に本が削除中・ファイルが片付け済みなら、送ったオブジェクトをその場で消す。

## 9 共有しない理由

本は本人の端末間で使うためにサーバーに置く。市販の本を文字起こし・音声化・解説動画化したものは、本人が使う範囲なら私的使用に収まりやすいが、ほかの人に渡すと（社内の数人でも）私的使用の範囲を超え、会社のシステムで渡せる状態は公衆送信に当たりうる。そのため共有の仕組みは作らない。旧設計はサーバー側で OCR・音声化していたが、新設計は利用者が手元で zip を作り、サーバーは保管と配信だけを行う。
