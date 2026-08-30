# スキルツリーの線を「親 1 本」にする — 解放条件と表示の紐づけを分ける 設計書

日付: 2026-08-30
ステータス: 実装済み

## 目的

いまの `prerequisites` は 1 本で 4 つの役割を兼ねている。

| 役割 | 場所 | 現状 |
|---|---|---|
| ① 解放条件 | `packages/shared/src/skill-map/evaluate.ts` | 全前提クリアで開く (AND)。複製は扇ごと OR |
| ② 画面の線 | `apps/web/src/components/learner/tree/radial-layout.ts` | **前提 1 つにつき線 1 本** |
| ③ ツリー配置の親 | 同上 | 前提のうち最も外側の環にある 1 つ |
| ④ 視界 (霧) の距離 | `evaluate.ts` | 前提全部を無向辺として最短距離 |

前提が 2 つ以上ある講座 (`claude-code-basics` / `claude-code-team` / `react-basics`) は
1 つの星に線が 2 本入り込み、ツリーとして読めない。

**決めたこと**: 表示 (② ③ ④) は「親 1 つ」の木にする。解放条件 (①) は複数の教材クリアを
要求できるまま (AND) にする。両者を別の項目として持つ。

## 要件

- **R1** 画面の線・配置・視界は 1 ノードにつき親 1 つ。線が複数入り込まない
- **R2** 解放条件は複数教材の AND のまま。線の無い前提も解放条件として効く
  (ロック理由パネル `lock_reasons` に名前で出るので受講者に見えなくはならない)
- **R3** 親は `course.json` に**明示**する (`parent`)。`prerequisites` の並び順に意味を持たせない
  (後から前提を足した人が気づかず線を付け替えないため)

## 決定事項 (Q&A で確定)

| 論点 | 決定 |
|---|---|
| 親の指定方法 | `course.json` に `parent` (slug) を追加。`prerequisites` に含まれていることを検査 |
| 複製 (`appearances`) の扱い | `appearancePrerequisites.<扇>` は**ちょうど 1 つ**に制限し、それをその扇の親とする。解放は現行どおり扇ごと OR。配列の形は変えない |
| 視界 (霧) の距離 | **親の辺だけ**で測る。画面の線と視界の広がりを一致させる |
| 線の点灯 | **親をクリア済みなら点灯** (現状の定義のまま)。飛び級で開いた星への線は破線のまま |

## データ

### `course.json`

```jsonc
{
  "prerequisites": ["typescript-basics", "npm-build-basics"],
  "parent": "npm-build-basics"
}
```

検査 (`packages/content/src/manifest.ts`、`content:check` と manifest テストで落とす):

- `parent` は文字列。`prerequisites` に含まれていること
- `prerequisites` が 2 つ以上なら `parent` **必須**
- 1 つなら省略可 (その 1 つが親)。0 なら `parent` は書けない
- `appearances` を持つ講座には `parent` を書けない (扇ごとの親は `appearancePrerequisites`)
- `appearancePrerequisites.<扇>` は要素数ちょうど 1

manifest の出力 (`CourseSeed` 相当) に `parent` を載せる。省略時は前提が 1 つならそれを埋めて
出す (下流が「無い」を解釈しなくて済む)。

更新する講座:

| slug | `prerequisites` | `parent` |
|---|---|---|
| `claude-code-basics` | ai-fluency-basics, claude-chat-basics | `claude-chat-basics` |
| `claude-code-team` | claude-code-basics, claude-code-skills | `claude-code-skills` |
| `react-basics` | typescript-basics, npm-build-basics | `npm-build-basics` (今のレイアウトが深い方を親に選んでいるのと同じ) |

### D1

`stages.parent` (text, 親 slug, null 可) を additive migration `0040_stage_parent.sql` で追加。
seed exporter (`packages/shared/scripts/export-seed-sql.ts`) が書く (upsert の `do update set` にも入れる)。

CMS で作ったステージ (null) は評価器の `parentSlugOf()` (`evaluate.ts`) が
`parent ?? prerequisites[0]` に倒す。倒す場所はここ 1 か所で、API の `parent_id` も同じ関数で解く。
前提 1 つのステージは今までどおり線がつく。前提が 2 つ以上で親が無い行は先頭を親にする
(安全側。教材由来の行は検査で親が必ずある)。読み込み口 (`skill-map-data.ts`) は列を素通しするだけ。

## 評価器 (`@falcon/shared/skill-map/evaluate.ts`)

- `SkillMapStage.parent?: string` (slug) を追加
- **解放判定は変えない**: 前提 AND、複製は扇ごと OR
- **視界の隣接だけ親の辺にする**。複製の「ロック中は全扇の親、開いていれば親をクリアした
  扇だけ橋を渡す」は残す (FE で Git を開いても BE の Node が手前に見えないようにする、は今のまま)
- `cycles` 検出は前提のまま (親 ⊂ 前提なので親の循環も拾える)
- 親が未知 slug なら辺を張らない (未知 slug を外に出さない規則は今のまま)

## API (`GET /api/skill-map/mine`、`apps/api/src/routes/skill-map.ts`)

| 項目 | 変更 |
|---|---|
| `prerequisite_ids: string[]` | **削除** → `parent_id?: string` に置き換え。霧の星にも付ける (トポロジは個人の学習状況でも未公開の中身でもない、は今と同じ) |
| `appearance_prerequisite_ids: Record<扇, string[]>` | **削除** → `appearance_parent_ids: Record<扇, string>` (API で `[0]` を取り出して平坦化) |
| `lock_reasons` | そのまま (前提 AND の未充足を名前で出す。線の無い前提はここで見える) |

画面の `prerequisite_ids` の使い手は線・深さ・ホームの経路の 3 つで、全部親に切り替わるので
前提 id 配列は残さない。

## 画面

### `radial-layout.ts`

- 線・深さ・扇の木の親を `parent_id` 1 本で引く (`prereqsOfNode` が高々 1 要素)
- 複製の展開 (`expandAppearances`) は `appearance_parent_ids[扇]` を `parent_id` に写す。
  複製の鍵判定 (`lockCopyToSector`) も親 1 つで見る
- 線は 1 ノード (複製は 1 複製) につき 1 本。点灯は親クリア (今の定義)

### `home-path.ts`

祖先の鎖 (`ancestorIdsOf`) と「子」(`childrenOf`) を `parent_id` で辿る。ホームは縦 1 本の
経路なので、木の親子と一致させる (前提全部で辿ると、線の無い方向の星が混ざる)。

## テスト

| 場所 | 追加・変更 |
|---|---|
| `packages/content/src/manifest.test.ts` | parent の検査 (前提に無い / 2 つ以上で欠落 / 0 で指定 / appearances と同時 / 省略時の補完)、`appearancePrerequisites` の単数制限、実データ 3 講座の parent |
| `packages/shared/src/skill-map/evaluate.test.ts` | 視界が親の辺だけで伸びる (前提 2 つの星は親側からしか近づかない)。`parent` 省略時は前提の先頭に倒す。複製の橋渡しは今の挙動を維持 |
| `apps/api/src/routes/skill-map.test.ts` | payload に `parent_id` / `appearance_parent_ids`、`prerequisite_ids` が無い。前提 2 つでも `parent_id` は 1 つで `lock_reasons` に線の無い前提が残る |
| `apps/web/src/components/learner/tree/radial-layout.test.ts` | 前提 2 つでも線 1 本。複製は扇ごとに 1 本 |
| `apps/web/src/components/learner/home/home-path.test.ts` | 親で辿る |

## 文書

- `packages/content/ADDING_COURSE.md` / `packages/content/CLAUDE.md`: `parent` の書き方と検査
- `AGENTS.md`: 1 行 (線 = 親 1 本、解放 = 前提 AND)

## 触らないもの

解放判定の意味、`stages.prerequisites` 列、腕試し (飛び級)、島の表示条件、R2 キー、
`SKILL_MAP_APPEARANCES` の catalog 方式。
