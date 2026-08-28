/**
 * つまずき検知 (Phase 4) — **記録する短文に受講者の入力を混ぜない**ことを固定する。
 *
 * `discovery_requests.topic` は講師の待ち行列に並び、そのまま生成プロンプトの
 * `<discovery_context>` へ入る。提出ボディの `assignmentTitle` は VS Code 拡張が
 * 自由に詰められる値なので、ここを通してしまうと受講者が講師の画面と AI の入力に
 * 任意の文を書けることになる。
 *
 * あわせて、レッスン id / 課題 id の引き当てが **テナントで絞られている** ことも
 * 見る (他テナントの id を送るだけで行が作られる経路を残さない)。引き当ての where 句
 * は `skill-map-data.test.ts` と同じく、発行された SQL を記録して確かめる。
 */

import { drizzle } from "drizzle-orm/d1";
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
      tenantId: "ses",
      lessonId: "lesson-1",
      assignmentId: "a1",
    });
    expect(resolveAssignmentTitle).toHaveBeenCalledWith(db, "ses", "a1");
    expect(lastTopic()).toBe("課題「配列を並べ替える」");
  });

  it("正本に無い課題は汎用文言 + レッスン名に落とす", async () => {
    vi.mocked(resolveAssignmentTitle).mockResolvedValue(null);
    await noteSubmissionStumble(db, {
      tenantId: "ses",
      lessonId: "lesson-1",
      assignmentId: "a1",
    });
    expect(lastTopic()).toBe("課題のつまずき（配列の操作）");
  });

  it("課題 id が無ければ引き当てずに汎用文言 (提出の題名は使わない)", async () => {
    await noteSubmissionStumble(db, {
      tenantId: "ses",
      lessonId: "lesson-1",
      assignmentId: null,
    });
    expect(resolveAssignmentTitle).not.toHaveBeenCalled();
    expect(lastTopic()).toBe("課題のつまずき（配列の操作）");
  });

  it("引き当ては必ずテナント付き (他テナントの lesson id では行を作らない)", async () => {
    // 他テナントの lesson id → 絞り込みで引けない → 何も積まない。
    vi.mocked(resolveLessonStage).mockResolvedValue(null);
    await noteSubmissionStumble(db, {
      tenantId: "ses",
      lessonId: "other-tenant-lesson",
      assignmentId: "a1",
    });
    expect(resolveLessonStage).toHaveBeenCalledWith(db, "ses", "other-tenant-lesson");
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });

  it("レッスンに紐づかない提出は見送る", async () => {
    await noteSubmissionStumble(db, { tenantId: "ses", lessonId: null, assignmentId: "a1" });
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });
});

describe("noteQuizStumble", () => {
  it("小テストの題名も D1 の正本 (lessons.title) から組む", async () => {
    await noteQuizStumble(db, {
      tenantId: "ses",
      userId: "seed-learner",
      quizId: "quiz-1",
      lessonId: "lesson-1",
    });
    expect(resolveLessonStage).toHaveBeenCalledWith(db, "ses", "lesson-1");
    expect(lastTopic()).toBe("確認テスト「配列の操作」");
  });

  it("1 回目の不合格では積まない", async () => {
    vi.mocked(countFailedQuizAttempts).mockResolvedValue(1);
    await noteQuizStumble(db, {
      tenantId: "ses",
      userId: "seed-learner",
      quizId: "quiz-1",
      lessonId: "lesson-1",
    });
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });

  it("他テナントの lesson id では行を作らない", async () => {
    vi.mocked(resolveLessonStage).mockResolvedValue(null);
    await noteQuizStumble(db, {
      tenantId: "ses",
      userId: "seed-learner",
      quizId: "quiz-1",
      lessonId: "other-tenant-lesson",
    });
    expect(upsertDiscoveryRequest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------
// 引き当てそのもの (where 句) — 発行された SQL を見る
// ---------------------------------------------------------------

interface RecordedQuery {
  sql: string;
  params: unknown[];
}

function recordingDb(): { db: Db; last: () => RecordedQuery } {
  const queries: RecordedQuery[] = [];
  const driver = {
    prepare: (sql: string) => {
      const entry: RecordedQuery = { sql, params: [] };
      queries.push(entry);
      const stmt = {
        bind: (...params: unknown[]) => {
          entry.params = params;
          return stmt;
        },
        all: async () => ({ results: [], success: true, meta: {} }),
        run: async () => ({ results: [], success: true, meta: {} }),
        first: async () => null,
        raw: async () => [],
      };
      return stmt;
    },
    batch: async () => [],
    exec: async () => ({}),
    dump: async () => "",
  };
  return {
    db: drizzle(driver as never) as unknown as Db,
    last: () => {
      const q = queries.at(-1);
      if (!q) throw new Error("SQL が 1 つも発行されていません");
      return q;
    },
  };
}

describe("引き当ての where 句はテナントで絞る", () => {
  it("resolveLessonStage は stages のテナントまで辿って絞る", async () => {
    const { db: recording, last } = recordingDb();
    const { resolveLessonStage: real } =
      await vi.importActual<typeof import("./discovery-data.js")>("./discovery-data.js");
    await real(recording, "ses", "lesson-1");
    const q = last();
    expect(q.sql).toContain("tenant_id");
    expect(q.params).toContain("ses");
    expect(q.params).toContain("lesson-1");
  });

  it("resolveAssignmentTitle も同じテナントの課題しか読まない", async () => {
    const { db: recording, last } = recordingDb();
    const { resolveAssignmentTitle: real } =
      await vi.importActual<typeof import("./discovery-data.js")>("./discovery-data.js");
    await real(recording, "ses", "a1");
    const q = last();
    expect(q.sql).toContain("tenant_id");
    expect(q.params).toContain("ses");
    expect(q.params).toContain("a1");
  });
});
