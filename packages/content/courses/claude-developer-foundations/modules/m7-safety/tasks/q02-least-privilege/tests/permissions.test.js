import { describe, expect, test } from "vitest";
import { permissionsFor } from "../src/permissions.js";

describe("permissionsFor", () => {
  test("読むだけの作業は、読むツールだけを許可し、Bash を消す", () => {
    expect(permissionsFor({ jobs: ["read"] })).toEqual({
      allowedTools: ["Read", "Grep", "Glob"],
      disallowedTools: ["Bash"],
      permissionMode: "dontAsk",
    });
  });

  test("複数の作業のツールを、重ねずに最初に出た順で並べる", () => {
    expect(permissionsFor({ jobs: ["read", "edit"] }).allowedTools).toEqual([
      "Read",
      "Grep",
      "Glob",
      "Edit",
    ]);
  });

  test("テストを走らせる作業では、npm test だけを許可し、Bash を消さない", () => {
    const result = permissionsFor({ jobs: ["edit", "test"] });
    expect(result.allowedTools).toEqual([
      "Read",
      "Grep",
      "Glob",
      "Edit",
      "Bash(npm test)",
    ]);
    expect(result.allowedTools).not.toContain("Bash");
    expect(result.disallowedTools).toEqual([]);
  });

  test("MCP のツールを mcp__サーバー名__ツール名 で 1 つずつ許可する", () => {
    expect(
      permissionsFor({
        jobs: ["read"],
        mcp: { github: ["list_issues", "get_issue"] },
      }).allowedTools,
    ).toEqual([
      "Read",
      "Grep",
      "Glob",
      "mcp__github__list_issues",
      "mcp__github__get_issue",
    ]);
  });

  test("サーバー名の . と空白は _ にする", () => {
    const { allowedTools } = permissionsFor({
      jobs: ["read"],
      mcp: { "my.server": ["search"], "team docs": ["read_page"] },
    });
    expect(allowedTools).toContain("mcp__my_server__search");
    expect(allowedTools).toContain("mcp__team_docs__read_page");
  });

  test("MCP のツールに * を使う許可は、エラーにする", () => {
    expect(() =>
      permissionsFor({ jobs: ["read"], mcp: { github: ["*"] } }),
    ).toThrow(/github/);
    expect(() =>
      permissionsFor({ jobs: ["read"], mcp: { github: ["get_*"] } }),
    ).toThrow(/github/);
  });

  test("ツールを書いていない MCP サーバーは、エラーにする", () => {
    expect(() =>
      permissionsFor({ jobs: ["read"], mcp: { github: [] } }),
    ).toThrow(/github/);
  });

  test("知らない作業の種類は、エラーにする", () => {
    expect(() => permissionsFor({ jobs: ["read", "deploy"] })).toThrow(
      /deploy/,
    );
  });

  test("作業の種類がなければ、エラーにする", () => {
    expect(() => permissionsFor({ jobs: [] })).toThrow();
  });

  test("確認を外すモードや、何でも許す決まりを使わない", () => {
    const result = permissionsFor({
      jobs: ["read", "edit", "test"],
      mcp: { github: ["list_issues"] },
    });
    expect(result.permissionMode).not.toBe("bypassPermissions");
    expect(result.allowedTools.some((tool) => tool.includes("*"))).toBe(false);
  });

  test("受け取った設定を書き換えない", () => {
    const task = { jobs: ["read"], mcp: { github: ["list_issues"] } };
    const copy = structuredClone(task);
    permissionsFor(task);
    expect(task).toEqual(copy);
  });
});
