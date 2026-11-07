import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTaskManifest } from "../../shared/src/tasks/manifest.js";
import { readEnvironment } from "./task-content.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const definition = (id: string) =>
  JSON.parse(readFileSync(join(root, "environments", `${id}.json`), "utf8"));

describe("M01 の環境診断の版", () => {
  it.each(["diagnose-node-01", "diagnose-git-01"])(
    "%s は後続の Node.js・npm と同じ要件で、テンプレートなしで配布できる",
    (id) => {
      const raw = definition(id);
      const environment = readEnvironment(root, id);
      const node = readEnvironment(root, "node-test-01");
      expect(environment.node).toEqual(node.node);
      expect(environment.npm).toEqual(node.npm);
      expect(raw.runner).toBe("env-diagnose");
      expect(raw.template).toBeUndefined();
      const parsed = parseTaskManifest({
        schemaVersion: 1,
        id: "dev-env-basics/u05-terminal/q01",
        title: "環境を確かめる",
        kind: "basic",
        runner: raw.runner,
        submit: { files: [] },
        environment,
      });
      expect(parsed.ok).toBe(true);
    },
  );

  it("U05 は Git を求めず、U06 は ci-deploy と同じ Git を求める", () => {
    expect(readEnvironment(root, "diagnose-node-01").git).toBeUndefined();
    expect(readEnvironment(root, "diagnose-git-01").git).toEqual(
      readEnvironment(root, "ci-deploy-01").git,
    );
  });
});
