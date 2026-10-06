import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertTaskRules,
  type CodingRule,
  parseCodingRules,
  readCodingRules,
} from "./coding-rules.js";
import { buildContentManifest } from "./manifest.js";
import { parseTaskDefinition } from "./task-schema.js";

const content = join(dirname(fileURLToPath(import.meta.url)), "..");
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const rule = (id: string, introducedIn: string) =>
  `## ${id} 名前\n\n- 規則: ${id} の確かめられる文。\n- 対象: すべて\n- 導入: ${introducedIn}\n`;

function fixture(common: string, course = "") {
  const root = mkdtempSync(join(tmpdir(), "stella-rules-"));
  roots.push(root);
  mkdirSync(join(root, "courses"));
  cpSync(join(content, "courses/dev-env-basics"), join(root, "courses/dev-env-basics"), {
    recursive: true,
  });
  mkdirSync(join(root, "courses/javascript-basics"));
  writeFileSync(
    join(root, "courses/javascript-basics/course.json"),
    JSON.stringify({ title: "JS", prerequisites: ["dev-env-basics"] }),
  );
  for (const name of ["skills.json", "patterns.json", "environments", "sources"])
    cpSync(join(content, name), join(root, name), { recursive: true });
  writeFileSync(join(root, "coding-rules.md"), `# 共通\n\n説明\n\n${common}`);
  writeFileSync(join(root, "courses/dev-env-basics/coding-rules.md"), course);
  return root;
}
function setTaskRules(root: string, rules: unknown) {
  const file = join(
    root,
    "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page/task.json",
  );
  const task = JSON.parse(readFileSync(file, "utf8"));
  task.review.rules = rules;
  writeFileSync(file, JSON.stringify(task));
}

describe("コーディング規則の正本", () => {
  it("リポジトリの共通の規則と講座の規則を読み、ID と内容ハッシュを付ける", () => {
    const rules = readCodingRules(content);
    expect(rules.length).toBeGreaterThan(5);
    expect(rules.filter((r) => r.scope === "common").every((r) => r.id.startsWith("CR-"))).toBe(
      true,
    );
    expect(rules.find((r) => r.id === "DEV-HTML-01")).toMatchObject({ scope: "dev-env-basics" });
    for (const r of rules) {
      expect(r.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(r.statement.length).toBeGreaterThan(10);
    }
  });
  it("本文を変えると内容ハッシュが変わり、説明の段落は規則に含めない", () => {
    const [a] = parseCodingRules(`前書き\n\n${rule("CR-A-01", "dev-env-basics")}`, "common", "x");
    const [b] = parseCodingRules(
      rule("CR-A-01", "dev-env-basics").replace("文。", "文!"),
      "common",
      "x",
    );
    expect(a?.contentHash).not.toBe(b?.contentHash);
  });
  it.each([
    ["## cr-a-01 小文字\n", "見出し"],
    ["## CR-A-01 欠け\n\n- 規則: 文\n- 対象: すべて\n", "導入"],
    [`${rule("CR-A-01", "x")}\n本文の段落\n`, "箇条書き"],
    ["## CR-A-01 重複\n\n- 規則: 文\n- 規則: 文\n- 対象: a\n- 導入: b\n", "重複"],
  ])("書式の誤りを場所付きで止める (%#)", (markdown, message) => {
    expect(() => parseCodingRules(markdown, "common", "coding-rules.md")).toThrow(message);
  });
  it("ID の重複・接頭辞・存在しない導入先を止める", () => {
    expect(() =>
      readCodingRules(
        fixture(rule("CR-A-01", "dev-env-basics") + rule("CR-A-01", "dev-env-basics")),
      ),
    ).toThrow("重複");
    expect(() => readCodingRules(fixture(rule("DEV-A-01", "dev-env-basics")))).toThrow("CR-");
    expect(() => readCodingRules(fixture("", rule("CR-A-01", "dev-env-basics")))).toThrow("CR-");
    expect(() => readCodingRules(fixture(rule("CR-A-01", "missing-course")))).toThrow("導入");
    expect(() => readCodingRules(fixture(rule("CR-A-01", "dev-env-basics/m9-none")))).toThrow(
      "単元",
    );
    expect(() => readCodingRules(fixture("", rule("DEV-A-01", "javascript-basics")))).toThrow(
      "その講座",
    );
  });
});

describe("課題が指す規則", () => {
  const rules: CodingRule[] = [
    ...parseCodingRules(
      rule("CR-EARLY-01", "dev-env-basics/m1-b") + rule("CR-JS-01", "javascript-basics"),
      "common",
      "x",
    ),
    ...parseCodingRules(rule("REACT-A-01", "react-basics"), "react-basics", "y"),
  ];
  const prerequisites: Record<string, string[]> = {
    "javascript-basics": ["dev-env-basics"],
    "react-basics": ["javascript-basics"],
  };
  const check =
    (courseId: string, unitId: string, refs: { id: string; required: boolean }[]) => () =>
      assertTaskRules(
        { id: "t", courseId, unitId, rules: refs },
        rules,
        (s) => prerequisites[s] ?? [],
      );
  it("前提の講座で導入した規則と、同じ講座の前の単元で導入した規則を必須にできる", () => {
    expect(check("react-basics", "m0", [{ id: "CR-JS-01", required: true }])).not.toThrow();
    expect(check("dev-env-basics", "m2-c", [{ id: "CR-EARLY-01", required: true }])).not.toThrow();
    expect(check("dev-env-basics", "m1-b", [{ id: "CR-EARLY-01", required: true }])).not.toThrow();
  });
  it("未習の規則は必須にせず、任意でだけ指せる", () => {
    expect(check("dev-env-basics", "m0-a", [{ id: "CR-EARLY-01", required: true }])).toThrow(
      "未習",
    );
    expect(check("dev-env-basics", "m0-a", [{ id: "CR-JS-01", required: true }])).toThrow("未習");
    expect(check("dev-env-basics", "m0-a", [{ id: "CR-JS-01", required: false }])).not.toThrow();
  });
  it("未知の規則と、別の講座の追加規則は指せない", () => {
    expect(check("react-basics", "m0", [{ id: "CR-NONE-01", required: false }])).toThrow("未知");
    expect(check("javascript-basics", "m0", [{ id: "REACT-A-01", required: false }])).toThrow(
      "別の講座",
    );
  });
  it("教材の読み込みで、課題の review.rules を確かめる", () => {
    const ok = fixture(
      rule("CR-A-01", "dev-env-basics/m0-first-page"),
      rule("DEV-A-01", "dev-env-basics"),
    );
    setTaskRules(ok, [
      { id: "CR-A-01", required: true },
      { id: "DEV-A-01", required: false },
    ]);
    const manifest = buildContentManifest(join(ok, "courses"));
    expect(manifest.codingRules.map((r) => r.id)).toEqual(["CR-A-01", "DEV-A-01"]);
    expect(manifest.tasks[0]?.definition.review.rules).toEqual([
      { id: "CR-A-01", required: true },
      { id: "DEV-A-01", required: false },
    ]);
    const later = fixture(rule("CR-A-01", "javascript-basics"));
    setTaskRules(later, [{ id: "CR-A-01", required: true }]);
    expect(() => buildContentManifest(join(later, "courses"))).toThrow("未習");
  });
});

describe("task.json の review", () => {
  const raw = JSON.parse(
    readFileSync(
      join(content, "courses/dev-env-basics/modules/m0-first-page/tasks/q01-first-page/task.json"),
      "utf8",
    ),
  );
  const parse = (review: object) => () =>
    parseTaskDefinition({ ...raw, review: { ...raw.review, ...review } }, {});
  it("規則を書かない課題の定義は変えない (内容ハッシュを保つ)", () => {
    expect(parseTaskDefinition(raw, {}).review).not.toHaveProperty("rules");
  });
  it("規則だけで必須項目をそろえられる", () => {
    expect(parse({ rubric: [], rules: [{ id: "CR-A-01", required: true }] })).not.toThrow();
    expect(parse({ rubric: [], rules: [{ id: "CR-A-01", required: false }] })).toThrow("必須");
  });
  it("尺度や問いのルーブリック・未知の追加条件・規則と同じ ID を止める", () => {
    expect(
      parse({ rubric: [{ id: "r", criterion: "読みやすさを1〜5で採点する", required: true }] }),
    ).toThrow("尺度");
    expect(parse({ rubric: [{ id: "r", criterion: "見出しは適切か？", required: true }] })).toThrow(
      "尺度",
    );
    expect(parse({ escalateWhen: ["always"] })).toThrow("escalateWhen");
    expect(parse({ escalateWhen: ["major-finding"] })).not.toThrow();
    expect(
      parse({
        rules: [{ id: "heading", required: true }],
      }),
    ).toThrow("規則の ID");
  });
});
