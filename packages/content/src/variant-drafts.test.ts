import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allocateVariantNames,
  draftTemplateParams,
  draftVariantFiles,
  estimateDrafts,
  MAX_DRAFTS_PER_RUN,
  MAX_FULL_DRAFTS_PER_REQUEST,
  planDrafts,
  slugOf,
  unitNamesOf,
} from "./variant-drafts.js";

const empty = { names: [], remedial: 0, check: 0 };

describe("何を何問作るか", () => {
  it("種別を省けば、補習 3 問・確認用 3 問に足りない分を作る", () => {
    expect(planDrafts(empty, [], {})).toEqual([
      { kind: "basic", count: 3, template: null },
      { kind: "independent", count: 3, template: null },
    ]);
    expect(planDrafts({ names: [], remedial: 2, check: 3 }, [], {})).toEqual([
      { kind: "basic", count: 1, template: null },
    ]);
    expect(planDrafts({ names: [], remedial: 3, check: 4 }, [], {})).toEqual([]);
  });

  it("同じ種別のテンプレートがあれば、値だけを作らせる", () => {
    expect(planDrafts(empty, [{ name: "heading", kind: "independent" }], {})).toEqual([
      { kind: "basic", count: 3, template: null },
      { kind: "independent", count: 3, template: "heading" },
    ]);
  });

  it("丸ごと作る類題は、応答の上限に収まるよう依頼を分ける (テンプレートの値は分けない)", () => {
    expect(MAX_FULL_DRAFTS_PER_REQUEST).toBe(4);
    expect(planDrafts(empty, [], { kind: "debug", count: 10 })).toEqual([
      { kind: "debug", count: 4, template: null },
      { kind: "debug", count: 4, template: null },
      { kind: "debug", count: 2, template: null },
    ]);
    expect(planDrafts(empty, [{ name: "t", kind: "debug" }], { kind: "debug", count: 10 })).toEqual(
      [{ kind: "debug", count: 10, template: "t" }],
    );
  });

  it("種別と数を指定できる。数だけ・類題にできない種別・上限を超える数は止める", () => {
    expect(planDrafts(empty, [], { kind: "debug", count: 2 })).toEqual([
      { kind: "debug", count: 2, template: null },
    ]);
    // 数を省けばその区分の不足分 (不足が無ければ 1 問)。
    expect(planDrafts({ names: [], remedial: 3, check: 3 }, [], { kind: "basic" })).toEqual([
      { kind: "basic", count: 1, template: null },
    ]);
    expect(() => planDrafts(empty, [], { count: 2 })).toThrow(/--kind と一緒/);
    expect(() => planDrafts(empty, [], { kind: "integration" })).toThrow(/類題の kind/);
    expect(() => planDrafts(empty, [], { kind: "basic", count: 0 })).toThrow(/1 以上/);
    expect(() => planDrafts(empty, [], { kind: "basic", count: MAX_DRAFTS_PER_RUN + 1 })).toThrow(
      /20 問まで/,
    );
  });
});

describe("類題の名前", () => {
  it("短い名前をフォルダー名に使える形にし、使っている番号の次から振る", () => {
    expect(slugOf("Profile Page!")).toBe("profile-page");
    expect(slugOf("じこしょうかい")).toBe("variant");
    // 固定した開始点と取り違える名前にしない。
    expect(slugOf("fixed-start")).toBe("fixed-start-variant");
    expect(slugOf("Form fixed start")).toBe("form-fixed-start-variant");
    expect(allocateVariantNames([], ["fixed-start"])).toEqual(["v01-fixed-start-variant"]);
    expect(allocateVariantNames(["v01-a", "v07-b", "q01-first-page"], ["x", "Y z"])).toEqual([
      "v08-x",
      "v09-y-z",
    ]);
    expect(allocateVariantNames([], ["a", "a"])).toEqual(["v01-a", "v02-a"]);
  });
});

describe("単元の中の名前", () => {
  it("同じ単元のほかの課題と、その類題の名前も集める (類題の ID は単元の中で一意)", () => {
    const root = mkdtempSync(join(tmpdir(), "stella-unit-names-"));
    try {
      const tasks = join(root, "tasks");
      mkdirSync(join(tasks, "q01-a/private/variants/v01-x"), { recursive: true });
      mkdirSync(join(tasks, "q02-b/private/variants/v02-y"), { recursive: true });
      expect(unitNamesOf(join(tasks, "q01-a")).sort()).toEqual([
        "q01-a",
        "q02-b",
        "v01-x",
        "v02-y",
      ]);
      expect(allocateVariantNames(unitNamesOf(join(tasks, "q01-a")), ["z"])).toEqual(["v03-z"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("下書きのファイル", () => {
  const context = {
    id: "c/u/v01-a",
    pattern: "html-page",
    kind: "basic" as const,
    parentConfig: { "package.json": Buffer.from('{"name":"parent"}') },
    mutants: true,
  };
  const complete = [
    { path: "task.json", content: '{"id":"wrong","kind":"debug","title":"t"}' },
    { path: "README.md", content: "# 課題" },
    { path: "hints.md", content: "" },
    { path: "starter/index.html", content: "<h1></h1>" },
    { path: "tests/README.md", content: "# 検査" },
    { path: "private/solution/index.html", content: "<h1>見出し</h1>" },
    { path: "private/explanation.md", content: "解説" },
    { path: "private/review.md", content: "観点" },
    { path: "private/mutants/m01/index.html", content: "<h1>違う</h1>" },
  ];

  it("id・pattern・kind をそろえ、親の設定ファイルを写す", () => {
    const { files, errors } = draftVariantFiles(
      [...complete, { path: "starter/package.json", content: '{"name":"ai"}' }],
      context,
    );
    expect(errors).toEqual([]);
    expect(JSON.parse(files["task.json"]?.toString() ?? "")).toEqual({
      id: "c/u/v01-a",
      kind: "basic",
      pattern: "html-page",
      title: "t",
    });
    // 設定ファイルは AI が出しても親のものにする。
    expect(files["starter/package.json"]?.toString()).toBe('{"name":"parent"}');
  });

  it("誤答を手元で確かめられない runner では、誤答を求めず、置けば理由を返す", () => {
    const without = complete.filter((f) => !f.path.startsWith("private/mutants/"));
    expect(draftVariantFiles(without, { ...context, mutants: false }).errors).toEqual([]);
    expect(draftVariantFiles(complete, { ...context, mutants: false }).errors).toEqual([
      expect.stringContaining("private/mutants/m01/index.html は置けません"),
    ]);
  });

  it("解答例・誤答で設定ファイルを差し替えさせない (依存の取得に使うため)", () => {
    const { errors } = draftVariantFiles(
      [
        ...complete,
        { path: "private/solution/package.json", content: "{}" },
        { path: "private/mutants/m01/eslint.config.js", content: "" },
      ],
      context,
    );
    expect(errors).toEqual([
      "private/solution/package.json は置けません。設定ファイルは親の課題のものを使います",
      "private/mutants/m01/eslint.config.js は置けません。設定ファイルは親の課題のものを使います",
    ]);
  });

  it("置けない場所・不正なパス・欠け・壊れた task.json を理由として返す", () => {
    const { errors } = draftVariantFiles(
      [
        ...complete.filter((f) => !f.path.startsWith("private/mutants/") && f.path !== "hints.md"),
        { path: "../escape.txt", content: "x" },
        { path: "fixed-start/index.html", content: "x" },
        { path: "task.json", content: "{" },
      ],
      { ...context, parentConfig: {} },
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("パスが不正"),
        expect.stringContaining("fixed-start/index.html は置けません"),
        expect.stringContaining("同じパスのファイルが 2 つ"),
        "hints.md がありません",
        "private/mutants/ にファイルがありません",
      ]),
    );
  });
});

describe("テンプレートの値", () => {
  const existing = [{ name: "v01-a", values: { heading: "見出し", count: 3, strict: true } }];

  it("キーを既存の組とそろえ、数・真偽値に直す", () => {
    expect(
      draftTemplateParams(
        {
          slug: "b",
          values: [
            { key: "heading", value: "別の見出し" },
            { key: "count", value: "5" },
            { key: "strict", value: "false" },
          ],
        },
        "v02-b",
        existing,
      ),
    ).toEqual({
      params: { name: "v02-b", values: { heading: "別の見出し", count: 5, strict: false } },
      errors: [],
    });
  });

  it("既存と同じ値の組は別の名前でも通さない", () => {
    expect(
      draftTemplateParams(
        {
          slug: "b",
          values: [
            { key: "heading", value: "見出し" },
            { key: "count", value: "3" },
            { key: "strict", value: "true" },
          ],
        },
        "v02-b",
        existing,
      ),
    ).toEqual({ params: null, errors: ["v01-a と同じ値の組です。別の問題になる値にしてください"] });
  });

  it("足りないキー・知らないキー・型の合わない値を理由として返す", () => {
    const { params, errors } = draftTemplateParams(
      {
        slug: "b",
        values: [
          { key: "heading", value: "x" },
          { key: "count", value: "多い" },
          { key: "extra", value: "1" },
        ],
      },
      "v02-b",
      existing,
    );
    expect(params).toBeNull();
    expect(errors).toEqual([
      "テンプレートに無いキーです: extra",
      "キー count は数にしてください: 多い",
      "キー strict の値がありません",
    ]);
  });
});

describe("見積もり", () => {
  it("料金を知っているモデルは直しなしと最大を出し、Batch は最初の依頼を半額にする", () => {
    const requests = [{ inputTokens: 20_000, count: 2, mode: "full" as const }];
    const usual = estimateDrafts("claude-opus-5-5", requests, { batch: false });
    // 入力 20,000 × $4 + 出力 24,000 × $20 (100 万トークンあたり)。
    expect(usual.usual).toBeCloseTo(0.08 + 0.48);
    expect(usual.worst).toBeGreaterThan(usual.usual ?? 0);
    const batch = estimateDrafts("claude-opus-5-5", requests, { batch: true });
    expect(batch.usual).toBeCloseTo((0.08 + 0.48) / 2);
    expect(estimateDrafts("unknown-model", requests, { batch: false })).toMatchObject({
      inputTokens: 20_000,
      usual: null,
      worst: null,
    });
  });
});
