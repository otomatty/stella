# 本棚 P0・P1の開発と検証

2026年10月11日。統合設計は[設計](book-library-design.md)、後続作業は[実装計画](book-library-implementation-plan.md)を参照。

## 実装した範囲

`packages/book-core`へ章分割、OCR整形、読み上げ文抽出、PDFのページ計数・図版切り出し、PCM→MP3、プロバイダを移植した。移植元commit・lockfile・対応ファイルは[PROVENANCE](../packages/book-core/PROVENANCE.md)に記録した。PDF/WASMとMP3は処理Workerからだけimportし、Webと通常APIへ持ち込まない。

`apps/narrator`は内部RPCとBookWorkflow・AudioWorkflowを持つ。ジョブはSTELLA D1を使い、原本・図版・音声は新しい非公開R2へ置く。公開HTTPは404。テナント・本人・有効なプロフィール・処理世代を確認し、削除済み書籍や古い世代へ結果を書き戻さない。本文の版・ハッシュが変わった音声も現行へ切り替えない。

マイグレーション`0062_personal_library.sql`は書籍と個人本棚の2テーブルを、`0063_library_processing.sql`はPDF、ページ、図版、章と改訂、音声、ジョブと利用量、起動待ち、R2削除待ちの10テーブルと書籍の処理用の列を加算する。親子関係はテナントを含む複合外部キーで制約する。読者状態とメモはP4で追加する。

メモは書籍・章を削除する前に出典タイトルを記録し、参照IDだけを外す。本文・位置・改訂・本人の所有は保持する。音声は試行単位で生成権を確保し、完成済み行は成功が確定するまで使える状態に保つ。失敗した試行は別の生成結果を変更しない。

章の保存計画は世代別のR2に置き、D1から指す。部分保存の再試行でも同じ章IDを使って不足を補う。退役した音声の試行は自分の生成権だけを解放し、新しい試行は失効した生成権を引き継げる。どちらも別の有効な生成権は変更しない。

ジョブ起動と各保存には起動待ち記録と試行IDの一致が必要。ページ番号はPDFごとのWorkflowステップと再帰INSERTで保存し、章は20件ずつ別ステップへ保存する。1000ページでもD1 Freeの1回50クエリを超えない。R2保存後にも認可を再検査し、失効した処理の保存物は回収する。清掃は新しい削除を先に処理し、残った枠で過去の接頭辞を再走査する（最大16件・50クエリ）。Workflow全体の寿命は制限していないため、清掃済みの接頭辞の記録は保持する。初回清掃の翌日から再走査し、削除からの経過時間に応じて間隔を最大30日まで延ばす。過去の記録が増えても、新しい削除の枠を奪わない。

音声生成は8チャンクずつ1ステップで処理する。各チャンクの認可・保存・利用量・進捗を含めて最大49クエリ/ステップ。開始時のモデル・声・言語・プロバイダ種別をprepareの結果に保存し、設定変更後の再開でも同じ設定を使う。保存済み音声のR2メタデータに入力ハッシュ・生成設定・利用量の参照を持ち、バッチ再試行は設定が一致する完了済みチャンクを再生成しない。利用量も同じ参照IDでは重複登録しない。結合は最大200チャンクずつ中間音声を保存してから最終結合する。1MiB近い英語・日本語の章もWorkflowの1024ステップ上限内に収まり、分割数7680件を超える入力は生成権を確保する前に拒否する。準備・結合・完了・失敗処理には64ステップの余地を確保する。本文とチャンク一覧はR2に置き、ステップの結果には小さなメタデータだけを保存する。プランの上限は [Cloudflare Workflows limits](https://developers.cloudflare.com/workflows/reference/limits/) を参照。

図版の切り出しはページをまたいで小さなバッチにまとめる。1ステップの図版保存とページ完了保存の合計は12件（認可を含め49クエリ）まで。多数の図版を持つページは複数バッチへ分け、最後の図版まで保存する前はページを完了扱いにしない。図版計画はR2に保存する。1冊50PDF・1000章・図版500バッチまでとし、1000ページの処理でもPDF準備・OCR・章保存を含めて1024ステップ以内に収める。PDF数の上限はcapabilitiesにも返す。

章の下書きキーと保存件数は同じDB読み取りで取得し、他のジョブが保存した一部の章を完成扱いにしない。図版とページ画像は試行IDごとのキーへ保存し、失効した試行の後処理が新しい成果を消さない。OCR・TTSの有料要求は事前に認可し、返ってきた成果は次のD1検査より先に、試行専用の非公開R2キーへチェックポイントを置く。保存後に認可を再検査し、権限失効が確認された場合は回収する。一時的なD1障害では保持し、DB保存の再試行は同じ成果と利用量参照を使う。削除された書籍の接頭辞は清掃ジョブでも再走査する。

認証は既存の`getCaller`を使う（本番はClerk、講師・管理者はCloudflare Accessも。ローカルとテストは開発用トークン。`docs/clerk-auth.md`）。所有者・テナントはサーバーで決定し、入力の`ownerId`・`tenantId`・`role`・`visibility`は拒否する。管理者・講師・営業にも他人の私有書籍を読む権限は与えない。P1は本人の書籍に限定し、社内共有の認可はP6で追加する。

Webの`/library`は全ロールのサイドバーから開ける。書籍情報の登録・編集、読書状態・個人タグ・お気に入り、削除、ページ送り、空・通信失敗・未設定・無効の表示を実装した。本棚はD1に保存し、demoのlocalStorageには保存しない。

既存book-narratorのデータ移管は行わない。旧users/sessions、書籍、章、原本、音声、共有は取り込まない。

## P1のAPI

| メソッドとパス | 操作 |
| --- | --- |
| `GET /api/library/capabilities` | 有効化と利用できる機能・仮上限 |
| `GET /api/library/mine?limit=30&offset=0` | 本人の本棚。絞り込みはSQLでページ分割前に適用 |
| `POST /api/library/books` | 私有書籍と本人の本棚を同じD1 batchで登録 |
| `GET/PATCH /api/library/books/:bookId` | 本人の書籍情報を取得・更新 |
| `PUT /api/library/shelf/:bookId` | 本人の読書状態・タグ・お気に入りを更新、棚へ戻す |
| `DELETE /api/library/shelf/:bookId` | 棚から外す。書籍は保持 |
| `DELETE /api/library/books/:bookId` | 直ちに非表示・世代失効。24時間後からR2とDBを清掃 |
| `GET/POST /api/library/books/:bookId/pdfs` | 原本の一覧と登録（P2）。件数・合計サイズ・順番はINSERTの中で決める |
| `PUT /api/library/books/:bookId/pdfs/:pdfId` | 原本1つをR2へ送る（P2）。送信ごとに別キーへ書き、検証後に差し替える |
| `DELETE /api/library/books/:bookId/pdfs/:pdfId` | 処理を始める前の原本を削除（P2） |
| `POST /api/library/books/:bookId/process` | ジョブと起動予約を同じbatchで作り、書籍を`processing`にしてRPCで起動（P2）。RPCの失敗は予約を残す |
| `GET /api/library/books/:bookId/jobs` | 処理状態（P2）。1分以上起動していない予約はここで再送する。開かれなくても narrator の毎時 cron が再送する |
| `POST /api/library/books/:bookId/jobs/:jobId/retry` | 失敗したジョブを新しい試行として再実行（P2）。済んだOCR範囲は再利用する |

棚から外した書籍の再発見・再追加画面は後続リーダーで追加する。メディア・本文・個人記録のAPIはP3・P4の作業であり、今回のテーブル作成だけでは公開しない。

## ローカル起動

Bunのlockfileに対応するバージョンを使い、`bun install --frozen-lockfile`を実行する。今回のWindows環境ではBun 1.3.8がlockfile読み取りで終了するため、検証は1.4.3で行った。

`.example`から`apps/api/.dev.vars`、`apps/web/.env.local`、`apps/narrator/.dev.vars`を作る。既存ファイルを上書きしない。Webは`VITE_SERVER_URL=http://127.0.0.1:8787`、APIはローカル用`DEV_AUTH_JWT_SECRET`を設定する（`ACCESS_TEAM_DOMAIN`・`ACCESS_AUD`は空のまま）。ログインは`bun run --filter=@stella/api dev:token <profileId>`のトークンで行う。

```sh
bun run db:migrate
bun run db:seed
bun run smoke:d1
bun run dev:api
# 別ターミナル。同じ apps/api/.wrangler/state を使う
bun run dev:narrator
# 別ターミナル
bun run dev
```

本棚のメタ情報は処理Worker未起動・プロバイダ未設定でも利用できる。APIの`LIBRARY_ENABLED=0`で本棚を無効化する。Narratorの`LIBRARY_PROCESSING_ENABLED=0`は本番の既定。capabilitiesの`upload`・`audio`・`sharing`はP1では常にfalse。

偽プロバイダはNarratorのローカル設定で`LIBRARY_PROCESSING_ENABLED=1`・`FAKE_PROVIDERS=1`とする。公開APIからジョブを作る入口はP2で追加するため、P0の処理は下記の統合テストで検証する。実際の書籍は外部APIへ送らない。

## 検証

```sh
bun run typecheck
bun run lint
bun run test           # Node + narratorの実Workerテスト
bun run test:narrator  # Workerをdry-runビルドしてから実行
bun run build          # Web・VS Code・narrator
bun run smoke:core     # seed済みローカルAPIが必要
```

NarratorのテストはVitest 5とMiniflareの専用設定で、実際のWorkers・Workflows・D1・R2を使う。JWTの署名検証、プロフィール無効化、所有者の偽装拒否、別人・別テナント・各staffロールの拒否、API→RPC→OCR→図版→章→偽TTS→MP3、重複起動、削除後の拒否を確認する。

`apps/narrator/test/fixtures/media.ts`はP0だけの配信実証。JWTで不透明チケットを発行し、HEAD・Range・416・期限切れ・再発行・プロフィール無効化・書籍削除の拒否を検証した。チケットはテストWorkerのメモリだけに置く。このAPIとジョブ起動のテスト入口は本番APIへimportしていない。P3で正式なD1セッションと配信APIへ置き換える。

Windowsでは既存VS Code runnerのシンボリックリンク作成がEPERMで失敗するため、全件検証はLinux CIで確認する。追加・関連の単体テストとNarratorの統合テストをローカルでも検証する。統合テストは1000ページの保存、密な図版の分割、OCRのチェックポイント、未予約・旧試行の拒否、再生成失敗時の完成音声保持、音声バッチの再試行、並行生成、清掃後のR2書き込み回収を含む。

本棚の実画面をローカルD1/APIとChromiumで確認した。登録・編集・読書状態・タグ・お気に入り・再読み込み後の保持・削除・通信エラーからの復帰が通り、PCと390px幅で横にはみ出さず、ページ例外も発生しなかった。削除の24時間の猶予、猶予後のR2/DB清掃、隣の書籍を削除しないことも実Workerテストで確認した。

ローカルD1への全migrationと教材seed、`smoke:d1`、既存`smoke:core`の50ステップも成功した。既存の受講開始・提出・添削・通知・修了証・監査ログの経路は維持できている。

スマホの実機再生、画面ロック、長時間のチケット更新、本物のOCR・TTS品質・費用は未検証。P0の実機項目は残し、P2・P3の公開前に検証する。同一Workflowの実行途中でWorkerを設定変更してデプロイし、再開した音声が開始時のモデル・声・言語・プロバイダを維持する運用検証も行う。モバイル幅での本棚表示は実機再生とは区別する。

Narratorの言語は`TTS_LANGUAGE`で指定する（既定`ja-JP`）。`TTS_VOICE`・`TTS_MODEL`とともに開始時に保存され、実行中の設定変更は次のジョブから適用する。ローカルは`.dev.vars`、本番は`wrangler.jsonc`のvarsで変更する。

## GitHub Actionsでの更新

`ci.yml`の`verify`がrootのテスト・ビルドを通じてNarratorも検証する。既存`core-loop`の検証は維持する。通常のデプロイはGitHub Actionsのみ。

`deploy:prepare`は既存のSTELLA DBを解決し、APIとNarratorの両設定を同じ実DB IDへ揃える。新しい別DBを作らない。加算migrationのあと、固定名`stella-library-private`を存在しなければ作成し、r2.dev・カスタムドメインの両方が非公開であることを検証する。公開・確認不能・権限不足なら停止し、既存設定を勝手に変えない。参照：[R2バケットAPI](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/)、[r2.dev設定](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/managed/methods/list/)、[カスタムドメイン](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/domains/subresources/custom/methods/list/)。

順序はmigration → private R2準備 → Narrator → API → 必要なら既存教材seed → Web。既存の教材変更判定、画像・配布PDFの経路は維持する。CIトークンには既存D1・Workersの権限に加え、R2作成とドメイン設定の読み取りに必要な権限が要る。

本物のプロバイダ用秘密値はNarratorだけに設定する。モデル名と価格は移植元の固定値を確定事項として扱わず、P2・P3で品質と契約を確認する。利用量のトークン数は記録するが、移植元の概算単価は継承しない。今回クラウドへのデプロイ・資源作成・秘密値登録は実行していない。
