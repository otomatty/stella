import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Assignment } from "@stella/shared/types";
import { AIChatBot } from "./AIChatBot";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  assignment: vi.fn(),
  chat: vi.fn(),
}));

vi.mock("./LessonAIContext", () => ({ useLessonAI: mocks.context }));
vi.mock("@/hooks/useResolvedAssignment", () => ({ useResolvedAssignment: mocks.assignment }));
vi.mock("./useAiChat", () => ({ useAiChat: mocks.chat }));
vi.mock("@/hooks/useIsMobileViewport", () => ({ useIsMobileViewport: () => false }));

const assignment: Assignment = {
  id: "practice-1",
  stage: "S0",
  chapterId: "Ch00",
  sequence: 1,
  title: "Example",
  newConcept: "",
  estimatedMinutes: 5,
  difficulty: 1,
  description: "Problem statement",
  starterFiles: [],
  tests: [],
  testKind: "stdout",
};

/** effects が走る前の表示を検査し、初回メッセージ準備前の入力を防ぐ。 */
function renderChat() {
  const html = renderToStaticMarkup(createElement(AIChatBot, { open: true, onClose: vi.fn() }));
  return {
    html,
    textarea: html.match(/<textarea\b[^>]*>/)?.[0] ?? "",
    sendButton: html.match(/<button\b[^>]*aria-label="送信"[^>]*>/)?.[0] ?? "",
  };
}

beforeEach(() => {
  mocks.context.mockReturnValue({
    kind: "practice",
    assignmentId: assignment.id,
    userCode: "console.log(7)",
    summary: { cleared: false, lintFailures: [], astFailures: [], testFailures: [] },
  });
  mocks.assignment.mockReturnValue({ assignment: null, loading: true, error: null });
  mocks.chat.mockReturnValue({
    messages: [],
    draftAssistant: "",
    streaming: false,
    error: null,
    send: vi.fn(),
    bootstrapIfEmpty: vi.fn(),
  });
});

describe("practice チャットの文脈取得", () => {
  it("課題の取得中は入力と送信を無効にする", () => {
    const ui = renderChat();
    expect(ui.textarea).toContain('disabled=""');
    expect(ui.sendButton).toContain('disabled=""');
    expect(ui.html).toContain("課題情報を読み込んでいます");
  });

  it("課題取得後も初回コンテキストが履歴に入るまで入力を許可しない", () => {
    mocks.assignment.mockReturnValue({ assignment, loading: false, error: null });
    expect(renderChat().textarea).toContain('disabled=""');
  });

  it("文脈付き履歴の準備が終われば入力を許可する", () => {
    mocks.assignment.mockReturnValue({ assignment, loading: false, error: null });
    mocks.chat.mockReturnValue({
      ...mocks.chat(),
      messages: [{ role: "user", content: "Problem, code, failures" }],
    });
    expect(renderChat().textarea).not.toContain('disabled=""');
  });

  it("取得エラーを表示し、文脈なしの送信を防ぐ", () => {
    mocks.assignment.mockReturnValue({
      assignment: null,
      loading: false,
      error: "API unavailable",
    });
    const ui = renderChat();
    expect(ui.html).toContain("API unavailable");
    expect(ui.html).toContain("チャットを開き直して");
    expect(ui.html).not.toContain("失敗した課題のコンテキストを引き継いでいます");
    expect(ui.textarea).toContain('disabled=""');
  });

  it("課題が見つからない場合も引き継ぎ失敗を表示して入力を止める", () => {
    mocks.assignment.mockReturnValue({ assignment: null, loading: false, error: null });
    const ui = renderChat();
    expect(ui.html).toContain("課題情報を取得できません");
    expect(ui.textarea).toContain('disabled=""');
  });

  it("通常のチャットは課題も履歴も無くても入力できる", () => {
    mocks.context.mockReturnValue({ kind: "general" });
    mocks.assignment.mockReturnValue({ assignment: null, loading: false, error: null });
    expect(renderChat().textarea).not.toContain('disabled=""');
  });
});
