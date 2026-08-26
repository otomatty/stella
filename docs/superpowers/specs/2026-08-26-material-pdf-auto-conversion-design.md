# 教材 PDF 自動生成・配布 + 教材バージョン管理 設計書

日付: 2026-08-26
ステータス: 実装済み(フェーズ1〜4。PR #256)

## 目的

`packages/content` の教材(slides.md / doc.md / practice.md)を CI/CD で自動的に PDF へ変換し、アプリ内の配布資料(`lesson_materials` /「教材をダウンロード」導線)として登録する。教材の追加・編集は push to main だけで PDF に反映され、手動アップロードは不要になる。あわせて **教材のバージョン管理を新仕様として導入**し、旧版 PDF を削除せず保持、staff は版履歴の閲覧と任意の版のダウンロードができるようにする。

紙面はアプリ内表示と同じ見た目(Sports Force デザインシステム / `slides-skin.css`)で読みやすく整える。

## 決定事項(ユーザー確定)

| 論点 | 決定 |
|---|---|
| PDF の粒度 | **トピック単位**(= D1 のレッスン単位。manifest がトピック `tN` → slides レッスン、`doc.md` → text レッスン、`practice.md` → quiz レッスンに割るため、既存 `lesson_materials` の粒度と一致) |
| 対象 | `slides.md` / `doc.md` / `practice.md`(確認クイズ含む)。すべて受講者へ公開 |
| 講師ノート | 受講者配布 PDF から**除外**(`<!-- ノート: ... -->`) |
| 紙面 | slides = **16:9**(1280×720、1 スライド 1 ページ)。doc / practice = **A4 縦** |
| practice(quiz)の構成 | 解答込みで公開。ただし **前半に問題、後半に解答** の 2 部構成(間に改ページ) |
| 旧版 | **削除しない**。R2 に全版保持 |
| バージョン管理 | **配布 PDF と教材本文(lessons.markdown)の両方**を版管理する(新仕様) |
| 版履歴の閲覧 | **staff のみ**。版一覧の表示と任意の版のダウンロードが可能。受講者は常に最新版のみ |
| PPTX | 現状維持(`scripts/build.mjs` の手動ローカル運用。CI には載せない) |

## 現状(調査結果)

- 教材の正本は `packages/content/courses/<slug>/modules/**`。seed で D1 の `lessons.markdown` に入り、Web は `MarkdownSlides.tsx` + `slides-skin.css` で描画。`MarkdownSlides.tsx` の「PDF は作らない方針」はアプリ内閲覧の話であり、本件は**配布資料(ダウンロード用)の生成**なので矛盾しない。
- 配布資料の基盤は実装済み: `lesson_materials` テーブル + `/api/materials`(アップロード / レッスン・コース単位一覧 / 認可付きプロキシダウンロード / R2 `MATERIALS_BUCKET`)。
- デプロイは `.github/workflows/deploy.yml`(push to main): 検証 → D1 migrate → **R2 へ図解・サムネイル upload → seed** → deploy。サムネイルは内容ハッシュ入り R2 キーで「upload が seed に先行し、D1 が存在しないオブジェクトを指す時間を作らない」パターンが確立済み。PDF も同じ順序・同じキー設計に乗せる。
- `practice.md` は「## ハンズオン → ## 演習問題 → ## 解答例と解説(`<details>`) → ## 確認クイズ」の定型。設問と解答が節・マークアップで分離されているため、問題編 / 解答編への再構成は機械的にできる。
- PPTX は `packages/content/scripts/build.mjs` → `build_pptx.py` がローカル生成(出力は各トピックの `slides.pptx` と `dist/slides/`、非コミット)。CI は `--check-only` で検査のみ。**本件と独立、変更しない。**
- CMS(`apps/api/src/routes/cms.ts`)にも `lessons.markdown` の更新経路がある。content 由来の講座は seed で毎回作り直されるため、自動 PDF の対象は **content 由来の講座のみ**。CMS で作られた講座の資料は従来どおり手動アップロード(ただし本文リビジョン記録は CMS 経由の編集にも掛ける)。

## 設計

### 全体フロー(deploy.yml 追記)

```
検証ゲート → D1 migrate
  → 図解・サムネイル upload(既存)
  → 【新】教材 PDF 生成+upload   … 差分のみ生成し R2 へ put(冪等)
  → seed                        … lesson_revisions / 資料の版を upsert
  → deploy:api → deploy:web
```

- PDF 生成・upload は **seed より前**(サムネイルと同じ理由: D1 が未存在オブジェクトを指す時間を作らない)。
- 生成失敗は **ジョブを落とす**(黙って古い PDF が残ると「最新のはず」という前提が壊れるため)。

### PDF 生成(`packages/content/scripts/build-pdf.ts` 新設)

Playwright(Chromium)で印刷用 HTML を開き `page.pdf()` で出力する。**アプリ実装と同じ CSS を直接読む**ことで「実際にアプリ内で適用されているスタイル」を担保する。

- **slides.md** → ページサイズ 1280×720px(16:9)、1 スライド = 1 ページ。スキンは `apps/web/src/components/learner/slides-skin.css` を共有(コードハイライトも Web と同じ highlight.js GitHub Light テーマ)。講師ノートは manifest と同じ除去処理を通す。
- **doc.md** → A4 縦の文書レイアウト。見出し・コード・表のスタイルはデザインシステムのトークンに合わせた印刷用 CSS(`print-doc.css` 新設)。
- **practice.md** → A4 縦。**第 1 部(問題編)**: ハンズオン + 演習問題(設問のみ) + 確認クイズ(設問・選択肢のみ)。**改ページ**。**第 2 部(解答編)**: 解答例と解説(`<details>` を展開して平文化) + 確認クイズの正解と解説。既存の `parseQuiz` / 節分割ロジックを流用する。
- 画像: slides.md の画像参照はトピックの `assets/` 配下のローカルファイルへ解決する(R2 は経由しない — CI 上で完結させ、R2 反映待ちの競合も避ける)。
- フォント: Noto Sans JP を npm(`@fontsource/noto-sans-jp` 等)で取り込み `@font-face` で埋め込む。CI で外部フェッチせず決定的にする。
- ローカル実行: `bun run --filter=@falcon/content pdf [対象パス...]` で単体確認できるようにする(`build.mjs` と同じ流儀)。

### 差分検知と R2 キー(不変・全版保持)

- **ソースハッシュ** = 対象 md 本文(講師ノート除去後) + 参照 assets の内容 + ジェネレータのバージョン識別子。テンプレート(CSS / 生成スクリプト)を変えると全教材が新版になる — 意図どおりの挙動として受け入れる。
- R2 キー: `lesson-pdf/<tenant>/<courseSlug>/<lessonId>/<sourceHash>.pdf`。**上書き・削除は一切しない**(旧版保持の要件)。`r2:orphans` の棚卸し対象からも除外する。
- 生成スクリプトは R2 上の**台帳オブジェクト**(`lesson-pdf/state.json` — put 済みキーの SHA-256 → サイズ)と突き合わせ、**未登場の教材だけ生成**する。Cloudflare v4 API に R2 のオブジェクト一覧が無いため(wrangler も単一オブジェクトの get/put/delete のみ)、一覧の代わりに台帳を持つ。台帳は公開バケットに置くので生のキーは載せない(`PDF_KEY_SALT` の秘匿性を保つ)。台帳が読めないときは全件生成 + 全件 put に倒す(content-addressed なので再 put は同内容の上書きで無害)。deploy は concurrency group で直列なので台帳の競合更新は起きない。定常時の CI 負荷は編集ぶんのみ。初回は全件(17 講座 × 全トピック)を並列生成する。

### DB スキーマ(migration 新設)

**本文のバージョン管理 — `lesson_revisions`**

| 列 | 内容 |
|---|---|
| `id` | uuid |
| `lesson_id` | FK → lessons |
| `revision` | レッスン内連番(1..) |
| `source_hash` | 本文スナップショットのハッシュ |
| `markdown` | 本文スナップショット(復元・差分表示のため全文保持) |
| `source` | `seed` \| `cms` |
| `created_by` / `created_at` | 記録者(seed は null)と日時 |

- seed の lessons upsert 時、本文ハッシュが最新リビジョンと異なるときだけ行を追加。CMS の lesson 更新 API にも同じ記録を差し込む。
- quiz レッスンは本文が markdown でないため、practice.md 全文(= PDF の生成元)をスナップショット対象とする。

**配布資料のバージョン管理 — `lesson_materials` 拡張 + `lesson_material_versions`**

- `lesson_materials` に `source`(`upload` \| `auto`)を追加。**auto 行はレッスンにつき 1 行で常に最新版を指す**(受講者向けの一覧・ダウンロードは既存実装のまま最新のみ返る)。手動アップロード資料(`upload`)は従来どおり共存し、自動再生成が触らない。
- `lesson_material_versions`: `material_id` / `version`(連番) / `path`(R2 キー) / `source_hash` / `lesson_revision_id`(生成元リビジョン) / `size_bytes` / `created_at`。seed がハッシュの変化を検知したときだけ版を積み、`lesson_materials.path` を新版へ差し替える。同一内容の再 seed では版は増えない(冪等)。

### API(`/api/materials` 拡張)

- `GET /api/materials/:id/versions` … 版履歴一覧。**staff のみ**(既存の staff 判定を流用)。
- `GET /api/materials/:id/versions/:version/download` … 指定版のプロキシダウンロード。**staff のみ**。R2 キーは従来どおりクライアントへ返さない。
- 受講者向けの既存エンドポイントは無変更(最新版のみ)。

### UI

- 受講者: 変更なし。レッスン / コース詳細の「教材をダウンロード」に自動生成 PDF が並ぶだけ。
- staff: `LessonMaterialsPanel` の auto 資料に「版履歴」を追加 — 版番号・生成日時・生成元リビジョンの一覧と、各版のダウンロード。

## 非機能・運用

- **CI 時間**: 差分ビルドにより定常は数十秒〜。初回全件は並列度を絞って許容(サムネイル upload と同様、put は冪等なので失敗時はジョブ再実行)。
- **ストレージ**: 旧版を永久保持するため単調増加。PDF はテキスト主体で 1 件あたり小さく、当面問題にならない見込み。将来必要なら「staff がアーカイブ指定した版のみ保持」を別仕様で検討。
- **セキュリティ**: 配信は既存の認可付きプロキシのみ(published + enrollment)。バケット直リンクは従来どおり返さない。

## 実装フェーズ

1. **migration + seed**: `lesson_revisions` / `lesson_material_versions` / `lesson_materials.source` を追加し、seed が本文リビジョンを記録するところまで(PDF なしでも本文の版管理が先に立ち上がる)。
2. **PDF ジェネレータ**: `build-pdf.ts`(slides 16:9 / doc A4 / practice 問題編+解答編)+ ローカル実行コマンド + スナップショット的な検査。
3. **CI 統合**: deploy.yml に生成+upload ステップを追加し、seed が資料の版を登録。
4. **API + staff UI**: 版履歴エンドポイントと `LessonMaterialsPanel` の版履歴表示。

## 設計判断の補足(PR #256 レビュー対応)

- **キーの推測可能性(公開バケット)**: `falcon-materials-public` は公開 URL を持つため、キーが計算可能だと認可プロキシを迂回できる。ハッシュには本文に加え**講座タイトル(紙面ヘッダーに載る)**も含め、repo Secrets `PDF_KEY_SALT` を設定すると **HMAC** になりキーは計算不能になる。未設定時は「リポジトリ内容を持つ者にだけ計算できる」= 手動アップロード資料(公開バケット + 推測不能パス + プロキシ配信)と同じ緩和クラス。ソルトの変更・導入は全キーを変え、次のデプロイで全教材が新版になる(旧キーは残る)。
- **決定性とネットワーク遮断**: 生成ページは file: 以外のリクエストを遮断する。教材は外部 URL 画像を使っておらず、PDF はリポジトリ内容(+ ジェネレータ版)だけから決まる。CSS・レンダラ・フォント等の変更は `PDF_GENERATOR_VERSION` を上げて全再生成する運用。
- **巻き戻し(A→B→A)の意味**: リビジョン・版とも「デプロイ/編集イベントの履歴」であり、内容が A に戻っても**新しい連番**を積む(v1=A, v2=B, v3=A)。R2 オブジェクトは content-addressed なので v3 は v1 と同じキーを再利用し、`max(version)` が常に現在を指す。
- **導入前本文のバックフィル**: migration 0031 が全レッスンの現在本文を番兵ハッシュ `pre-versioning` の revision 1 として積む(SQLite で SHA-256 を計算できないため)。seed 正本のレッスンは次の seed が番兵行を実ハッシュ行に入れ替え、CMS レッスンは番兵行が基準として残る。変更判定はハッシュではなく**本文そのものの比較**で行うので番兵でも正しく働く。
- **同時編集・seed との交錯**: リビジョンの記録は seed / CMS とも **単一の guarded insert**(lessons 行が「自分の書いた本文」をまだ保持しているときだけ、max(revision)+1 で積む)。SQLite は 1 文を原子的に実行するので、seed(ロックを取らない)と CMS がどう交錯しても「リビジョンを積めるのは lessons.markdown を最後に書いた側だけ」になり、本文と最新リビジョンは食い違わない。CMS はさらにレッスン単位の `resource_locks` で「本文更新 + 記録」を直列化する(取れなければ 409)。
- **markdown を消す保存**: text レッスンを別 type に変える等で本文が null になる保存も、履歴のあるレッスンでは「本文が消えた」リビジョンとして記録する。
- **problems から落とした details の回収**: ハンズオン/手元で試す内の解答 `<details>` は問題編から除いたうえで、解答編の「演習内のヒント・解答」に展開して収める(確認クイズの details は解答生成で復元されるため対象外)。コードフェンス内の `<details>` 例示は本文として保持する。
- **保持の例外(誤投入時)**: 旧版の恒久保持は通常経路の話であり、PII や秘密情報を誤って教材に入れた場合は、R2 オブジェクトと該当版行を運用者が手動で削除する(アプリからは消せない)。

## 対象外(明示)

- PPTX 生成の CI 化(手動運用を継続)
- アプリ内スライドビューアの PDF 化(HTML 描画のまま)
- CMS 作成講座の資料自動生成(手動アップロードのまま。本文リビジョン記録のみ掛かる)
- 受講者への版履歴公開・版番号表示(staff 限定。必要になったら別仕様)
