import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GuidedStage } from "@stella/shared/stage-grants/types";
import { GuidedStageCard, GuidedStageLines, GuidedStagesLoadError } from "./GuidedStages";

const stage: GuidedStage = {
  stage_id: "sample",
  title: "架空の事前課題",
  source_name: "架空の研修室",
  message: "<script>example</script>",
  due_at: null,
  status: "available",
  prerequisite_titles: [],
  progress: { unit: "problems", passed: 0, total: 1292 },
};
const handlers = {
  onStart: async () => {
    /* 描画の確認では押さない */
  },
  onOpen: () => {
    /* 描画の確認では押さない */
  },
};

describe("案内カードの描画", () => {
  it("案内元と進捗を表示し、案内の文は文字として扱う", () => {
    const html = renderToStaticMarkup(createElement(GuidedStageCard, { stage, ...handlers }));
    expect(html).toContain("架空の研修室");
    expect(html).toContain("0/1292 問");
    expect(html).toContain("&lt;script&gt;example&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("始める");
  });
  it.each(["available", "in-progress"] as const)(
    "ガイドに出した %s のカードはボタンだけを外す",
    (status) => {
      const due_at = new Date(Date.now() + 2 * 86_400_000).toISOString();
      const html = renderToStaticMarkup(
        createElement(GuidedStageCard, {
          stage: { ...stage, status, due_at },
          hideAction: true,
          ...handlers,
        }),
      );
      expect(html).not.toContain("<button");
      expect(html).toContain("架空の研修室 からの案内");
      expect(html).toContain("期限間近：");
      expect(html).toContain("0/1292 問");
      expect(html).toContain("&lt;script&gt;example&lt;/script&gt;");
    },
  );
  it("長い案内も改行を保って全文を出し、行数で切らない", () => {
    const message = `${"架空の案内です。".repeat(50)}\n案内の最後です。`;
    const html = renderToStaticMarkup(
      createElement(GuidedStageCard, { stage: { ...stage, message }, ...handlers }),
    );
    expect(html).toContain(message);
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain("break-words");
    expect(html).not.toContain("line-clamp");
  });
  it("案内の読み込み失敗を通知し、再読み込みの操作を表示する", () => {
    const html = renderToStaticMarkup(
      createElement(GuidedStagesLoadError, {
        message: "案内されたステージを読み込めませんでした",
        onRetry: async () => {
          /* 描画だけを確認する */
        },
      }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("案内されたステージを読み込めませんでした");
    expect(html).toContain("もう一度読み込む");
    expect(html).toContain("<button");
  });
  it("ロック中は開始ボタンを出さず、前提名を表示する", () => {
    const html = renderToStaticMarkup(
      createElement(GuidedStageCard, {
        stage: { ...stage, status: "locked", prerequisite_titles: ["架空の準備"] },
        ...handlers,
      }),
    );
    expect(html).not.toContain("<button");
    expect(html).toContain("『架空の準備』を終えると始められます");
  });
  it("畳んだ帯は全件をボタンで表示し、0件なら何も出さない", () => {
    const props = {
      onExpand: () => {
        /* 描画の確認では押さない */
      },
    };
    expect(renderToStaticMarkup(createElement(GuidedStageLines, { ...props, stages: [] }))).toBe(
      "",
    );
    const html = renderToStaticMarkup(
      createElement(GuidedStageLines, {
        ...props,
        stages: [stage, { ...stage, stage_id: "other", title: "架空の続編" }],
      }),
    );
    expect(html.match(/<button/g)).toHaveLength(2);
    expect(html).toContain("架空の続編");
  });
});
