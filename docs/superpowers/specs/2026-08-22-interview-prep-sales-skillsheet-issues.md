# 面談対策 追加要件 — 営業ロール / 面談日 / スキルシート / 個別「回答の型」— issue 起票ドラフト

日付: 2026-08-22
ステータス: **起票済み** — Issue 1 → [#202](https://github.com/a-cial-dev/falcon-informal/issues/202) / Issue 2 → [#205](https://github.com/a-cial-dev/falcon-informal/issues/205) / Issue 3 → [#203](https://github.com/a-cial-dev/falcon-informal/issues/203) / Issue 4 → [#206](https://github.com/a-cial-dev/falcon-informal/issues/206) / Issue 5 → [#204](https://github.com/a-cial-dev/falcon-informal/issues/204)
関連: [2026-08-22-interview-prep-ux-redesign.md](./2026-08-22-interview-prep-ux-redesign.md)

## 決定事項(ヒアリング済み)

| 論点 | 決定 |
|---|---|
| 個別「回答の型」の生成タイミング | **スキルシート登録・更新時に自動生成**(バックグラウンド) |
| 生成対象範囲 | **割当カテゴリの A 必修のみ**(B/C は共通の型のまま) |
| 手動編集と再生成の衝突 | **新旧を並べて確認してから反映**(生成結果は下書きとして保持し、比較画面で採用/破棄) |
| 営業ロールの権限 | **面談対策まわりに限定**(面談日・スキルシート登録、案件種別の割当、準備状況の閲覧。他機能は不可視) |
| マイ回答メモ | **廃止**。個別「回答の型」に統合 |
| 穴埋め(Phase 2 の構造化入力) | **廃止**。型は自由記述テキスト |
| AI 呼び出しの経路 | **Cloudflare AI Gateway に一元化**(Issue 5)。まず既存 Anthropic 呼び出しの前段に挟み、チャット/添削はプロバイダ切替可能にして Grok 4.6 を比較評価 |

依存関係: Issue 2 は Issue 1 に依存。Issue 4 は Issue 3 に依存(Issue 1 にも軽く依存: 営業の編集権限)。Issue 5 は独立だが、**Issue 3・4 より先に着手推奨**(新しい AI 呼び出しを最初から Gateway 経由で作れる)。Issue 1・3・5 は並行着手可。

## フェーズ別 AI モデル整理

| フェーズ / 機能 | モデル | 経路(最終形) |
|---|---|---|
| 質問読み上げ TTS(実装済み) | Grok TTS `xai/grok-tts` | AI Gateway Unified Billing(Issue 5)。Workers AI 自前 TTS は日本語非対応 |
| 回答の文字起こし STT(実装済み) | Whisper `@cf/openai/whisper-large-v3-turbo` | 同上 |
| チャット / 添削 AI 下書き(既存) | 現行 `claude-sonnet-4-6`(`ANTHROPIC_MODEL`)→ Sonnet 5 へ引き上げ検討。**Grok 4.6 を比較評価し切替可能に** | AI Gateway 経由(Issue 5) |
| Phase 1(ステータス / 対話ログ / 改善点メモ) | 新規モデルなし(TTS/STT 流用) | — |
| スキルシート解析(Issue 3) | Claude Opus 5(PDF ネイティブ入力 + structured outputs) | AI Gateway 経由 |
| 個別「回答の型」生成(Issue 4) | Claude Sonnet 5 × Message Batches(品質不足なら Opus 5) | AI Gateway 経由 |
| Phase 3 AI 模擬面談 | Claude Sonnet 5(SSE。プロバイダ切替レイヤに載せる) | AI Gateway 経由 |

---

## Issue 1: 営業(sales)ロールの追加

### 背景

面談日を実際に設定しているのは講師ではなく営業。現状のロール(`student` / `instructor` / `admin` / `platform_admin`)には営業の居場所がなく、面談対策の運用に営業が参加できない。

### やること

- `ProfileRole` に `sales` を追加
  - `apps/api/src/db/schema.ts` の `profiles.role` enum(TEXT 列で CHECK 制約は無いため DDL マイグレーション不要。enum 追加 + ドキュメントのみ)
  - `apps/api/src/lib/authz.ts` の `ProfileRole` 型
  - `apps/web/src/data/types.ts` の `Role`(web は `sales` を追加。AppShell のロール解決も更新)
- 権限設計: **`isStaffRole()` には含めない**(CMS・成績・監査ログ等の既存 staff 機能を営業に開けない)。面談対策専用のヘルパを新設する:
  - `canManageInterviewPrep(role)` = `instructor` / `admin` / `platform_admin` / `sales` — 質問全件の閲覧、割当(案件種別)の read/write、準備状況の閲覧
  - 面談日の write は Issue 2 で `sales` / `admin` / `platform_admin` に限定
- 画面:
  - サイドバー: 営業には「ダッシュボード(簡易) + 面談対策」のみ表示
  - `/interview-prep`: 営業は staff 系画面(割当 + モニタリング)を表示。**質問音声タブは admin のみのまま**
  - admin のユーザー管理画面: ロール変更の選択肢に「営業」を追加(`user_role_change` 監査は既存のまま動く)
- seed: `seed-sales` プロファイルを追加(tenant `ses`)
- スモーク: `smoke:core` に営業の権限境界ケースを追加(営業で CMS 系 API が 403 になること、割当 PUT が通ること)

### 受け入れ条件

- [ ] admin が任意ユーザーのロールを「営業」に変更できる
- [ ] 営業でログインすると面談対策(割当・モニタリング)だけが見え、操作できる
- [ ] 営業は CMS / 受講登録 / 成績 / 監査ログ / 質問音声生成の API・画面に一切アクセスできない(403 / 非表示)
- [ ] 既存ロールの挙動に回帰がない(`bun run test` + `smoke:core`)

---

## Issue 2: 面談予定日の登録(営業・管理者のみ)と表示

### 背景

面談準備は締切駆動の活動だが、システムは面談日を知らない。面談日を軸にした UX 再設計(準備率・カウントダウン・直前チェック)の土台になる。設定するのは営業(実務上の担当)または管理者。

### やること

- DB: `interview_prep_assignments` に列追加(drizzle マイグレーション)
  - `interview_date TEXT NULL`(YYYY-MM-DD)
  - `interview_note TEXT NULL`(案件名・面談メモ。例「ECサイト保守開発」)
- API:
  - `PUT /api/interview-prep/assignments/:profileId` の body に `interviewDate` / `note` を追加
  - **権限分離**: `categories` は `canManageInterviewPrep`(講師・営業・admin)、`interviewDate` / `note` は `sales` / `admin` / `platform_admin` のみ。講師が date を送ったら 403
  - `GET /api/interview-prep/assignments` と受講者向け `GET /questions` のレスポンスに面談日・メモを同梱
  - 監査: `interview_prep_assign` の metadata に interviewDate を含める(または `interview_date_set` を新設)
- 画面:
  - 割当/モニタリング画面: 面談日 + メモの入力欄(営業・admin のみ編集可、講師は読み取り表示)。一覧は面談日昇順ソート
  - 受講者 `/interview-prep` ヘッダー: 「あなたの面談 9/10(木) ・ あと n 日 ・ 案件メモ」カード(未設定なら非表示)
  - 面談日設定時に受講者へ notifications で通知
- 面談日は LMS が正ではなく**参考情報**(営業の手入力)とする — UX 再設計スペックの決定事項に従う

### 受け入れ条件

- [ ] 営業・admin が面談日とメモを保存でき、講師は保存できない(閲覧は可)
- [ ] 受講者の面談対策ヘッダーに面談日とカウントダウンが表示される
- [ ] 面談日設定で受講者に通知が届く
- [ ] 一覧が面談日順に並ぶ(未設定は末尾)

---

## Issue 3: スキルシート登録 — AI 解析による共通フォーマット化

### 背景

受講者のスキルシート(PDF / Excel など形式バラバラ)をアプリに取り込み、共通フォーマットとして保持したい。個別「回答の型」生成(Issue 4)の入力になる。

### 登録できる人

受講者本人・営業・管理者(講師は閲覧のみ)。営業・管理者は受講者を選んで代理登録できる。

### やること

- **アップロード**: PDF / Excel(.xlsx) / Word(.docx) を受け付け(まず PDF と xlsx。上限 ~10MB)
  - 原本は R2 に保存。キーは `skill-sheets/<tenantId>/<profileId>/<id>.<ext>`(教材の `tenant/` プレフィックス配下に置かない — R2 孤児掃除の走査対象になるため)
- **AI 解析** (`@anthropic-ai/sdk` は導入済み、`ANTHROPIC_API_KEY` を利用):
  - PDF: Claude API の document コンテンツブロック(base64)としてネイティブ入力(スキャン PDF も vision で読める)
  - Excel: Workers 側で SheetJS 等でシート → CSV テキスト化してテキストとして入力(Claude API は xlsx を直接受けないため)
  - **structured outputs**(`output_config.format`、または strict tool schema)で共通フォーマット JSON に強制。モデルは `claude-opus-5` を既定(env で差し替え可)。ANTHROPIC_API_KEY 未設定時は 503(review-draft のようなヒューリスティックフォールバックは作らない — 誤解析の方が害が大きい)
- **共通フォーマット**(`@falcon/shared` に型定義。v1 案):
  ```
  SkillSheet {
    basic:   { years_total, current_role }
    skills:  [{ name, category(lang/fw/db/tool), years, level, note }]
    projects:[{ period, role, team_size, phases[], technologies[], summary }]
    certifications: [string]
    self_pr: string
  }
  ```
- **確認・編集**: 解析結果をフォームで表示し、登録者が修正して保存(AI 解析は下書き、保存で確定)。受講者 1 人につき有効シートは 1 つ(更新は上書き + `updated_at` / `updated_by` / 原本履歴は R2 に残す)
- **D1**: `skill_sheets` テーブル(id, tenant_id, profile_id UNIQUE, data JSON, source_r2_key, source_filename, parsed_model, created_by, updated_at)
- 画面: 受講者はプロフィール or 面談対策内「スキルシート」タブ。営業・管理者はモニタリング画面の受講者詳細から
- 監査: `skill_sheet_upload` / `skill_sheet_update` を audit-actions に追加
- レート制限: 解析エンドポイントは `AI_RATE_LIMITER` を通す

### 受け入れ条件

- [ ] 受講者・営業・管理者が PDF / xlsx をアップロードでき、講師はできない
- [ ] 解析結果が共通フォーマットのフォームに展開され、修正して保存できる
- [ ] 保存済みシートを本人・営業・管理者・講師が閲覧できる
- [ ] 未対応形式・解析失敗時に分かるエラーが出て、手入力でも登録を完了できる

### 決めておく点(起票時にラベル `needs-decision` を付ける)

- 個人情報の扱い: シートに氏名・連絡先が含まれる場合にマスキングするか(推奨: 解析プロンプトで連絡先は取り込まない)

---

## Issue 4: スキルシートに基づく受講者専用「回答の型」の AI 生成(マイ回答メモ廃止)

### 背景

現在の「回答の型」は全員共通の穴埋めテンプレート。スキルシート(Issue 3)を使い、**その受講者の経歴が埋まった専用の型**を AI が生成する。これに伴い:

- **マイ回答メモは廃止**し、個別「回答の型」に統合する(受講者が書きたいことは型を直接編集する)
- **穴埋め形式は廃止**し、型は自由記述テキストにする(共通テンプレの `<span class="blank">` は生成用プロンプトの材料としてのみ使う)

### 生成の仕様(決定済み)

- **タイミング**: スキルシート登録・更新時に**自動生成**(バックグラウンド)
- **範囲**: その受講者の**割当カテゴリの A 必修のみ**(約 40 問。B/C は共通の型を表示)
- **入力**: 共通フォーマットのスキルシート + 質問ごとの共通の型・意図・NG・評価軸(現在のフォーマットを AI に渡す)
- **出力**: 質問ごとの自由記述の型(話し言葉で 30〜60 秒相当。深掘りを見据えた具体例入り)
- **衝突時**: 生成結果は**下書き**として保存し、**新旧を並べた確認画面**で質問ごと(または一括)に採用/破棄。ただし個別の型がまだ存在しない質問(未編集・未採用)は自動採用してよい
- **編集**: 個別の型は**全ロール(受講者本人・講師・営業・管理者)が編集可**。`updated_by` を記録

### 実装方式(推奨案 — 実装時に確定)

40 問 × Claude 呼び出しを Worker の 1 リクエスト内で終えるのは難しいため、**Anthropic Message Batches API** を推奨:

1. スキルシート保存時に 1 バッチ(質問数ぶんの requests、custom_id = question_no)を送信し、`generation_jobs` 行を作る
2. Cloudflare Cron Trigger(5 分毎)がバッチの `processing_status` をポーリングし、完了分を下書きとして保存 → 受講者へ「新しい回答の型が届きました」通知
3. バッチはコスト 50% off。失敗質問だけの再送も custom_id で可能

(代替案: TTS と同様のクライアント駆動チャンク生成。「自動」の要件に合わないため非推奨)

### DB(スケッチ)

```
interview_personal_templates
  id TEXT PK
  tenant_id / profile_id / question_no   -- UNIQUE(tenant, profile, question)
  content TEXT                            -- 採用済みの個別の型 (自由記述)
  draft_content TEXT NULL                 -- 未確認の生成結果 (新旧比較用)
  generated_from TEXT NULL                -- skill_sheets.id
  source TEXT                             -- 'ai' | 'manual'
  updated_by / updated_at

generation_jobs
  id / tenant_id / profile_id
  batch_id TEXT                           -- Anthropic Batches の ID
  status                                  -- 'pending' | 'done' | 'failed'
  requested / succeeded
```

### 画面

- 質問ドロワー: 「回答の型」= 個別の型(無ければ共通の型 + 「スキルシートを登録すると自分用になります」の案内)。全ロール編集可のテキストエリア。下書きがあれば「新しい生成案を確認」バナー → 新旧比較 → 採用/破棄
- 音声セッション / 振り返り: 型の表示箇所はすべて個別の型を優先
- マイ回答メモの UI・API・データ(未実装のためスペック上のみ)を仕様から削除

### 受け入れ条件

- [ ] スキルシートを登録すると、割当 A 必修の個別の型が自動で生成される(通知が届く)
- [ ] 手動編集済みの型は勝手に上書きされず、新旧比較で採用を選べる
- [ ] 個別の型を受講者・講師・営業・管理者の全員が編集でき、更新者が記録される
- [ ] スキルシート未登録の受講者には従来どおり共通の型が表示される(穴埋め装飾は廃止しプレーン表示)

### 決めておく点(起票時にラベル `needs-decision` を付ける)

- 生成コストの目安: 40 問 × (入力 ~3K + 出力 ~0.5K tokens) ≒ 1 回の登録で入力 ~120K / 出力 ~20K tokens。Batches で半額。モデル選定(opus-5 か sonnet-5 か)はコストと品質を見て実装時に判断
- 割当カテゴリが後から変わった場合の追い生成(割当変更時に不足分だけ自動生成するか)

---

## Issue 5: Cloudflare AI Gateway の導入と AI 呼び出しの一元化(チャット/添削のプロバイダ切替)

### 背景

AI の呼び出し先が増えている: Anthropic(チャット・添削下書き、今後スキルシート解析・個別の型生成)、Workers AI(TTS・STT)。ログ・コスト・キャッシュ・レート制限をプロバイダ横断で見る場所がない。また 2026-06 の Cloudflare × xAI 提携で Grok モデル(Grok 4.6 含む)が AI Gateway の **Unified Billing**(xAI との個別契約・API キー不要、Cloudflare 請求に一本化)で使えるようになったため、チャット・添削のモデル比較を低コストで試せる環境を整えたい。最終的に**アプリの AI 呼び出しはすべて AI Gateway 経由**に揃える。

### 段階的にやること

**Step 1 — Gateway 作成と既存 Anthropic 呼び出しの経由化**

- Cloudflare Dashboard で gateway を作成し、`AI_GATEWAY_ID` を [vars] に追加(`CLOUDFLARE_ACCOUNT_ID` は導入済み)
- `@anthropic-ai/sdk` の client 初期化で `baseURL` を `https://gateway.ai.cloudflare.com/v1/{accountId}/{gateway}/anthropic` に向ける(リクエスト形式は Messages API のまま、変更は client init のみ)
- **`AI_GATEWAY_ID` 未設定なら従来どおり直呼び**(ローカル dev・CI を壊さない fail-open)

**Step 2 — Workers AI(音声)の経由化**

- `apps/api/src/lib/workers-ai.ts` の URL 組み立てを `.../{gateway}/workers-ai/...` 形式に差し替え(同じく未設定なら直呼び)
- これで TTS 生成・文字起こしも Gateway のログ / 使用量に載る

**Step 3 — チャット / 添削のプロバイダ切替レイヤ**

- OpenAI 互換 chat completions(SSE 対応)で呼ぶ薄いクライアントを追加し、`CHAT_PROVIDER=anthropic|grok` + `CHAT_MODEL` で切替可能にする
  - anthropic: 既存の Messages API 経路のまま(切替レイヤの既定)
  - grok: `.../{gateway}/grok` + Unified Billing(BYOK なし)
- `/api/chat`(SSE)と `/api/review-draft` を切替レイヤに載せる。認証・`AI_RATE_LIMITER` は現行のまま

**Step 4 — Grok 4.6 の比較評価**

- 添削下書きとチャットで日本語品質・レイテンシ・コストを Claude(Sonnet 5)と比較し、採否を決める(env 切替なので巻き戻し容易)

### 受け入れ条件

- [ ] Anthropic・Workers AI(音声)の全呼び出しが Gateway のログ / 使用量ダッシュボードに出る
- [ ] `CHAT_PROVIDER=grok` + `CHAT_MODEL=grok-4.6`(相当)でチャットと添削下書きが SSE 含めて動く
- [ ] `AI_GATEWAY_ID` 未設定の環境(ローカル / CI)では従来どおり直呼びで全機能が動く
- [ ] スキルシート解析・個別の型生成(Issue 3・4)は最初から Gateway 経由で実装される

### 決めておく点(起票時にラベル `needs-decision` を付ける)

- Gateway のキャッシュ設定(チャットは無効が無難。TTS は既に R2 キャッシュ済みなので Gateway 側は不要)
- Grok に受講者データ(スキルシート由来の情報など)を送る場合のデータ取り扱いポリシー確認 — 比較評価の段階では添削・チャットのみに限定し、スキルシート解析は Claude 固定とする
- Unified Billing の支払い設定(Cloudflare アカウント側の有効化)と Grok 4.6 の単価確認
