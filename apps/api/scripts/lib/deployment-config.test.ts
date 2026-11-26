import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkDeploymentConfig,
  deployment,
  parseWrangler,
  requireDeploymentInputs,
  validateReviewDeployment,
  validateDeploymentConfig,
  workflowSettingNames,
  type WranglerConfig,
} from "./deployment-config.js";

const root = resolve(import.meta.dirname, "../../../..");
const workflow = readFileSync(resolve(root, ".github/workflows/deploy.yml"), "utf8");
const paths = ["apps/api/wrangler.toml", "apps/web/wrangler.toml"];
const configs = () =>
  Object.fromEntries(
    paths.map((path) => [path, parseWrangler(readFileSync(resolve(root, path), "utf8"), path)]),
  );

describe("deployment configuration contract", () => {
  it("checks the actual workflow and every Wrangler configuration without credentials", () => {
    expect(() => checkDeploymentConfig(root)).not.toThrow();
    expect(() => validateDeploymentConfig(workflow, configs(), deployment.accountId)).not.toThrow();
    expect(api(configs()).kv_namespaces).toEqual([
      { binding: "OAUTH_KV", id: "ffc7f0cc15fa4c8290fd9cc4e665371b" },
    ]);
  });

  it("recognizes literal bracket names and ignores comments", () => {
    const names = workflowSettingNames(`
# unused: \${{ secrets.NOT_A_SETTING }}
env:
  A: \${{ vars['URL'] }}
  B: \${{ secrets.TOKEN }}
  C: \${{ secrets.TOKEN }}
`);
    expect([...names.variables]).toEqual(["URL"]);
    expect([...names.secrets]).toEqual(["TOKEN"]);
    // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions の式をそのまま渡すテスト
    expect(() => workflowSettingNames('env: { A: "${{ secrets[inputs.name] }}" }')).toThrow(
      /literal/,
    );
  });

  it("rejects a renamed Variable and a removed Secret reference", () => {
    expect(() =>
      validateDeploymentConfig(
        workflow.replaceAll("vars.VITE_MATERIALS_BASE_URL", "vars.VITE_MATERIALS_BASE_URL_TYPO"),
        configs(),
      ),
    ).toThrow(/VITE_MATERIALS_BASE_URL.*VITE_MATERIALS_BASE_URL_TYPO/);
    expect(() =>
      validateDeploymentConfig(
        workflow.replaceAll("secrets.ANTHROPIC_API_KEY", "'unused'"),
        configs(),
      ),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("requires the deployment account even if all Wrangler files agree with each other", () => {
    const changed = configs();
    for (const config of Object.values(changed)) config.account_id = "other-account";
    expect(() => validateDeploymentConfig(workflow, changed)).toThrow(/account_id/);
    expect(() => validateDeploymentConfig(workflow, configs(), "different-secret-value")).toThrow(
      /CLOUDFLARE_ACCOUNT_ID/,
    );
  });

  it("rejects an unpinned new Worker, environment account overrides and runtime account drift", () => {
    const fresh = configs();
    fresh["apps/new/wrangler.jsonc"] = {};
    expect(() => validateDeploymentConfig(workflow, fresh)).toThrow(/apps\/new/);
    const override = configs();
    override[paths[1]].env = { admin: { account_id: "other-account" } };
    expect(() => validateDeploymentConfig(workflow, override)).toThrow(/env.admin/);
    const runtime = configs();
    runtime[paths[0]].vars = { CLOUDFLARE_ACCOUNT_ID: "other-account" };
    expect(() => validateDeploymentConfig(workflow, runtime)).toThrow(
      /runtime CLOUDFLARE_ACCOUNT_ID/,
    );
  });

  const api = (all: Record<string, WranglerConfig>) => all["apps/api/wrangler.toml"];
  it.each(["database_name", "database_id"] as const)("rejects a mismatched D1 %s", (field) => {
    const all = configs();
    const db = api(all).d1_databases?.find((entry) => entry.binding === "DB");
    if (!db) throw new Error("missing fixture DB");
    db[field] = field === "database_id" ? "" : "wrong";
    expect(() => validateDeploymentConfig(workflow, all)).toThrow(/database/);
  });

  it("rejects duplicate DB bindings and anything left of the retired narrator", () => {
    const all = configs();
    const db = api(all).d1_databases?.find((entry) => entry.binding === "DB");
    if (!db) throw new Error("missing fixture DB");
    api(all).d1_databases?.push({ ...db });
    expect(() => validateDeploymentConfig(workflow, all)).toThrow(/exactly one DB/);
    const bound = configs();
    api(bound).services = [
      ...(api(bound).services ?? []),
      { binding: "NARRATOR", service: "stella-narrator", entrypoint: "Narrator" },
    ];
    expect(() => validateDeploymentConfig(workflow, bound)).toThrow(/NARRATOR/);
    const leftover = configs();
    leftover["apps/narrator/wrangler.jsonc"] = { account_id: deployment.accountId };
    expect(() => validateDeploymentConfig(workflow, leftover)).toThrow(/narrator was retired/);
  });

  it("parses JSONC comments and trailing commas and rejects malformed config", () => {
    expect(parseWrangler('{ /* comment */ "account_id": "account", }', "wrangler.jsonc")).toEqual({
      account_id: "account",
    });
    expect(() => parseWrangler('{ "account_id":', "wrangler.jsonc")).toThrow(/invalid/);
  });

  it("requires inputs before remote work but allows the optional OpenAI secret", () => {
    const env = Object.fromEntries(
      [...deployment.github.variables, ...deployment.github.secrets].map((name) => [
        name,
        "test-value",
      ]),
    );
    delete env.OPENAI_API_KEY;
    expect(() => requireDeploymentInputs(env)).not.toThrow();
    env.ANTHROPIC_API_KEY = " ";
    expect(() => requireDeploymentInputs(env)).toThrow(/ANTHROPIC_API_KEY/);
    try {
      requireDeploymentInputs(env);
    } catch (error) {
      expect(String(error)).not.toContain("test-value");
    }
  });

  it("OpenAI を選ぶデプロイではモデルと OpenAI の鍵をリモート処理前に検査する", () => {
    const config = { vars: { AI_REVIEW_PROVIDER: "openai", AI_REVIEW_MODEL: "selected-model" } };
    expect(() => validateReviewDeployment(config, { ANTHROPIC_API_KEY: "test-key" })).toThrow(
      /OPENAI_API_KEY/,
    );
    expect(() => validateReviewDeployment(config, { OPENAI_API_KEY: "test-key" })).not.toThrow();
    expect(() =>
      validateReviewDeployment(
        { vars: { AI_REVIEW_PROVIDER: "openai" } },
        { OPENAI_API_KEY: "test-key" },
      ),
    ).toThrow(/AI_REVIEW_MODEL/);
  });
});
