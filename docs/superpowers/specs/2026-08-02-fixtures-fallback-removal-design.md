# fixtures フォールバック廃止 — API 真実のみ表示（#60 / Phase 1）

日付: 2026-08-02  
ステータス: 設計承認済み（実装待ち）  
親 Issue: [#58](https://github.com/a-cial-dev/falcon-informal/issues/58)  
対象 Issue: [#60](https://github.com/a-cial-dev/falcon-informal/issues/60)

## 背景

バックエンド（Hono + D1）設定時でも、API 失敗時に fixtures へ退避する箇所があり、障害がデモ成功に見える。あわせて seed が毎回乱数 UUID を発行するため、再 seed で course/section 参照がずれる。

#59 で実データ開発をドキュメント上の既定にした。本 Phase は「画面に出るものが常に DB/API の真実」になるよう、沈黙フォールバックを取り除き、seed を冪等＋最小検証シナリオ付きにする。

## 目標

1. `isBackendConfigured()` が true のとき、API 失敗を fixtures に退避せずエラー UI / 空状態を表示する
2. 空データは空 UI のまま（fixtures で埋めない）
3. 開発時に `source: db | fixtures | error` をバナーで可視化する
4. seed を冪等にする（2 回実行しても壊れた参照が残らない）
5. 最小検証シナリオ（profiles / enrollment / submission）を seed に含める
6. fixtures 経路は `VITE_SERVER_URL` 未設定のデモ専用に閉じ込める

## 非目標

- fixtures ファイル削除やデモ経路そのものの廃止（#63）
- `useResolvedAssignment` の shared カタログ高速経路の変更（API 失敗時も共有定義を使う現状を維持）
- 認可・所属の強化（#62）、コア学習ループ新機能（#61）
- Google アカウントを seed に埋め込むこと
- DataSource Provider 新設や fixtures のビルド時切り離し（YAGNI）
- 本番 remote seed フローの自動化変更

## 選定方針

### 採用: 局所修正（Approach 1）

既存フック／画面の catch → fixtures を削り、seed は決定論的 UUID ＋検証シナリオ追加に留める。

**不採用**

- DataSource Provider 新設: #60 に対してリファクタが厚い
- fixtures モジュールのビルド時切り離し: デモ経路整理と seed 依存分離が大仕事

## モード境界

| モード | 条件 | データ |
|--------|------|--------|
| 実データ | `VITE_SERVER_URL` 設定（`isBackendConfigured()`） | API/D1 のみ。失敗 → エラー／空。fixtures 禁止 |
| デモ専用 | URL 未設定 | 現行どおり fixtures / モックログイン / Tweaks |

## 変更対象（UI）

| ファイル | 変更 |
|---------|------|
| `apps/web/src/data/courses-source.ts` | 実データ時: 初期 `[]` + loading。catch で fixtures 禁止。`error` を返す。デモ専用のみ fixtures |
| `apps/web/src/hooks/useAnnouncements.ts` | 同上。catch 時は `[]` + `error` 維持、`source` は error 相当 |
| `apps/web/src/components/instructor/InstructorDashboard.tsx` | `backendEnabled` 時: overview null → KPI 0 / 空リスト。デモ定数は `!backendEnabled` のみ |
| シェル（`App.tsx` またはヘッダー相当） | `import.meta.env.DEV` のみ source バナー |
| Learner 等の表示箇所 | courses / announcements の `error` を未表示なら最小限で出す |

`UseCoursesResult` に `error: string | null` を追加し、announcements と同型に揃える。

### フック契約（実データモード）

- 成功 → 実データ（空なら空）、`source: "db"`
- 失敗 → `[]` + `error`、`source: "error"`（型を `"db" | "fixtures" | "error"` に拡張）
- デモ専用 → fixtures、`error: null`、`source: "fixtures"`

### source バナー

- ヘッダー近傍に 1 行
- `import.meta.env.DEV` のときのみ
- 文言例: `Data: db` / `Data: fixtures (demo)` / `Data: error`
- App が既存の `source` を集約。新規グローバルストアは作らない
- courses か announcements のどちらかが error なら `error`

### InstructorDashboard

| 条件 | 表示 |
|------|------|
| `!backendEnabled` | 現行デモ KPI / デモ行を維持可 |
| `backendEnabled` + loading | 既存 loading |
| `backendEnabled` + overview 取得済み | API 値 |
| `backendEnabled` + overview null（失敗含む） | KPI 0、リスト空。`STUDENT_PROG_DEMO` / `UNANSWERED_DEMO` 不使用 |

## 変更対象（seed）

| ファイル | 変更 |
|---------|------|
| `packages/shared/scripts/export-seed-sql.ts` | 決定論的 UUID。最小シナリオ emit |
| `README.md` | seed ユーザーはキュー／一覧確認用である旨を一文追加（自分の Google アカウントは別途昇格） |

`apps/api/scripts/seed-d1.ts` の呼び出し経路は変更不要（生成 SQL をそのまま適用）。

### 冪等化

壊れる原因: 乱数 UUID で insert → `ON CONFLICT (tenant_id, slug)` でコース行は旧 ID のまま → `DELETE sections WHERE course_id = <新UUID>` が空振り。

対策: 名前空間キーから決定論的 UUID（SHA-1 等 → UUID 形式）:

- `course:{tenant}:{slug}`
- `section:{tenant}:{slug}:{sectionId}`
- `lesson:{tenant}:{slug}:{sectionId}:{lessonId}`

assignments は shared の安定 ID を維持。sections は「course 単位 delete → 再 insert」を継続（course ID 安定で参照がずれない）。tenants の upsert は現状維持。

### 最小検証シナリオ

同スクリプト末尾で固定 ID を emit（`ON CONFLICT DO UPDATE` 等で 2 回実行しても壊れない）:

| エンティティ | 内容 |
|-------------|------|
| profiles ×3 | `seed-admin` / `seed-instructor` / `seed-learner`（tenant `ses`、各 role） |
| enrollment ×1 | learner → `web-fundamentals`（決定論的 course ID） |
| submission ×1 | learner の pending 提出 1 件（ReviewQueue 用） |

Google ログイン本人とは別人物として seed する（`auth_users` 連携はしない）。実ログインユーザーの昇格は #59 の README 手順のまま。

## 検証方針

実装者（エージェント）:

- ドキュメント／コード差分の一貫性（実データ時に fixtures 退避が残っていないこと）
- `bun run db:seed` を 2 回 → course/section/lesson ID が不変、提出 1 件が残ること
- `bun run typecheck` が通ること

利用者（人手）:

- API 停止時、courses / announcements が fixtures に化けずエラーまたは空になること
- DEV バナーが `db` / `fixtures` / `error` を示すこと
- 講師キューに seed 提出 1 件が見えること（ロール昇格後）

## 完了条件（Issue #60 と同一）

- API を止めると画面が落ちる、または明確なエラーになる
- fixtures に黙って置き換わらない
- seed を 2 回実行しても壊れた参照が残らない

## フォローアップ

- #61 — コア学習ループ端到端
- #62 — 多人数向け認可・所属
- #63 — 残モック仕分け
- #64 — 運用品質
