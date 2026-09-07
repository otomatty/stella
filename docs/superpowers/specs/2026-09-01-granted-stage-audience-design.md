# ユーザー専用星 (granted audience) の仕様

- 対象: `packages/content` / `stages.audience` / `stage_grants` /
  `apps/api/src/lib/skill-map-data.ts` / `apps/api/src/routes/stage-grants.ts` /
  `apps/web` 講師・管理者 UI
- 前提: `2026-08-30-skill-tree-parent-edge-design.md` (線 = `parent` 1 本)、
  `2026-08-30-skill-tree-fog-display-design.md` (霧の段)

## 何を決めたか

Git 正本 (`packages/content/courses/<slug>/course.json`) の講座に **`audience: granted`**
を付け、**スタッフが選んだ受講者だけ**のスキルツリーに星として出す。教材は 1 実体の
まま、評価器 (`@stella/shared/skill-map/evaluate`) は触らず、**評価器に渡す前の
カタログ**を人ごとに差し替える。

| 語彙 | 意味 |
|---|---|
| `catalog` | 従来どおり全受講者のカタログ候補 (省略時の既定) |
| `granted` | 割り当て (`stage_grants`) がある受講者だけカタログに載る |
| 割り当て | マップ掲載。受講登録 (`enrollments`) の作成ではない |
| 受講開始 | 親をクリアしたあと、既存の `POST /api/stages/:id/start` (自己開始) |

## データモデル

### `stages.audience`

- 型: `"catalog"` | `"granted"`
- 既定: `"catalog"`
- seed された Git 講座は `published` のまま。`granted` は「公開されているが
  カタログ非掲載」
- CMS 手書きステージは第 1 版では常に `catalog` (列の default)

### `stage_grants`

| 列 | 説明 |
|---|---|
| `id` | UUID |
| `tenant_id` | テナント |
| `stage_id` | `audience = granted` のステージ |
| `profile_id` | 受講者 (student) |
| `granted_by` | 操作した staff の profile_id |
| `granted_at` | 付与日時 |

- UNIQUE `(stage_id, profile_id)`
- 同じ専用講座を複数人に付けてよい
- 割り当て操作は **instructor / admin / platform_admin** のみ (sales は対象外)

## 正本・seed・検査

`course.json` に任意 `audience?: "catalog" | "granted"` (省略 = catalog)。

manifest (`packages/content/src/manifest.ts`) でビルド時に落とす:

1. **`granted` は catalog の親を 1 つ以上必須** — 入口の星にしない
2. **catalog 講座の `prerequisites` / `parent` に granted slug を書いてはいけない**
   — 他受講者が永久ロックされる / ロック理由から名前が漏れる
3. **専用星どうしの親子は第 1 版禁止**
4. **`appearances` 付きの `granted` は第 1 版禁止**

本番 `packages/content/courses/` にはサンプル専用講座を置かない (テストは
`manifest.test.ts` の `withCourses()` で足場を作る)。

## カタログフィルタ

`loadSkillMapSource` (`apps/api/src/lib/skill-map-data.ts`) の published 取得直後:

1. `audience === "catalog"` → 従来どおり載せる
2. `audience === "granted"` → caller の `stage_grants` がある行だけ残す
3. 親がカタログに残っていない専用星は落とす (島の裏の孤児を `stage_count` に混ぜない)
4. 既存の島フィルタ → 評価器

**開発者モード** (`DEV_MODE` + FAB) で島の全表示・霧解除はしても、**未割り当ての
専用星は出さない**。

割り当てを外したあと:

- マップから消える
- 進行中の `enrollments` は残る (受講状況画面で削除可能)
- 再開始はできない (`POST /api/stages/:id/start` が汎用 400)
- レッスン / クイズは enrollment があれば読める (既存の enrollment ゲート)

## API

| Method | Path | 誰 | 何 |
|---|---|---|---|
| GET | `/api/stage-grants` | staff | `audience=granted` のステージ + 割り当て先一覧 |
| PUT | `/api/stage-grants/:stageId` | staff | `{ profile_ids: string[] }` で grant を置換 |

- ステージが `granted` でなければ PUT は 400
- 他テナント・student・sales は 403
- **`POST /api/enrollments` は復活させない** (Phase 3b の自律モデルのまま)

## スタッフ UI

面談対策の割当タブと同型。ステージ起点で受講者を複数選択して保存。教材本文の編集は
出さない (Git → seed)。

- ナビ: 「専用教材」 (`stage-grants`)
- 講師・管理者のみ

## テストの軸

- manifest 検査 (granted の親なし / catalog が granted を前提 / appearances)
- seed SQL に `audience`
- `loadSkillMapSource`: 未割り当てでは専用星なし / 割り当て後は親の子 / DEV_MODE でも漏れない
- 開始 API: 未割り当て 400 / 割り当て+親クリア 200
- grants API: 置換 / 403 / 400
- ナビ: instructor/admin のみ
