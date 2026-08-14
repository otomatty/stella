# 面談対策(Interview Prep)機能 設計書

日付: 2026-08-14
ステータス: 承認済み(ユーザー承認: 実装計画へ進行)

## 目的

SES所属の未経験〜経験の浅いエンジニアが、案件参画前のクライアント面談(顔合わせ)に備えるための練習機能を LMS に追加する。上司提案の「面談対策 想定質問集」(188問のスタンドアロンHTML)を LMS 内の機能として取り込み、**各エンジニアに必要な質問だけを表示する**。

## 背景・入力データ

上司提案シートは 188問の想定質問データベース。1問のフィールド:

| フィールド | 内容 |
|---|---|
| `no` | 質問番号(一意) |
| `category` | 案件種別: `PHP/JS`(45) / `SQL`(46) / `テスト`(47) / `全案件共通`(50) |
| `subcategory` | 自己紹介・実績、SQLスキル、逆質問など約40種 |
| `freq` | 優先度: `A`必修(67) / `B`推奨(72) / `C`参考(49) |
| `question` / `time` | 質問文と目安回答時間 |
| `intent` | 面談官の質問意図 |
| `answer_template` | 穴埋め式「回答の型」(HTML、`class="blank"` の span が穴) |
| `deep1`〜`deep3` | 深掘り質問への対応(nullable) |
| `ng` | 避けたい回答(nullable) |
| `criteria` | 評価軸(nullable) |
| `is_reverse` | 逆質問フラグ(エンジニア側から聞く質問、11問) |

抽出済みデータ: `packages/shared/src/interview/questions.json`(元HTMLのバンドルから展開したもの。正本として配置済み)。

## 決定事項

1. **対象面談**: 案件参画前のクライアント面談(顔合わせ)。
2. **表示制御**: 講師/管理側が受講者ごとに案件種別カテゴリを割当て、本人はその範囲内で優先度・サブカテゴリ・検索で自由に絞り込める。`全案件共通` カテゴリは常に全員へ表示。未割当の受講者には共通のみ表示。
3. **アーキテクチャ(案A)**: 質問バンクはリポジトリを正本とし、既存 seed パイプライン(upsert/prune、安定UUID)で D1 に投入。CMS 編集 UI は作らない。質問の更新は JSON 更新 → main マージ → 自動デプロイで本番反映(既存教材と同じ運用)。

## UI / 動線

### 受講者

- サイドバー(learner)に「面談対策」を追加 → ルート `/interview-prep`。
- 画面は上司シートの構成を踏襲した2タブ:
  - **一覧**: 優先度チップ(A/B/C/すべて)・サブカテゴリ・キーワード検索で絞り込み。カードはアコーディオンで 意図 → 回答の型 → 深掘り①〜③(個別開閉) → NG回答 → 評価軸 を段階表示。逆質問(`is_reverse`)は「聞く質問」バッジ + 準備ポイント表示(深掘りなし)。
  - **ランダム出題**: フラッシュカード。質問と目安時間のみ表示 → タイマー(スタート/一時停止/リセット) → 「回答例を表示」で回答の型・深掘り・NGを開示 → 前へ/次へ/シャッフル。出題プールは現在のフィルタに従う。
- 初期表示: 割当カテゴリ + 共通、優先度 `A` のみ(約30〜40問)。B/C は本人がチップで広げる。
- 割当カテゴリが複数ある場合はカテゴリチップも表示(割当外カテゴリのチップは出さない)。

### 講師

- サイドバー(instructor)にも「面談対策」を追加し、同一ルート `/interview-prep` でロールにより表示を分岐: staff には割当管理画面(テナント内受講者一覧 + 案件種別チェックボックス)を表示する。
  - 当初案の「担当受講者画面に割当列を追加」は不採用: 同画面のテーブルは analytics 由来の (受講者×コース) 行で同一受講者が複数行に現れるため、受講者単位の割当ホストに不向き。専用画面のほうが既存画面に不干渉。
- admin も同一ルート・同一 API を使用可(ナビ項目の追加は learner / instructor のみ)。

### 既存機能への影響

- `Sidebar.tsx` の `NAV.learner` に NavId 追加、`AppShell.tsx` の `PAGE_LABELS` / `PATH_BY_PAGE` / `pageKeyFromPath()` にエントリ追加。既存画面のロジックには不干渉。
- ルートファイル `apps/web/src/routes/_app/interview-prep.tsx` を新設(TanStack Router file-based)。

## データモデル

### packages/shared

- `InterviewQuestion` 型(上記フィールドをそのまま型化。`answer_template` は HTML 文字列として保持し、表示側で `class="blank"` をスタイリング)。
- 質問バンク JSON(188問)を shared 配下に正本として配置。

### D1(新テーブル2枚、drizzle migration)

```
interview_questions
  id TEXT PK          -- sha1 安定UUID(既存seed方式)
  tenant_id TEXT      -- 'ses'
  no INTEGER          -- 元データの質問番号
  category TEXT
  subcategory TEXT
  freq TEXT           -- 'A' | 'B' | 'C'
  question TEXT
  time TEXT
  keywords TEXT
  intent TEXT
  answer_template TEXT
  deep1 TEXT NULL / deep2 TEXT NULL / deep3 TEXT NULL
  ng TEXT NULL
  criteria TEXT NULL
  is_reverse INTEGER  -- 0/1

interview_prep_assignments
  id TEXT PK
  tenant_id TEXT
  profile_id TEXT     -- 対象受講者
  categories TEXT     -- JSON配列 例: ["PHP/JS","テスト"](共通は含めない。常時表示)
  assigned_by TEXT    -- 操作した staff の profile_id
  updated_at TEXT
  UNIQUE(tenant_id, profile_id)
```

seed: `export-seed-sql.ts` に interview_questions の upsert/prune を追加(既存 content course と同じ方式)。

## API(Hono、`apps/api/src/routes/interview-prep.ts`)

既存ヘルパー(`getCaller`, `requireRole`, `isStaffRole`, `errorResponse`, `audit`)を流用。

- `GET /api/interview-prep/questions`
  - 受講者: 自分の割当カテゴリ + `全案件共通` の質問のみ返す。
  - staff: 全件返す。
- `GET /api/interview-prep/assignments` — staff のみ。テナント内の割当一覧(students 画面用)。
- `PUT /api/interview-prep/assignments/:profileId` — staff のみ。body `{ categories: string[] }`。upsert + audit log 記録。

## エラー処理

- 未認証: 既存 `getCaller` の 401。
- 学習者が assignments API を叩いた場合: 403(`requireRole`)。
- categories に不正値(定義外カテゴリ): 400。許容値は shared の定数配列で共有。
- 質問が0件(未割当 + Aフィルタで空など): 一覧・出題とも空状態メッセージ(上司シートと同文言「条件に合う質問がありません。フィルターを緩めてください。」)。

## テスト

- shared: 割当フィルタリング関数(割当カテゴリ + 共通、freq絞り込み)の unit test(Vitest)。
- API: `smoke:core` には含めない(コア学習ループと独立)。手動確認: seed → dev:api + dev → seed-learner でログイン → 割当なし(共通のみ)/ 割当あり(該当カテゴリ表示)/ 講師で割当変更 → 反映、の3点。
- UI: 既存方針どおり手動確認(一覧の開閉、ランダム出題のタイマー・シャッフル・回答開示)。

## 初期リリースに含めないもの(拡張点のみ確保)

- **AI模擬面談**: `packages/shared/src/ai/types.ts` の `ChatContext` union に `{kind:'interview', ...}` を追加すれば既存 `/api/chat`(SSE、認証、レート制限つき)に載る。
- 回答提出 → 講師添削(既存 submissions パターンで後付け可)。
- 質問の1問単位の手動選定(pin/exclude)。
- 回答練習の進捗記録(「できた」フラグ、練習回数)。
- 質問バンクの CMS 編集 UI。
