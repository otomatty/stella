import { describe, expect, it } from "vitest";
import {
  firstReadmeParagraph,
  parseStaffTaskTab,
  staffTaskCounts,
  taskGithubUrl,
} from "./staff-task-detail";

describe("課題詳細の表示", () => {
  it("READMEの見出し・空行・コードを飛ばして最初の段落だけ平文にする", () => {
    expect(
      firstReadmeParagraph(
        "# 題\r\n\r\n```js\r\nconst secret = 1;\r\n```\r\n\r\n**ページ**に `h1` を置き、\r\n[仕様](https://example.com)に合わせる。\r\n\r\n次の段落",
      ),
    ).toBe("ページに h1 を置き、 仕様に合わせる。");
    expect(firstReadmeParagraph("題\n===\n\n    code\n\n本文です。\n\n次です。")).toBe(
      "本文です。",
    );
    expect(firstReadmeParagraph("~~~js\n```\nコード\n~~~\n\n本文")).toBe("本文");
    expect(firstReadmeParagraph("`src/<id>.cs` に <b>書く</b>。")).toBe("src/<id>.cs に 書く。");
  });
  it("本文がなければ省略する", () => {
    for (const readme of [null, "", "# 見出し\n\n```\nコード\n```", "    コード\n"]) {
      expect(firstReadmeParagraph(readme)).toBeNull();
    }
  });
  it("受講者数を指定のラベルと順番で表示する", () => {
    expect(
      staffTaskCounts({
        started: 7,
        localPassed: 6,
        submitted: 5,
        reviewing: 4,
        waiting: 3,
        resubmit: 2,
        passed: 1,
      }),
    ).toEqual([
      { label: "着手", count: 7 },
      { label: "手元で合格", count: 6 },
      { label: "提出", count: 5 },
      { label: "AI が確認中", count: 4 },
      { label: "講師の確認待ち", count: 3 },
      { label: "再提出", count: 2 },
      { label: "合格", count: 1 },
    ]);
  });
  it("GitHubのソース・類題・変更履歴へパスの区切りを保ってリンクする", () => {
    const path = "packages/content/stages/example/modules/unit/tasks/q01";
    const root = "https://github.com/otomatty/stella";
    expect(taskGithubUrl(path)).toBe(`${root}/tree/main/${path}`);
    expect(taskGithubUrl(path, "variants")).toBe(`${root}/tree/main/${path}/private/variants`);
    expect(taskGithubUrl(path, "history")).toBe(`${root}/commits/main/${path}`);
    expect(taskGithubUrl("path/日本語 #?")).toBe(
      `${root}/tree/main/path/${encodeURIComponent("日本語 #?")}`,
    );
  });
  it("タブの既定値は概要で、不正な検索パラメーターも概要へ戻す", () => {
    for (const value of [undefined, null, "", "invalid", ["statement"]])
      expect(parseStaffTaskTab(value)).toBe("overview");
    for (const value of ["overview", "statement", "submissions", "variants", "revisions"])
      expect(parseStaffTaskTab(value)).toBe(value);
  });
});
