import { describe, expect, it } from "vitest";
import {
  ciCheckStatusFrom,
  ciCheckStatusOf,
  deployUrlProblem,
  githubRunApiPath,
  parseCiRunClaim,
  parseGithubRunUrl,
  runUrlProblem,
  safeHttpsHref,
} from "./ci-run.js";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

describe("parseGithubRunUrl", () => {
  it("実行の画面の URL から owner・repo・番号を取り出す", () => {
    expect(
      parseGithubRunUrl("https://github.com/yamada-t/web-deploy/actions/runs/123456789"),
    ).toEqual({ owner: "yamada-t", repo: "web-deploy", runId: "123456789" });
    // 大文字を含む owner・repo と、`.`・`_` を含む repo は GitHub で使える。
    expect(parseGithubRunUrl("https://github.com/Yamada/My_Site.v2/actions/runs/1")).toEqual({
      owner: "Yamada",
      repo: "My_Site.v2",
      runId: "1",
    });
  });

  it("形の違う・怪しい入力を受け付けない", () => {
    const base = "https://github.com/owner/repo/actions/runs/123";
    for (const url of [
      // 別のホスト・スキーム・大文字のホスト
      "https://gitlab.com/owner/repo/actions/runs/123",
      "https://github.com.evil.example/owner/repo/actions/runs/123",
      "https://evil.example/github.com/owner/repo/actions/runs/123",
      "http://github.com/owner/repo/actions/runs/123",
      "HTTPS://github.com/owner/repo/actions/runs/123",
      "https://GitHub.com/owner/repo/actions/runs/123",
      "https://api.github.com/repos/owner/repo/actions/runs/123",
      "https://www.github.com/owner/repo/actions/runs/123",
      // 利用者名・ポート
      "https://user@github.com/owner/repo/actions/runs/123",
      "https://github.com@evil.example/owner/repo/actions/runs/123",
      "https://github.com:443/owner/repo/actions/runs/123",
      "https://github.com:8080/owner/repo/actions/runs/123",
      // パストラバーサル・符号化
      "https://github.com/owner/../actions/runs/123",
      "https://github.com/owner/./actions/runs/123",
      "https://github.com/../repo/actions/runs/123",
      "https://github.com/owner/repo/actions/runs/../../../users/x",
      "https://github.com/owner/%2e%2e/actions/runs/123",
      "https://github.com/owner/repo%2Factions/actions/runs/123",
      // クエリ・フラグメント・末尾のスラッシュ・続き
      `${base}?check_suite_focus=true`,
      `${base}#summary`,
      `${base}/`,
      `${base}/job/456`,
      `${base}/attempts/2`,
      // 空白・改行
      ` ${base}`,
      `${base} `,
      `${base}\n`,
      // 番号
      "https://github.com/owner/repo/actions/runs/0",
      "https://github.com/owner/repo/actions/runs/0123",
      "https://github.com/owner/repo/actions/runs/-1",
      "https://github.com/owner/repo/actions/runs/1e5",
      "https://github.com/owner/repo/actions/runs/12345678901234567",
      "https://github.com/owner/repo/actions/runs/9999999999999999",
      // owner・repo の文字種と長さ
      "https://github.com/-owner/repo/actions/runs/1",
      "https://github.com/ow_ner/repo/actions/runs/1",
      `https://github.com/${"a".repeat(40)}/repo/actions/runs/1`,
      `https://github.com/owner/${"r".repeat(101)}/actions/runs/1`,
      "https://github.com/owner/re po/actions/runs/1",
      "https://github.com/owner/レポ/actions/runs/1",
      "",
      42,
      null,
    ]) {
      expect(parseGithubRunUrl(url), String(url)).toBeNull();
      expect(runUrlProblem(url), String(url)).not.toBeNull();
    }
  });

  it("ジョブの画面の URL には、実行の画面を案内する", () => {
    expect(runUrlProblem("https://github.com/o/r/actions/runs/1/job/2")).toContain("ジョブの画面");
    expect(runUrlProblem("https://github.com/o/r/actions/runs/1")).toBeNull();
  });

  it("API のパスは取り出した部品だけで組み立てる", () => {
    const ref = parseGithubRunUrl("https://github.com/owner/repo.site/actions/runs/42");
    expect(ref && githubRunApiPath(ref)).toBe("/repos/owner/repo.site/actions/runs/42");
  });
});

describe("deployUrlProblem", () => {
  it("https の公開のドメインを受け付ける", () => {
    for (const url of [
      "https://yamada.github.io/web-deploy/",
      "https://web-deploy.pages.dev",
      "https://example.com/path?x=1#top",
      "https://日本語.jp/",
    ]) {
      expect(deployUrlProblem(url), url).toBeNull();
    }
  });

  it("手元・IP アドレス・ポート・利用者名・http を受け付けない", () => {
    for (const url of [
      "http://example.com/",
      "HTTPS://example.com/",
      "javascript:alert(1)",
      "data:text/html,<p>x</p>",
      "https://localhost:3000/",
      "https://localhost/",
      "https://app.localhost/",
      "https://127.0.0.1/",
      "https://10.0.0.1/",
      "https://[::1]/",
      "https://example.com:8443/",
      "https://user:pass@example.com/",
      "https://intranet/",
      "https://example.com\\@evil.example/",
      "https://example.com/ a",
      "https://example.com/\u0000",
      `https://example.com/${"a".repeat(500)}`,
      "",
      undefined,
    ]) {
      expect(deployUrlProblem(url), String(url)).not.toBeNull();
    }
  });

  it("リンクにするのは https の URL だけ", () => {
    expect(safeHttpsHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHttpsHref("https://github.com/o/r/actions/runs/1")).toBe(
      "https://github.com/o/r/actions/runs/1",
    );
    expect(safeHttpsHref("javascript:alert(1)")).toBeNull();
    expect(safeHttpsHref("http://example.com/")).toBeNull();
    expect(safeHttpsHref(null)).toBeNull();
  });
});

describe("parseCiRunClaim", () => {
  const claim = {
    runUrl: "https://github.com/o/r/actions/runs/1",
    deployUrl: "https://o.github.io/r/",
    commit: COMMIT,
  };
  it("知っている項目だけで組み直す", () => {
    expect(parseCiRunClaim({ ...claim, extra: "x".repeat(1000) })).toEqual(claim);
    const { commit: _commit, ...withoutCommit } = claim;
    expect(parseCiRunClaim(withoutCommit)).toEqual(withoutCommit);
  });
  it("形の違う申告を受け付けない", () => {
    expect(parseCiRunClaim({ ...claim, commit: "abc" })).toBeNull();
    expect(parseCiRunClaim({ ...claim, commit: COMMIT.toUpperCase() })).toBeNull();
    expect(parseCiRunClaim({ ...claim, runUrl: `${claim.runUrl}/` })).toBeNull();
    expect(parseCiRunClaim({ ...claim, deployUrl: "http://o.github.io/" })).toBeNull();
    expect(parseCiRunClaim([claim])).toBeNull();
    expect(parseCiRunClaim(null)).toBeNull();
  });
});

describe("照合の結果", () => {
  it("食い違いを先に、問題が無ければ照合できたことにする", () => {
    expect(ciCheckStatusOf([])).toBe("verified");
    expect(ciCheckStatusOf(["rate-limited"])).toBe("unverifiable");
    expect(ciCheckStatusOf(["not-success", "commit-mismatch"])).toBe("mismatch");
  });
  it("DB の記録の状態を読む。壊れていれば照合できなかったものとする", () => {
    expect(ciCheckStatusFrom(undefined)).toBeNull();
    expect(ciCheckStatusFrom({ status: "verified" })).toBe("verified");
    expect(ciCheckStatusFrom({ status: "ok" })).toBe("unverifiable");
    expect(ciCheckStatusFrom({})).toBe("unverifiable");
  });
});
