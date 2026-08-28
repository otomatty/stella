import { describe, expect, it } from "vitest";
import { HELP_TOPICS, findHelpTopic } from "./helpContent";

describe("findHelpTopic", () => {
  it("ルート / はダッシュボードのヘルプにマッチする", () => {
    expect(findHelpTopic("/")?.route).toBe("/");
  });

  it("静的ルートは末尾スラッシュの有無に関わらずマッチする", () => {
    expect(findHelpTopic("/stages")?.route).toBe("/stages");
    expect(findHelpTopic("/stages/")?.route).toBe("/stages");
  });

  it("動的セグメントは任意の 1 セグメントにマッチする", () => {
    expect(findHelpTopic("/stages/typescript-basics")?.route).toBe("/stages/$stageId");
    expect(findHelpTopic("/stages/ts/lessons/l1")?.route).toBe(
      "/stages/$stageId/lessons/$lessonId",
    );
  });

  it("セグメント数が違うパスにはマッチしない", () => {
    // /stages/$stageId (2 セグメント) が 3 セグメントのパスを拾わないこと
    expect(findHelpTopic("/stages/ts/extra")).toBeNull();
  });

  it("定義の無い画面 (講師・管理者など) は null を返す", () => {
    expect(findHelpTopic("/admin/users")).toBeNull();
    expect(findHelpTopic("/review-queue")).toBeNull();
  });

  it("全トピックが具体的なパスから到達できる", () => {
    for (const topic of HELP_TOPICS) {
      const concrete =
        topic.route === "/"
          ? "/"
          : topic.route
              .split("/")
              .map((seg) => (seg.startsWith("$") ? "sample-id" : seg))
              .join("/");
      expect(findHelpTopic(concrete)?.route).toBe(topic.route);
    }
  });
});
