import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  checkToolVersion,
  formatVersion,
  parseVersion,
  type ToolRequirement,
  type Version,
  validateEnvironmentRequirement,
} from "@stella/shared/tasks/environment";
import { isSafeRelativePattern, parseTaskManifest } from "@stella/shared/tasks/manifest";
import { RUNNERS } from "@stella/shared/tasks/runners";
import { describe, expect, it } from "vitest";
import {
  readEnvironmentFile,
  readJson,
  readTaskFields,
  TEMPLATE_RUNNERS,
  TEMPLATES_DIR,
  templateFile,
  templateFiles,
  templateManifest,
} from "../testing/templates.js";
import { satisfiesRange } from "../testing/semver-range.js";
import { matchPatterns } from "./files.js";
import { requiredPackages } from "./steps.js";

/**
 * 教材の runner ごとの課題テンプレート (`packages/content/templates/runners/<runner>/`) が、
 * 拡張の固定の手順 (steps.ts) と食い違わないこと。
 *
 * テンプレートの中身を実際に npm ci して動かす確認は、ネットワークが要るので手で行う
 * (packages/content/templates/runners/README.md)。ここでは定義と lockfile の形を確かめる。
 */

const REGISTRY = "https://registry.npmjs.org/";
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface LockEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  optional?: boolean;
  engines?: { node?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

describe("runner ごとの課題テンプレート", () => {
  it("フォルダーの一覧が、テンプレートを用意した runner と一致する", async () => {
    const entries = await readdir(TEMPLATES_DIR, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    expect(dirs.sort()).toEqual([...TEMPLATE_RUNNERS].sort());
  });

  describe.each(TEMPLATE_RUNNERS)("%s", (runner) => {
    const dir = path.join(TEMPLATES_DIR, runner);

    it("task-fields.json が、課題の定義として正しい", async () => {
      const fields = await readTaskFields(runner);
      expect(fields.runner).toBe(runner);
      const parsed = parseTaskManifest(await templateManifest(runner));
      expect(parsed.ok ? [] : parsed.errors).toEqual([]);
    });

    it("提出・配布のパターンが、テンプレートのファイルに当たる", async () => {
      const fields = await readTaskFields(runner);
      const files = await templateFiles(runner);
      expect(matchPatterns(files, fields.submit.files).unmatched).toEqual([]);
      expect(matchPatterns(files, fields.protected).unmatched).toEqual([]);
      // 道具の版・設定・テストを書き換えて通したことに、提出時に気づけるようにする。
      const prot = matchPatterns(files, fields.protected).files;
      for (const required of ["package.json", "package-lock.json", "eslint.config.js"]) {
        expect(prot).toContain(required);
      }
      expect(prot.some((file) => file.startsWith("tests/"))).toBe(true);
      // 提出ファイルと配布ファイルは重ならない。
      const submit = matchPatterns(files, fields.submit.files).files;
      expect(submit.filter((file) => prot.includes(file))).toEqual([]);
    });

    it("配布できるファイル名だけで、依存パッケージや拡張の作業フォルダーを含まない", async () => {
      for (const file of await templateFiles(runner)) {
        expect(isSafeRelativePattern(file), file).toBe(true);
        // macOS の濁点の正規化 (NFD) で提出の glob と食い違わないよう、ASCII に限る。
        expect(/^[\x20-\x7e]+$/.test(file), file).toBe(true);
        expect(
          file.split("/").some((s) => ["node_modules", ".stella", "private"].includes(s)),
        ).toBe(false);
      }
    });

    it("手順が使う道具を、固定の版で持つ", async () => {
      const pkg = await readJson<PackageJson>(path.join(dir, "starter", "package.json"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(deps)) {
        expect(version, name).toMatch(EXACT_VERSION);
      }
      // lint・整形をする課題にも使えるよう、両方をした場合に要る道具を確かめる。
      const manifest = parseTaskManifest(
        await templateManifest(runner, { checks: { lint: true, format: true } }),
      );
      if (!manifest.ok) throw new Error(manifest.errors.join("\n"));
      expect(Object.keys(deps)).toEqual(
        expect.arrayContaining(requiredPackages(manifest.manifest)),
      );
    });

    it("手順に合う設定ファイルがあり、結果の出力形式を決めていない", async () => {
      const files = await templateFiles(runner);
      const plan = RUNNERS[runner].plan;
      const configs =
        plan === "vitest"
          ? files.filter((f) => f === "vitest.config.js" || f === "vite.config.js")
          : files.filter((f) => f === "playwright.config.js");
      expect(configs).toHaveLength(1);
      const config = await readFile(templateFile(runner, configs[0] as string), "utf8");
      if (plan === "vitest") expect(config).toContain("test:");
      // 出力形式と出力先は拡張が引数で決める。設定で上書きすると結果を読めなくなる。
      expect(config).not.toMatch(/reporters?\s*:|outputFile|outputDir\s*:/);
    });

    it("lockfile が package.json と一致し、公開レジストリの固定の版だけを指す", async () => {
      const pkg = await readJson<PackageJson>(path.join(dir, "starter", "package.json"));
      const lock = await readJson<{ lockfileVersion: number; packages: Record<string, LockEntry> }>(
        path.join(dir, "starter", "package-lock.json"),
      );
      expect(lock.lockfileVersion).toBe(3);
      const rootEntry = lock.packages[""] ?? {};
      expect(rootEntry.dependencies ?? {}).toEqual(pkg.dependencies ?? {});
      expect(rootEntry.devDependencies ?? {}).toEqual(pkg.devDependencies ?? {});
      for (const [key, entry] of Object.entries(lock.packages)) {
        if (key === "") continue;
        expect(entry.link, key).toBeUndefined();
        expect(entry.resolved?.startsWith(REGISTRY), key).toBe(true);
        expect(entry.integrity?.startsWith("sha512-"), key).toBe(true);
      }
      // 入れた版が package.json の版と同じ (lockfile を作り直し忘れていない)。
      for (const [name, version] of Object.entries({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      })) {
        expect(lock.packages[`node_modules/${name}`]?.version, name).toBe(version);
      }
    });

    it("lockfile に、ほかの OS 用の任意の依存 (Windows・macOS のネイティブ部品) もそろっている", async () => {
      const lock = await readJson<{ packages: Record<string, LockEntry> }>(
        path.join(dir, "starter", "package-lock.json"),
      );
      const keys = new Set(Object.keys(lock.packages));
      const missing: string[] = [];
      for (const [key, entry] of Object.entries(lock.packages)) {
        for (const name of Object.keys(entry.optionalDependencies ?? {})) {
          // npm と同じく、自分の node_modules から上へたどって探す。
          const segments = key.split("/node_modules/");
          let found = false;
          for (let i = segments.length; i >= 0 && !found; i--) {
            const base = segments.slice(0, i).join("/node_modules/");
            found = keys.has(base ? `${base}/node_modules/${name}` : `node_modules/${name}`);
          }
          if (!found) missing.push(`${key} → ${name}`);
        }
      }
      expect(missing).toEqual([]);
    });

    it("整形の設定が Windows の改行 (CRLF) を受け入れ、lockfile と課題の定義を整形しない", async () => {
      const prettierrc = await readJson<{ endOfLine?: string }>(
        path.join(dir, "starter", ".prettierrc.json"),
      );
      expect(prettierrc.endOfLine).toBe("auto");
      const ignore = (await readFile(path.join(dir, "starter", ".prettierignore"), "utf8")).split(
        /\r?\n/,
      );
      expect(ignore).toEqual(expect.arrayContaining(["package-lock.json", ".stella/"]));
    });

    it("環境台帳が、テンプレートの道具の版と Node.js・npm の要件を記録している", async () => {
      const fields = await readTaskFields(runner);
      const env = await readEnvironmentFile(fields.environment);
      expect(env.id).toBe(fields.environment);
      expect(env.runner).toBe(runner);
      expect(env.template).toBe(`templates/runners/${runner}`);
      expect(validateEnvironmentRequirement(env.requirements, env.id)).toEqual([]);
      expect(env.requirements).toHaveProperty("node.min");
      const pkg = await readJson<PackageJson>(path.join(dir, "starter", "package.json"));
      expect(env.libraries).toEqual({ ...pkg.dependencies, ...pkg.devDependencies });
    });

    it("環境台帳の Node.js の要件が通す版は、lockfile のどの依存の engines も満たす", async () => {
      const env = await readEnvironmentFile((await readTaskFields(runner)).environment);
      const node = env.requirements.node as ToolRequirement;
      const lock = await readJson<{ packages: Record<string, LockEntry> }>(
        path.join(dir, "starter", "package-lock.json"),
      );
      // 他の OS 用の任意の依存は、合わなければ npm が入れずに飛ばすので除く。
      const ranges = Object.entries(lock.packages).flatMap(([key, entry]) =>
        entry.engines?.node && !entry.optional ? [[key, entry.engines.node] as const] : [],
      );
      // 各 major の最初と最後の版、よく境目になる minor、要件の min ちょうどを試す。
      const probes: Version[] = [];
      for (let major = 16; major <= 30; major++) {
        probes.push([major, 0, 0], [major, 12, 0], [major, 13, 0], [major, 999, 999]);
      }
      const min = node.min ? parseVersion(node.min) : null;
      if (min) probes.push(min);
      const accepted = probes.filter((v) => checkToolVersion(`v${formatVersion(v)}`, node).ok);
      expect(accepted.length).toBeGreaterThan(0);
      const problems = accepted.flatMap((v) =>
        ranges
          .filter(([, range]) => !satisfiesRange(v, range))
          .map(([key, range]) => `Node.js ${formatVersion(v)}: ${key} は ${range}`),
      );
      expect(problems).toEqual([]);
    });

    it("Node.js は 22.13 以上の 22 系と 24 系だけを通す (23 などの奇数版は通さない)", async () => {
      const env = await readEnvironmentFile((await readTaskFields(runner)).environment);
      const node = env.requirements.node as ToolRequirement;
      for (const version of ["v22.13.0", "v22.22.0", "v24.0.0", "v24.11.1"]) {
        expect(checkToolVersion(version, node).ok, version).toBe(true);
      }
      for (const version of ["v20.19.0", "v22.12.0", "v23.0.0", "v23.11.0", "v25.0.0", "v26.0.0"]) {
        expect(checkToolVersion(version, node).ok, version).toBe(false);
      }
    });
  });
});
