/**
 * つまずき検知 (Phase 4) — **記録する短文に受講者の入力を混ぜない**ことを固定する。
 *
 * `discovery_requests.topic` は講師の待ち行列に並び、そのまま生成プロンプトの
 * `<discovery_context>` へ入る。提出ボディの `assignmentTitle` は VS Code 拡張が
 * 自由に詰められる値なので、ここを通してしまうと受講者が講師の画面と AI の入力に
 * 任意の文を書けることになる。レッスンが引けなければ行は積まない。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Db } from "../db/client.js";
import {
  countFailedQuizAttempts,
  resolveAssignmentTitle,
  resolveLessonStage,
  upsertDiscoveryRequest,
} from "./discovery-data.js";
import { noteQuizStumble, noteSubmissionStumble } from "./discovery-stumble.js";

vi.mock("./discovery-data.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./discovery-data.js")>();
  return {
    ...actual,
    countFailedQuizAttempts: vi.fn(),
    resolveLessonStage: vi.fn(),
    resolveAssignmentTitle: vi.fn(),
    upsertDiscoveryRequest: vi.fn(async () => undefined),
  };
});

const db = {} as Db;

/** 記録された topic (最後の 1 件)。積まれていなければ null。 */
function lastTopic(): string | null {
  const call = vi.mocked(upsertDiscoveryRequest).mock.calls.at(-1);
  return call ? call[1].topic : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(countFailedQuizAttempts).mockResolvedValue(2);
  vi.mocked(resolveLessonStage).mockResolvedValue({
    stageId: "id-b",
    lessonTitle: "配列の操作",
  });
  vi.mocked(resolveAssignmentTitle).mockResolvedValue("配列を並べ替える");
});

describe("noteSubmissionStumble — 受講者の入力を混ぜない", () => {
  it("題名は D1 の正本 (assignments.title) から引く", async () => {
    await noteSubmissionStumble(db, {
      lessonId: "lesson-1",
      assignmentId: "a1",
    });
    expect(resolveAssignmentTitle).toHaveBeenCalledWith(db, "a1");
    expect(lastTopic()).toBe("課題「配列を並べ替える」");
  });

  it("正本に無い課題は汎用文言 + レッスン名に落とす", async () => {
    vi.mocked(resolveAssignmentTitle).mockResolvedValue(null);
    await noteSubmissionStumble(db, {
      lessonId: "lesson-1",
      assignmentId: "a1",
    });
    expect(lastTopic()).toBe("課題のつまずき（配列の操作）");
  });

  it("課題 id が無ければ引き当てずに汎用文言 (提出の題名は使わない)", async () => {
    await noteSubmissionStumble(db, {
      lessonId: "lesson-1",
      assignmentId: null,
    });
    expect(resolveAssignmentTitle).not.toHaveBeenCalled();
    expect(lastTopic()).toBe("課題のつまずき（配列の操作）");
  });

  it("レッスンが無ければ行を作らない", async () => {
    vi.mocked(resolveLessonStage).mockResolvedValue(null);
    await noteSubmissionStumble(db, {
      lessonId: "missing-lesson",
      assignmentId: "a1",
    });
    expect(resolveLessonStage).toHaveBeenCalledWith(db, "missing-lesson");
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });

  it("レッスンに紐づかない提出は見送る", async () => {
    await noteSubmissionStumble(db, { lessonId: null, assignmentId: "a1" });
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });
});

describe("noteQuizStumble", () => {
  it("小テストの題名も D1 の正本 (lessons.title) から組む", async () => {
    await noteQuizStumble(db, {
      userId: "seed-learner",
      quizId: "quiz-1",
      lessonId: "lesson-1",
    });
    expect(resolveLessonStage).toHaveBeenCalledWith(db, "lesson-1");
    expect(lastTopic()).toBe("確認テスト「配列の操作」");
  });

  it("1 回目の不合格では積まない", async () => {
    vi.mocked(countFailedQuizAttempts).mockResolvedValue(1);
    await noteQuizStumble(db, {
      userId: "seed-learner",
      quizId: "quiz-1",
      lessonId: "lesson-1",
    });
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });

  it("レッスンが無ければ行を作らない", async () => {
    vi.mocked(resolveLessonStage).mockResolvedValue(null);
    await noteQuizStumble(db, {
      userId: "seed-learner",
      quizId: "quiz-1",
      lessonId: "missing-lesson",
    });
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });
});
