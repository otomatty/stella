# 本棚の開発と検証

[設計](book-library-design.md) / [実装計画](book-library-implementation-plan.md)

## コードの場所

| 場所 | 内容 |
| --- | --- |
| `packages/shared/src/library/book-package.ts` | 形式 `stella-book` v1 の規則 (正本)。Web と API が共有 |
| `packages/shared/src/library/{types,schemas}.ts` | API の型と要求の検査 |
| `apps/api/src/routes/library.ts` | 本棚の API (取り込み・送信・配信・位置) |
| `apps/api/src/lib/library-store.ts`・`library-purge.ts` | 孤児のファイルの片付け、15 分 cron の R2 の削除 |
| `apps/api/drizzle/0070_library_book_packages.sql` | テーブル (旧テーブルの削除を含む) |
| `apps/web/src/lib/book-package/read-package.ts` | ブラウザで zip を読む (zip.js) |
| `apps/web/src/lib/library-api.ts`・`library-media.ts`・`library-shelf.ts` | API の呼び出しと送信、配信の URL、棚の並べ方 |
| `apps/web/src/components/library/*` | 本棚・本・章の画面と取り込みのダイアログ |
| `.claude/skills/stella-book/` | zip を作る Claude のスキル (本のフォルダー・解説動画・梱包)。梱包の検査は `book-package.ts` と同じ規則 |
| `packages/shared/src/library/stella-book-skill.test.ts` | スキルの梱包 (`pack_book.py`) と正本の規則の判定が一致するかの検査 |

## ローカルで動かす

```sh
bun run db:migrate
bun run db:seed
bun run dev:api   # :8787。本棚の R2 は wrangler dev のローカル R2
bun run dev       # :5173。apps/web/.env.local に VITE_SERVER_URL=http://127.0.0.1:8787
```

ログインは開発用トークン (AGENTS.md の Local login)。API が別オリジンなので、画面は表紙・画像・音声・動画を fetch して blob URL で表示する (本番は同じオリジンの URL をそのまま使う)。本棚を閉じるには API の `.dev.vars` に `LIBRARY_ENABLED=0`。

## 見本の zip を作る

本物と同じ形の zip は、スキル `stella-book` の手順で作る (`book_manifest.py` で book.json、`pack_book.py` で検査と梱包)。
動画の書き出しまで試すなら、スキルの手順 4 を `synth_lines.py --mock` (API を呼ばない試験用の音) と
`build_video.mjs --allow-mock` で通す。手で最小の zip を作るなら次のとおり。

```sh
mkdir -p book/chapters book/audio book/video book/images && cd book
ffmpeg -f lavfi -i "color=c=0x1e3a5f:s=600x900" -frames:v 1 cover.png
ffmpeg -f lavfi -i "sine=frequency=330:duration=40" -c:a aac audio/01.m4a
ffmpeg -f lavfi -i "testsrc=size=640x360:rate=24" -f lavfi -i "sine=duration=12" -t 12 \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart video/01.mp4
printf '# 第1章\n\n本文。\n' > chapters/01.md
# book.json は設計書 2 章の例を書き換える (id は uuidgen で作る)
zip -0 -r ../book.zip audio video images cover.png   # 媒体は無圧縮
zip -9 -r ../book.zip book.json chapters
```

## 検証

```sh
bun run typecheck
bun run lint
bun run test      # 形式の規則・API (実 SQLite + R2 の代わり)・移行・棚の並べ方・スキルの梱包 (python3 を使う)
bun run build
```

API のテスト (`apps/api/src/routes/library.test.ts`) は、取り込み → 送信 (1 回と分割) → 版の切り替え → 配信 (Range・HEAD・416・危険なパス) → 位置の保存 → 削除と cron の片付けを、本人・別人・別テナント・管理者・無効化した利用者で通す。

画面は Chromium (Playwright) で、取り込み・棚・本・章・朗読の再生と位置の復元・PC と 390px 幅を確かめた。スマホ実機のバックグラウンド再生と、2GB 近い動画の送信は未確認。

## デプロイ

追加の手順は無い。非公開 R2 `stella-library-private` を使う。PDF の処理の退役は 2026-11-03 のデプロイで済んだ (`deploy.yml` の退役の step が Web のデプロイ後に Workflows を消し、`stella-narrator` Worker が無いことを確かめた)。この step は消してよい。
