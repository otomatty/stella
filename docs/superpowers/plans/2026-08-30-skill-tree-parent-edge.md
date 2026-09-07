# スキルツリーの線を「親 1 本」にする 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スキルツリーの線・配置・視界を `course.json` の `parent` 1 本で決め、解放条件 (`prerequisites` の AND) から切り離す。

**Architecture:** `parent` (slug) を教材 → manifest → seed → D1 `stages.parent` → 評価器 → API `parent_id` → 画面と 1 本通す。解放判定は触らない。評価器の視界 (霧の距離) と画面の線・深さ・ホームの経路を「前提全部」から「親 1 つ」に切り替える。複製 (`appearances`) は扇ごとの前提をちょうど 1 つに制限し、それをその扇の親にする。

**Tech Stack:** TypeScript strict / Bun workspaces / Vitest / Hono + Drizzle (D1) / React。Lint は Biome。

**Spec:** `docs/superpowers/specs/2026-08-30-skill-tree-parent-edge-design.md`

## Global Constraints

- 解放判定の意味 (前提 AND、複製は扇ごと OR) は変えない。`stages.prerequisites` 列も変えない
- `parent` は `prerequisites` に含まれる slug。前提が 2 つ以上なら必須、1 つなら省略可 (= その 1 つ)、0 なら書けない、`appearances` 持ちには書けない
- `appearancePrerequisites.<扇>` は要素数ちょうど 1
- `parent` 未指定の行 (CMS 由来) は `prerequisites[0]` に倒す。倒す場所は評価器の `parentSlugOf()` 1 か所 (API もそれを使う)
- API は `prerequisite_ids` / `appearance_prerequisite_ids` を**削除**し、`parent_id?: string` / `appearance_parent_ids?: Record<string, string>` に置き換える。霧の星にも付ける
- 未知 slug は外に出さない (親が未知なら線を引かない)
- 線の点灯は「親をクリア済み」(現状の定義のまま)
- **作業ツリーに無関係の未コミット変更が大量にある。`git add` は必ずファイル指定** (`git add -A` 禁止)
- コミット末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- 各タスクの最後に `bun run lint` と `bun run typecheck` を通す (Biome の format も lint に含まれる)

---

### Task 1: 教材 — `course.json` の `parent` と検査

**Files:**
- Modify: `packages/content/src/types.ts:58` (`CourseConfig.prerequisites` の直後)
- Modify: `packages/content/src/manifest.ts:165-262` (検査) / `:455-472` (出力)
- Modify: `apps/web/src/data/types.ts:97` (`Course.prerequisites` の直後)
- Modify: `packages/content/courses/claude-code-basics/course.json` / `claude-code-team/course.json` / `react-basics/course.json`
- Modify: `packages/content/ADDING_COURSE.md:96-113`
- Modify: `packages/content/CLAUDE.md:145`
- Test: `packages/content/src/manifest.test.ts`

**Interfaces:**
- Produces: `CourseConfig.parent?: string` (content)、`Course.parent?: string` (web types、manifest の出力に載る。前提 1 つなら省略しても補完済み)

- [ ] **Step 1: 失敗するテストを書く**

`packages/content/src/manifest.test.ts` の `describe("buildContentManifest — スキルツリーのフィールド"` の中、`it("書いていない講座は 3 つとも未設定のまま` の直前に追加:

```ts
  it("prerequisites が 2 つ以上で parent が無いと落ちる", () => {
    withCourses(
      { "a-basics": {}, "b-basics": {}, "c-basics": { prerequisites: ["a-basics", "b-basics"] } },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/parent/);
      },
    );
  });

  it("parent が prerequisites に無いと落ちる", () => {
    withCourses(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": { prerequisites: ["a-basics"], parent: "b-basics" },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/含めて/);
      },
    );
  });

  it("前提なしの講座に parent は書けない", () => {
    withCourses({ "a-basics": {}, "b-basics": { parent: "a-basics" } }, (root) => {
      expect(() => buildContentManifest(root)).toThrow(/含めて/);
    });
  });

  it("appearances と parent は併用できない (扇ごとの親は appearancePrerequisites)", () => {
    withCourses(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": {
          prerequisites: ["a-basics", "b-basics"],
          parent: "a-basics",
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: { フロントエンド: ["a-basics"], バックエンド: ["b-basics"] },
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/併用/);
      },
    );
  });

  it("parent は manifest に載る。前提 1 つなら省略しても補完される", () => {
    withCourses(
      {
        "a-basics": {},
        "b-basics": { prerequisites: ["a-basics"] },
        "c-basics": { prerequisites: ["a-basics", "b-basics"], parent: "b-basics" },
      },
      (root) => {
        const { courses } = buildContentManifest(root);
        expect(courses.find((c) => c.id === "a-basics")?.parent).toBeUndefined();
        expect(courses.find((c) => c.id === "b-basics")?.parent).toBe("a-basics");
        expect(courses.find((c) => c.id === "c-basics")?.parent).toBe("b-basics");
      },
    );
  });

  it("appearancePrerequisites の扇に 2 つ書くと落ちる (扇ごとの親は 1 つ)", () => {
    withCourses(
      {
        "a-basics": {},
        "b-basics": {},
        "c-basics": {
          prerequisites: ["a-basics", "b-basics"],
          appearances: ["フロントエンド", "バックエンド"],
          appearancePrerequisites: {
            フロントエンド: ["a-basics", "b-basics"],
            バックエンド: ["b-basics"],
          },
        },
      },
      (root) => {
        expect(() => buildContentManifest(root)).toThrow(/ちょうど 1 つ/);
      },
    );
  });
```

実データのテスト `it("Claude Code 入門は 2 本の前提を持つ"` を次に置き換える:

```ts
  it("前提が 2 本の講座は parent で線を 1 本に決めている", () => {
    const parentOf = (slug: string) => courses.find((c) => c.id === slug)?.parent;
    expect(courses.find((c) => c.id === "claude-code-basics")?.prerequisites).toEqual([
      "ai-fluency-basics",
      "claude-chat-basics",
    ]);
    expect(parentOf("claude-code-basics")).toBe("claude-chat-basics");
    expect(parentOf("claude-code-team")).toBe("claude-code-skills");
    expect(parentOf("react-basics")).toBe("npm-build-basics");
    // 前提 1 つの講座は省略 = その前提。
    expect(parentOf("html-css-basics")).toBe("it-basics");
    // 複製は扇ごとの親 (appearancePrerequisites) なので parent を持たない。
    expect(parentOf("git-basics")).toBeUndefined();
    expect(parentOf("it-basics")).toBeUndefined();
  });
```

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run packages/content/src/manifest.test.ts`
Expected: 上の新規テストが FAIL (`parent` を検査していない / `parent` が出力に無い)。既存テストは PASS のまま。

- [ ] **Step 3: 型を足す**

`packages/content/src/types.ts` の `prerequisites?: string[];` の直後:

```ts
  /**
   * スキルツリーで線を引く親 (slug)。`prerequisites` のうちの 1 つ。線・配置・視界は
   * この 1 本で決まり、解放条件は `prerequisites` 全部 (AND) のまま。
   * 前提が 2 つ以上なら必須、1 つなら省略可 (その 1 つが親)、0 なら書けない。
   * `appearances` を持つ講座は扇ごとの親を `appearancePrerequisites` に書くので、これは書けない。
   */
  parent?: string;
```

`apps/web/src/data/types.ts` の `Course.prerequisites?: string[];` の直後:

```ts
  /**
   * スキルツリーで線を引く親の **slug** (`stages.parent` 由来。`prerequisites` のうちの 1 つ)。
   * 未設定なら `prerequisites` の先頭を親に倒す (評価器 `parentSlugOf`)。
   */
  parent?: string;
```

- [ ] **Step 4: manifest の検査と出力**

`packages/content/src/manifest.ts` の `readCourseConfig` — `appearancePrerequisites` ブロックの中、
`if (trimmedSlugs.length === 0) {` の検査を次に置き換える:

```ts
      if (trimmedSlugs.length !== 1) {
        throw new Error(
          `courses/${slug}/course.json の appearancePrerequisites.${sector} は slug をちょうど 1 つにしてください (その扇の親 = 線の元)。`,
        );
      }
```

同じ関数の `appearancePrerequisites` ブロック (`prerequisites は appearancePrerequisites の和集合に` の throw を含む `if` の閉じ) の直後、`for (const field of ["canDo", "theme"] as const)` の前に追加:

```ts
  {
    const listed = (raw.prerequisites ?? []).map((p) => p.trim());
    if (raw.parent != null) {
      if (typeof raw.parent !== "string" || raw.parent.trim() === "") {
        throw new Error(`courses/${slug}/course.json の parent は slug (文字列) にしてください。`);
      }
      if (raw.appearances != null) {
        throw new Error(
          `courses/${slug}/course.json の parent は appearances と併用できません (扇ごとの親は appearancePrerequisites に書きます)。`,
        );
      }
      if (!listed.includes(raw.parent.trim())) {
        throw new Error(
          `courses/${slug}/course.json の parent は prerequisites に含めてください: ${raw.parent}`,
        );
      }
    } else if (listed.length >= 2 && raw.appearances == null) {
      throw new Error(
        `courses/${slug}/course.json の prerequisites が 2 つ以上なので、線を引く 1 つを parent に指定してください。`,
      );
    }
  }
```

出力 (`return { course: { ... } }` の直前、`const icon = resolveIcon(courseDir, slug);` の後) に追加:

```ts
  // 線を引く親。省略時は前提が 1 つならそれ (下流が「無い」を解釈しなくて済む)。
  const prerequisiteSlugs = (config.prerequisites ?? []).map((p) => p.trim());
  const parent =
    config.parent?.trim() ?? (prerequisiteSlugs.length === 1 ? prerequisiteSlugs[0] : undefined);
```

`course` オブジェクトの `...(config.prerequisites && ...)` の直後に:

```ts
      ...(parent ? { parent } : {}),
```

- [ ] **Step 5: 3 講座の `course.json` に `parent` を足す**

各ファイルの `"prerequisites": [...]` 行の直後に 1 行追加 (インデントは既存に合わせる):

- `packages/content/courses/claude-code-basics/course.json`: `"parent": "claude-chat-basics",`
- `packages/content/courses/claude-code-team/course.json`: `"parent": "claude-code-skills",`
- `packages/content/courses/react-basics/course.json`: `"parent": "npm-build-basics",`

- [ ] **Step 6: テストを通す**

Run: `bunx vitest run packages/content/src/manifest.test.ts`
Expected: PASS。`grep -n appearancePrerequisites packages/content/src/manifest.test.ts` で扇に 2 つ以上書いている既存テストが無いことも確認 (あれば「ちょうど 1 つ」に合わせて直す)。

Run: `bun run content:check`
Expected: `前提グラフ: 33 講座 ...` で終了コード 0。

- [ ] **Step 7: 文書**

`packages/content/ADDING_COURSE.md` の見出し `#### スキルツリー用の 3 つの任意フィールド` から `- 3 つとも省略できます。...` までを次に置き換える:

```markdown
#### スキルツリー用の任意フィールド

ホームのステージマップ（スキルツリー）は、講座をスキルとして並べます。スキルの解放と見え方は `course.json` の任意フィールドが決めます。値は manifest → seed 経由で D1 `stages.prerequisites` / `parent` / `can_do` / `theme` に入り、評価器（`@stella/shared/skill-map`）が読みます。

| フィールド | 型 | 何になるか |
| --- | --- | --- |
| `prerequisites` | slug の配列 | **ハードロック（解放条件）**。挙げた講座を全部クリアするまで、この講座は開けない。見た目の複製 (`appearances`) で扇ごとに前提を分けるときは和集合を書き、組は `appearancePrerequisites` へ |
| `parent` | slug | **線を引く親**。`prerequisites` のうちの 1 つ。ツリーの線・配置・霧の距離はこの 1 本で決まる（1 つの星に線は 1 本しか入らない）。前提が 2 つ以上なら**必須**、1 つなら省略可（その 1 つが親）、0 なら書けない。線の無い前提も解放条件としては効き、ロック中の星の「解放条件」に名前で出る |
| `canDo` | 1 文 | ホバーの到達説明「このスキルを身につけた人は◯◯ができる」 |
| `theme` | 短い語 | まだ見えていないスキルに、タイトルの代わりに見せるテーマ名 |

- `prerequisites` に書けるのは、その講座の `CURRICULUM.md` に**前提講座として散文で明記されているもの**だけです。「推奨」「任意」「想定する受講順」はゲートではないので書きません。書いた瞬間に、前提を終えていない受講者は講座を開けなくなります
- `parent` は「この講座はどの講座の続きとして描くか」です。前提を後から足しても線は動きません（並び順に意味を持たせない）。複製 (`appearances`) を持つ講座は `parent` を書けず、`appearancePrerequisites.<扇>` にちょうど 1 つ書いた slug がその扇の親になります
- **1 つの星から出る枝は最大 2 本**です（スキルツリーの見た目）。3 本以上になるなら直列化する。島（資格 / AI）への橋は線を引かないのでこの上限に入れない
- 存在しない slug・自己参照・循環・`parent` の不整合は `bun run content:check`（manifest ビルド）で落ちます
- `canDo` は「〜できる」で終える 1 文。誇張しない（資格講座で合格を保証しない）
- `theme` はカテゴリ単位でそろえます（講座ごとに凝った名前を付けない）。まだ見えない範囲では同じテーマのスキルが同じ名前で並ぶのが正です。省略するとまだ見えない範囲では `？？？` と表示されます（名前の無いスキルにはしない）
- 前提に挙げられた講座は、依存側が公開中のあいだ **非公開にも削除もできません**（CMS が 409 で止めます）。順序を変えるときは依存側の `prerequisites` を先に外します
- 全部省略できます。省略した講座は「前提なし・到達説明なし・テーマなし」として扱われます
```

`packages/content/CLAUDE.md:145` の `（`appearancePrerequisites`。組どうしは OR）` を `（`appearancePrerequisites`。扇ごとにちょうど 1 つで、それがその扇の親 = 線の元。組どうしは OR）` に置き換える。

- [ ] **Step 8: lint / typecheck / commit**

Run: `bun run lint && bun run typecheck`
Expected: どちらも exit 0。

```bash
git add packages/content/src/types.ts packages/content/src/manifest.ts packages/content/src/manifest.test.ts apps/web/src/data/types.ts packages/content/courses/claude-code-basics/course.json packages/content/courses/claude-code-team/course.json packages/content/courses/react-basics/course.json packages/content/ADDING_COURSE.md packages/content/CLAUDE.md
git commit -m "教材: course.json に parent (スキルツリーで線を引く親) を追加し検査する

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: D1 — `stages.parent` 列と seed

**Files:**
- Create: `apps/api/drizzle/0040_stage_parent.sql`
- Modify: `apps/api/src/db/schema.ts:162` (`prerequisites` 列の直後)
- Modify: `packages/shared/scripts/export-seed-sql.ts:118-127`

**Interfaces:**
- Consumes: `Stage.parent?: string` (Task 1 で `Course` に足した項目。`Stage` は同じ型ファイルの拡張)
- Produces: D1 列 `stages.parent` (text, null 可)、Drizzle `stages.parent`

- [ ] **Step 1: migration**

`apps/api/drizzle/0040_stage_parent.sql`:

```sql
-- スキルツリーで線を引く親 (slug)。正本は course.json の `parent`
-- (前提が 1 つなら省略 = その前提。manifest が補完して seed に渡す)。
-- 線・配置・視界はこの 1 本、解放条件は `prerequisites` 全部 (AND) のまま。
-- null なら評価器が `prerequisites` の先頭に倒す (CMS で作ったステージ)。
-- 列を 1 本足すだけの additive。既存の行・索引は触らない。
ALTER TABLE `stages` ADD COLUMN `parent` text;
```

(`0039_stage_icon_path.sql` と同じく `meta/_journal.json` は触らない — wrangler は SQL ファイルを直接当てる。)

- [ ] **Step 2: schema**

`apps/api/src/db/schema.ts` の `prerequisites: text("prerequisites"),` の直後:

```ts
    /**
     * スキルツリーで線を引く親の **slug** (`prerequisites` のうちの 1 つ)。線・配置・視界は
     * この 1 本で決まり、解放条件は `prerequisites` 全部 (AND) のまま。null は評価器が
     * `prerequisites` の先頭に倒す (前提 1 つのステージは今までどおり線がつく)。
     */
    parent: text("parent"),
```

- [ ] **Step 3: seed exporter**

`packages/shared/scripts/export-seed-sql.ts` の `emitStage` — `const theme = ...` の直後に:

```ts
  const parent = stage.parent ? `'${esc(stage.parent)}'` : "null";
```

同じ関数の insert 文を直す (3 か所):
- 列リスト `status, prerequisites, can_do, theme` → `status, prerequisites, parent, can_do, theme`
- values の `${prerequisites}, ${canDo}, ${theme}` → `${prerequisites}, ${parent}, ${canDo}, ${theme}`
- `do update set ... prerequisites = excluded.prerequisites, can_do = excluded.can_do` → `prerequisites = excluded.prerequisites, parent = excluded.parent, can_do = excluded.can_do`

- [ ] **Step 4: ローカル D1 で確認**

Run: `bun run db:migrate && bun run db:seed`
Expected: どちらも exit 0 (migration `0040_stage_parent.sql` が applied と出る)。

Run: `cd apps/api && bunx wrangler d1 execute falcon-db --local --command "select slug, parent from stages where slug in ('react-basics','html-css-basics','git-basics','it-basics') order by slug"`
Expected: `git-basics` と `it-basics` は null、`html-css-basics` は `it-basics`、`react-basics` は `npm-build-basics`。

- [ ] **Step 5: lint / typecheck / commit**

Run: `bun run lint && bun run typecheck`
Expected: exit 0。

```bash
git add apps/api/drizzle/0040_stage_parent.sql apps/api/src/db/schema.ts packages/shared/scripts/export-seed-sql.ts
git commit -m "D1: stages.parent 列を足し、seed が course.json の parent を書く

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 評価器 — 視界の辺を親だけにする

**Files:**
- Modify: `packages/shared/src/skill-map/evaluate.ts:1-50` (冒頭コメント) / `:63-82` (`SkillMapStage`) / `:186-191` (`prerequisiteGroupsOf` の隣) / `:278-298` (隣接表)
- Test: `packages/shared/src/skill-map/evaluate.test.ts`

**Interfaces:**
- Consumes: なし (純関数)
- Produces: `SkillMapStage.parent?: string`、`export function parentSlugOf(stage: Pick<SkillMapStage, "parent" | "prerequisites">): string | undefined` (Task 4 の API が使う)

- [ ] **Step 1: 失敗するテストを書く**

`packages/shared/src/skill-map/evaluate.test.ts` の `describe("evaluateSkillMap — 視界"` の中、最初の `it(` の前に追加:

```ts
  /**
   * root → a, root → b → c, x は a と c の両方を要求するが線 (parent) は c から。
   * root と a をクリア: 起点は root / a / b (b は unlocked)。
   */
  const merge = (parent: string | undefined): SkillMapStage[] => [
    stage("root"),
    stage("a", ["root"]),
    stage("b", ["root"]),
    stage("c", ["b"]),
    stage("x", ["a", "c"], parent === undefined ? {} : { parent }),
  ];

  it("視界は親の辺だけで伸びる (線の無い前提からは近づかない)", () => {
    const r = evaluateSkillMap({
      stages: merge("c"),
      clearedStageIds: new Set([id("root"), id("a")]),
    });
    // 解放は AND のまま: a はクリア済みでも c が残っている。
    expect(r.states.get(id("x"))).toBe("locked");
    expect(reasonLabels(r, id("x"))).toEqual(["c の講座"]);
    // 視界は c 経由だけ: b (起点) → c = 1 歩 → x = 2 歩。a から直接は近づかない。
    expect(r.visibility.get(id("c"))).toBe("full");
    expect(r.visibility.get(id("x"))).toBe("name-only");
  });

  it("parent 省略時は前提の先頭を親に倒す (CMS 由来の行の互換)", () => {
    const r = evaluateSkillMap({
      stages: merge(undefined),
      clearedStageIds: new Set([id("root"), id("a")]),
    });
    // 先頭 = a が親。a (起点) → x = 1 歩。
    expect(r.visibility.get(id("x"))).toBe("full");
  });

  it("parentSlugOf は parent → 前提の先頭 → undefined の順", () => {
    expect(parentSlugOf({ parent: "c", prerequisites: ["a", "c"] })).toBe("c");
    expect(parentSlugOf({ prerequisites: ["a", "c"] })).toBe("a");
    expect(parentSlugOf({ prerequisites: [] })).toBeUndefined();
  });
```

ファイル冒頭の import に `parentSlugOf` を足す:

```ts
import {
  UNKNOWN_PREREQUISITE_LABEL,
  evaluateSkillMap,
  parentSlugOf,
  type SkillMapResult,
  type SkillMapStage,
} from "./evaluate.js";
```

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run packages/shared/src/skill-map/evaluate.test.ts`
Expected: `parentSlugOf` が無いので import で FAIL (型エラー含む)。

- [ ] **Step 3: 型とヘルパ**

`packages/shared/src/skill-map/evaluate.ts` の `SkillMapStage` — `prerequisites: string[];` の直後:

```ts
  /**
   * スキルツリーで線を引く親の **slug** (`prerequisites` のうちの 1 つ)。視界の辺はこれだけ。
   * 未設定なら `prerequisites` の先頭 (`parentSlugOf`)。複製 (`appearances.ts`) は扇ごとの
   * 前提 (各 1 つ) が親なので、この項目は見ない。
   */
  parent?: string;
```

`prerequisiteGroupsOf` の直後に追加:

```ts
/**
 * 線を引く親の slug。`parent` → 前提の先頭 → なし。
 * CMS で作った行は `parent` を持たないので、前提 1 つなら今までどおり線がつく。
 */
export function parentSlugOf(
  stage: Pick<SkillMapStage, "parent" | "prerequisites">,
): string | undefined {
  return stage.parent ?? stage.prerequisites[0];
}

/** 視界の辺の元。複製は扇ごとの親 (各 1 つ)、通常は `parentSlugOf`。 */
function parentSlugsOf(stage: SkillMapStage): string[] {
  const catalog = appearancePrerequisitesOf(stage.slug);
  if (catalog) return Object.values(catalog).flatMap((slugs) => slugs.slice(0, 1));
  const parent = parentSlugOf(stage);
  return parent === undefined ? [] : [parent];
}
```

- [ ] **Step 4: 隣接表を親の辺にする**

`evaluateSkillMap` の `// 無向の隣接表 (視界の距離用)。` から `neighbours.get(prereq)?.add(stage.id); } }` までを次に置き換える:

```ts
  // 無向の隣接表 (視界の距離用)。辺は **親** だけ (画面の線と同じ 1 本)。線の無い前提は
  // 解放条件としては効くが、視界はそちらへ伸びない (見えている線と広がり方を一致させる)。
  // 複製は扇ごとに親を持つ。開いた星から満たしていない扇へ橋を渡さない (FE で Git を
  // 開いても BE の Node が手前に見えないようにする)。ロック中は全扇の親を辿れる。
  const neighbours = new Map<string, Set<string>>();
  for (const stage of stages) neighbours.set(stage.id, new Set());
  for (const stage of stages) {
    const parents = parentSlugsOf(stage);
    const cleared = parents.filter((slug) => {
      const parentId = idBySlug.get(slug);
      return parentId !== undefined && clearedStageIds.has(parentId);
    });
    const visSlugs = states.get(stage.id) === "locked" || cleared.length === 0 ? parents : cleared;
    for (const parent of resolveIds(visSlugs, idBySlug)) {
      if (parent === stage.id) continue;
      neighbours.get(stage.id)?.add(parent);
      neighbours.get(parent)?.add(stage.id);
    }
  }
```

冒頭コメントの `**視界は無向グラフ上の最短距離**で決める。` の段落に 1 文足す (段落の末尾、`受講者の視界が真っ白にならないようにするため (入口の星は常に unlocked)。` の直後):

```
 * 辺は **親** (`parent`、複製は扇ごとの前提) だけで、線の無い前提は視界に数えない —
 * 画面に見える線と視界の広がり方を一致させる。
```

- [ ] **Step 5: テストを通す**

Run: `bunx vitest run packages/shared/src/skill-map/evaluate.test.ts`
Expected: 全件 PASS (Git の `dual` 系「片方の扇で開いても…視界が漏れない」も含む)。

- [ ] **Step 6: lint / typecheck / commit**

Run: `bun run lint && bun run typecheck`
Expected: exit 0。

```bash
git add packages/shared/src/skill-map/evaluate.ts packages/shared/src/skill-map/evaluate.test.ts
git commit -m "評価器: 視界の辺を親 (parent) だけにし、parentSlugOf を公開する

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: API — `parent_id` / `appearance_parent_ids`

**Files:**
- Modify: `apps/api/src/lib/skill-map-data.ts:153-163` (select) / `:181-190` (map)
- Modify: `apps/api/src/routes/skill-map.ts:110-127` (`appearancePrerequisitePayload`) / `:196-215` (payload 型) / `:233-241` (`prerequisiteIdsOf`) / `:258-288` (3 か所の `prerequisite_ids`)
- Test: `apps/api/src/routes/skill-map.test.ts:169-180` / `:237-287` / `:313-321`

**Interfaces:**
- Consumes: `parentSlugOf` (Task 3)、`stages.parent` (Task 2)
- Produces: `SkillMapStagePayload.parent_id?: string`、`SkillMapStagePayload.appearance_parent_ids?: Record<string, string>` (`prerequisite_ids` / `appearance_prerequisite_ids` は削除)

- [ ] **Step 1: 既存テストを新しい形に直し、1 件足す**

`apps/api/src/routes/skill-map.test.ts`:

`it("霧の星は名前・カテゴリ・前提線まで` の中の

```ts
    expect(e?.prerequisite_ids).toEqual(["id-d"]);
```
を
```ts
    expect(e?.parent_id).toBe("id-d");
```

`it("扇ごとの前提 id は霧の星にも載せる` を次に置き換える (fixture の `stages` 配列はそのまま):

```ts
  it("扇ごとの親 id は霧の星にも載せる (複製先で線を張る)", async () => {
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      stages: [
        // (既存の 5 ステージをそのまま)
      ],
      clearedStageIds: new Set<string>(),
      activeStageId: undefined,
    });
    const stages = await fetchStages();
    const git = stages.get("id-git");
    expect(git?.appearance_parent_ids).toEqual({ フロントエンド: "id-js", バックエンド: "id-node" });
    expect(stages.get("id-it")?.appearance_parent_ids).toBeUndefined();
    // 複製は扇ごとの親で線を張るので、実体側の parent_id は付けない材料が無い (前提 2 つ、parent 無し)
    // — 先頭 (js) に倒れる。画面は appearance_parent_ids を優先する。
    expect(git?.parent_id).toBe("id-js");
  });
```

`it("前提の id を全部の星に載せる` を次に置き換える:

```ts
  it("線を引く親の id を全部の星に載せる (ツリーが線とリング = 深さを決めるのに使う)", async () => {
    const stages = await fetchStages();
    expect(stages.get("id-c")?.parent_id).toBe("id-b");
    expect(stages.get("id-a")?.parent_id).toBeUndefined();
    // 霧の星にも線は引く — 無いと先のスキルが内側のリングに置かれてしまう。
    expect(stages.get("id-e")?.parent_id).toBe("id-d");
    // 前提 id の配列は返さない (使い手が無い。解放条件は lock_reasons が名前で出す)。
    expect(Object.keys(stages.get("id-c") ?? {})).not.toContain("prerequisite_ids");
  });

  it("前提が 2 つでも線は parent の 1 本。線の無い前提は解放条件に残る", async () => {
    const base = lineSource();
    vi.mocked(loadSkillMapSource).mockResolvedValue({
      ...base,
      stages: [
        ...base.stages,
        {
          id: "id-x",
          slug: "x",
          title: "x の講座",
          prerequisites: ["a", "c"],
          parent: "c",
          category: "プログラミング",
        },
      ],
    });
    const stages = await fetchStages();
    const x = stages.get("id-x");
    expect(x?.parent_id).toBe("id-c");
    expect(x?.state).toBe("locked");
    // a はクリア済み (lineSource) なので、残る解放条件は c だけ。
    expect(x?.lock_reasons).toEqual(["c の講座"]);
  });
```

(`lineSource()` の `clearedStageIds` に `id-a` が入っていることは同ファイル冒頭のコメントどおり。違えば `lock_reasons` の期待を合わせる。)

- [ ] **Step 2: 失敗を確認**

Run: `bunx vitest run apps/api/src/routes/skill-map.test.ts`
Expected: 直したテストが FAIL (`parent_id` が無い)。

- [ ] **Step 3: 読み込み口**

`apps/api/src/lib/skill-map-data.ts` の `loadSkillMapSource` — select に `parent: stages.parent,` を `prerequisites: stages.prerequisites,` の直後に追加。map に

```ts
      ...(row.parent ? { parent: row.parent } : {}),
```
を `prerequisites: parsePrerequisites(row.prerequisites),` の直後に追加。

- [ ] **Step 4: ルート**

`apps/api/src/routes/skill-map.ts`:

import に `parentSlugOf` を足す (評価器の import 行と同じモジュール `@stella/shared/skill-map/evaluate` から。既存の import の形に合わせる):

```ts
import { parentSlugOf } from "@stella/shared/skill-map/evaluate";
```

`appearancePrerequisitePayload` 関数を次に置き換える:

```ts
/** 扇ごとの親 id。slug が無い霧でもレイアウトが線を張れるようにする。 */
function appearanceParentPayload(
  slug: string,
  idBySlug: Map<string, string>,
): { appearance_parent_ids?: Record<string, string> } {
  const groups = appearancePrerequisitesOf(slug);
  if (!groups) return {};
  const mapped: Record<string, string> = {};
  for (const [sector, slugs] of Object.entries(groups)) {
    const id = idBySlug.get(slugs[0] ?? "");
    if (id !== undefined) mapped[sector] = id;
  }
  return { appearance_parent_ids: mapped };
}
```

payload 型の `prerequisite_ids?: string[];` (doc コメントごと) を次に置き換える:

```ts
  /**
   * 線を引く親ステージの id (スキルツリーが星と星を線で結び、深さ = リングを決めるのに使う)。
   * 線は 1 本だけ。解放条件 (前提 AND) は `lock_reasons` が名前で出す。
   *
   * **霧の星にも付ける。** 線が無いと盤面はその星の深さを計算できず、ずっと先の
   * スキルが内側のリングに置かれてしまう (前提の浅い星ほど中心に近い、が崩れる)。
   * トポロジは教材カタログの構造であって個人の学習状況でも未公開の中身でもない。
   */
  parent_id?: string;
```

`appearance_prerequisite_ids?: Record<string, string[]>;` (doc ごと) を:

```ts
  /**
   * 扇ごとの親ステージ id。複製した星は自分の扇の親から線を引く。
   * **霧の星にも付ける。**
   */
  appearance_parent_ids?: Record<string, string>;
```

ハンドラ内の `...appearancePrerequisitePayload(stage.slug, idBySlug),` → `...appearanceParentPayload(stage.slug, idBySlug),`。

`const prerequisiteIdsOf = ...` (コメントごと) を次に置き換える:

```ts
    // 線を引く親。前提は slug で書かれている (正本が id を知らないため) ので id へ解く。
    // 未知 slug (未公開 / 削除済み) は解けないので線も引かない — 生の slug を
    // 出さない評価器の規則を、こちらの項目でも同じに保つ。
    const parentIdOf = (stage: SkillMapSource["stages"][number]): { parent_id?: string } => {
      const slug = parentSlugOf(stage);
      const id = slug === undefined ? undefined : idBySlug.get(slug);
      return id === undefined ? {} : { parent_id: id };
    };
```

3 か所の `prerequisite_ids: prerequisiteIdsOf(stage),` を `...parentIdOf(stage),` に置き換える。

- [ ] **Step 5: 他の使い手が無いことを確認**

Run: `grep -rn "prerequisite_ids\|appearance_prerequisite_ids" apps/api/src`
Expected: 出力なし。あれば同じ置き換えをする。

- [ ] **Step 6: テストを通す**

Run: `bunx vitest run apps/api/src/routes/skill-map.test.ts apps/api/src/lib/skill-map-data.test.ts`
Expected: PASS。

- [ ] **Step 7: lint / typecheck / commit**

Run: `bun run lint && bun run typecheck`
Expected: exit 0 (`apps/web` が `prerequisite_ids` を参照していても、web 側は自分の型ファイルを持つのでここでは落ちない)。

```bash
git add apps/api/src/lib/skill-map-data.ts apps/api/src/routes/skill-map.ts apps/api/src/routes/skill-map.test.ts
git commit -m "API: skill-map の線を parent_id / appearance_parent_ids にする (prerequisite_ids は廃止)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: 画面 — 線・深さ・ホームの経路を親 1 本にする

**Files:**
- Modify: `apps/web/src/lib/skill-map-api.ts:35-51`
- Modify: `apps/web/src/components/learner/tree/radial-layout.ts:170-225` (`expandAppearances` / `lockCopyToSector`) / `:347-362` (`prereqsOfNode`) / `:586-602` (edges のコメント)
- Modify: `apps/web/src/components/learner/home/home-path.ts:20-37`
- Test: `apps/web/src/components/learner/tree/radial-layout.test.ts`、`apps/web/src/components/learner/home/home-path.test.ts`

**Interfaces:**
- Consumes: API の `parent_id` / `appearance_parent_ids` (Task 4)
- Produces: `SkillMapStageNode.parent_id?: string`、`SkillMapStageNode.appearance_parent_ids?: Record<string, string>`

- [ ] **Step 1: 型**

`apps/web/src/lib/skill-map-api.ts` の `prerequisite_ids?: string[];` (doc ごと) を:

```ts
  /**
   * 線を引く親ステージの id (スキルツリーが星と星を線で結び、深さ = リングを決めるのに使う)。
   * 線は 1 本だけ。解放条件 (前提 AND) は `lock_reasons` が名前で持つ。
   *
   * 霧の星にも入る (線が無いと先のスキルが内側のリングに置かれてしまうため)。
   * 見せる / 伏せるの判断はサーバの応答に従うだけで、こちらで足し引きしない。
   */
  parent_id?: string;
```

`appearance_prerequisite_ids?: Record<string, string[]>;` (doc ごと) を:

```ts
  /**
   * 扇ごとの親ステージ id。複製した星は、自分の扇の親から線を引き、鍵もそれで見る。
   * **霧の星にも付ける。** 線が無いとリングが崩れるのは `parent_id` と同じ。
   */
  appearance_parent_ids?: Record<string, string>;
```

- [ ] **Step 2: テストを新しい形に直し、線 1 本のテストを足す**

`apps/web/src/components/learner/tree/radial-layout.test.ts`:

- `node()` ヘルパの既定値 `prerequisite_ids: [],` を削除
- 全 `prerequisite_ids: ["X"]` (1 要素) を `parent_id: "X"` に置き換える (`sed -i 's/prerequisite_ids: \["\([^"]*\)"\]/parent_id: "\1"/g'`)。`prerequisite_ids: []` は削除
- 2 要素の箇所を手で直す:
  - `prerequisite_ids: ["a", "fog"]` (霧の線のテスト) → `parent_id: "fog"`
  - AI 島のテスト `code` の `prerequisite_ids: ["ai", "chat"]` → `parent_id: "chat"`。同テストの期待を直す: `expect(Math.abs(dOf("chat") - dOf("code"))).toBeLessThan(41);` → `expect(dOf("code")).toBeGreaterThan(dOf("chat"));`、`angularGap(...)` の期待 2 行 (`angleOf` / `angularGap` の定義と `expect(angularGap(...))`) を削除、`expect(pairs).toContain("ai->code");` → `expect(pairs).toContain("chat->code");`。コメント `根を直接の前提に持つ星 (chat / code) は…第 1 リング` → `chat は第 1 リング、code は chat の 1 つ外 (parent = chat)`
  - `withGitAfterBasics` の `git`: `prerequisite_ids: ["js", "node"],` を削除し、`appearance_prerequisite_ids: { フロントエンド: ["js"], バックエンド: ["node"] }` → `appearance_parent_ids: { フロントエンド: "js", バックエンド: "node" }`
  - `rows.map(([id, category, prerequisite_ids, appearances])` 付近のヘルパ (`:223-232`) も同じ形に (`parent_id` は文字列 1 つ、`appearance_parent_ids` は扇 → 文字列)。行データの 3 列目が配列なら先頭を採る
- `describe("layoutRadialSkillTree"` の最初の `it(` の直後に追加:

```ts
  it("前提が 2 つあっても線は親の 1 本 (線が複数入り込まない)", () => {
    const layout = layoutRadialSkillTree([
      node({ id: "root", title: "入口", category: "基礎", state: "cleared" }),
      node({ id: "a", title: "A", state: "cleared", parent_id: "root" }),
      node({ id: "b", title: "B", state: "unlocked", parent_id: "root" }),
      // 解放条件は a と b の両方 (lock_reasons はサーバが名前で持つ)。線は b から。
      node({ id: "x", title: "X", state: "locked", parent_id: "b", lock_reasons: ["B"] }),
    ]);
    const into = layout.edges.filter((e) => e.toId === "x");
    expect(into.map((e) => e.fromId)).toEqual(["b"]);
    // 点灯は「親をクリア済み」。b は unlocked なので破線。
    expect(into[0]?.satisfied).toBe(false);
  });
```

`apps/web/src/components/learner/home/home-path.test.ts`: `prerequisite_ids: ["X"]` → `parent_id: "X"`、`prerequisite_ids: []` は削除 (同じ sed)。

- [ ] **Step 3: 失敗を確認**

Run: `bunx vitest run apps/web/src/components/learner/tree/radial-layout.test.ts apps/web/src/components/learner/home/home-path.test.ts`
Expected: 型エラーまたは線が引かれず FAIL。

- [ ] **Step 4: radial-layout**

`expandAppearances` の中:

```ts
      const prereqIds = node.appearance_prerequisite_ids?.[sector] ?? node.prerequisite_ids;
      out.push(
        lockCopyToSector(
          {
            ...node,
            category: sector,
            appearances: undefined,
            appearance_prerequisite_ids: undefined,
            prerequisite_ids: prereqIds,
          },
          byId,
        ),
      );
```
を
```ts
      const parentId = node.appearance_parent_ids?.[sector] ?? node.parent_id;
      out.push(
        lockCopyToSector(
          {
            ...node,
            category: sector,
            appearances: undefined,
            appearance_parent_ids: undefined,
            parent_id: parentId,
          },
          byId,
        ),
      );
```
に。関数 doc の `扇ごとの前提があれば、その複製の線と鍵は自分の組だけを見る。` → `扇ごとの親があれば、その複製の線と鍵はその親だけを見る。`

`lockCopyToSector` の `const unmet = ...` 以降を:

```ts
  const parentId = copy.parent_id;
  if (parentId === undefined || byId.get(parentId)?.state === "cleared") {
    return { ...copy, state: "unlocked", lock_reasons: undefined };
  }
  return {
    ...copy,
    state: "locked",
    can_do: undefined,
    lock_reasons: [byId.get(parentId)?.title ?? "非公開の教材"],
  };
```

`layoutCluster` の `prereqsOfNode` を:

```ts
  // 複製は id が同じでも親が扇で違うので、線と深さは **その星自身** の `parent_id` を見る。
  // 配列で返すのは下流 (深さ・木・線) が「前提の並び」で書かれているため。要素は高々 1。
  const prereqsOfNode = (node: SkillMapStageNode): string[] =>
    node.parent_id !== undefined && known.has(node.parent_id) && node.parent_id !== node.id
      ? [node.parent_id]
      : [];
```

`const edges: RadialEdge[] = [];` のループ内コメントに 1 行足す: `// 線は 1 星 (複製は 1 複製) につき親からの 1 本。前提が複数でも線は増えない。`

- [ ] **Step 5: home-path**

`apps/web/src/components/learner/home/home-path.ts` の `ancestorIdsOf` と `childrenOf` を:

```ts
/** `id` から親を根まで辿る (循環は seen で止める)。線 = 親なので、ホームの縦 1 本と一致する。 */
export function ancestorIdsOf(id: string, nodes: SkillMapStageNode[]): string[] {
  const byId = nodeById(nodes);
  const found: string[] = [];
  const seen = new Set<string>([id]);
  let current = byId.get(id)?.parent_id;
  while (current !== undefined && !seen.has(current)) {
    seen.add(current);
    found.push(current);
    current = byId.get(current)?.parent_id;
  }
  return found;
}

function childrenOf(id: string, nodes: SkillMapStageNode[]): SkillMapStageNode[] {
  return nodes.filter((node) => node.parent_id === id);
}
```

- [ ] **Step 6: 残りの使い手を潰す**

Run: `grep -rn "prerequisite_ids\|appearance_prerequisite_ids" apps/web/src`
Expected: 出力なし。あれば `parent_id` / `appearance_parent_ids` に置き換える。

- [ ] **Step 7: テストを通す**

Run: `bunx vitest run apps/web/src/components/learner`
Expected: PASS。

- [ ] **Step 8: 実アプリで目視**

`bun run dev:api` と `bun run dev` を起動し、`seed-learner` でスキルツリーを開く (JWT の作り方は AGENTS.md「Local login without Google OAuth」)。確認:
- `Claude Code 入門` に入る線が `Claude チャット入門` からの 1 本だけ
- `Claude Code 入門` を locked にした状態 (別の受講者 `seed-learner2` で `DEV_MODE=1` の開発者表示) で、ロック理由に `AI駆動開発の考え方 / Claude チャット入門` の両方が出る
- Git の複製が FE / BE で 1 本ずつ

- [ ] **Step 9: lint / typecheck / commit**

Run: `bun run lint && bun run typecheck`
Expected: exit 0。

```bash
git add apps/web/src/lib/skill-map-api.ts apps/web/src/components/learner/tree/radial-layout.ts apps/web/src/components/learner/tree/radial-layout.test.ts apps/web/src/components/learner/home/home-path.ts apps/web/src/components/learner/home/home-path.test.ts
git commit -m "スキルツリー: 線・深さ・ホームの経路を parent_id の 1 本にする

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: 文書と全体検証

**Files:**
- Modify: `AGENTS.md` (Key caveats のスキルツリーアイコンの項の直後)
- Modify: `docs/superpowers/specs/2026-08-30-skill-tree-parent-edge-design.md` (ステータス)

- [ ] **Step 1: AGENTS.md に 1 項目**

`**教材の画像:**` の段落の直後に追加:

```markdown
**スキルツリーの線と解放条件は別物:** 線・配置・霧の距離は `course.json` の `parent` 1 本 (前提が 1 つなら省略 = その前提、2 つ以上なら必須、`prerequisites` に含まれる slug)。解放は `prerequisites` 全部の AND のまま (線の無い前提はロック理由に名前で出る)。複製 (`appearancePrerequisites`) は扇ごとにちょうど 1 つ = その扇の親。経路は manifest → seed → D1 `stages.parent` → 評価器 `parentSlugOf` (null は前提の先頭) → API `parent_id` / `appearance_parent_ids` → `radial-layout.ts` / `home-path.ts`。`prerequisite_ids` は廃止。設計は `docs/superpowers/specs/2026-08-30-skill-tree-parent-edge-design.md`。
```

- [ ] **Step 2: spec のステータス**

`ステータス: 承認済み (実装前)` → `ステータス: 実装済み`。

- [ ] **Step 3: 全体検証**

Run: `bun run typecheck && bun run lint && bun run test && bun run content:check`
Expected: 全部 exit 0。テスト件数が Task 1〜5 で足した分だけ増えている。

- [ ] **Step 4: commit**

```bash
git add AGENTS.md docs/superpowers/specs/2026-08-30-skill-tree-parent-edge-design.md docs/superpowers/plans/2026-08-30-skill-tree-parent-edge.md
git commit -m "docs: スキルツリーの parent (線 1 本) の設計・計画と AGENTS.md

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
