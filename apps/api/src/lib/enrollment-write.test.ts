/**
 * 自己開始の受講登録 (`startSelfEnrollment`) の書き込み規則。
 *
 * 見ているのは 4 点だけで、いずれも「2 度目に押したとき何が起きるか」に関わる:
 *   - 初回は行が生まれ、学習経路の `started` も 1 度だけ積まれる
 *   - 既にある `active` / `completed` の登録は **触らない** (期限 / 必須を既定値へ戻さない)
 *   - `expired` の登録だけは `active` へ戻す (学び直しの入口を塞がない)。`completed_at` は触らない
 *   - 復帰では `started` を積み直さない (初めて始めた日を上書きしない)
 *
 * D1 は差し替えず、drizzle のクエリビルダの形だけ真似たインメモリの偽 db で代用する
 * (`stage-path-events.test.ts` と同じ流儀)。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Db } from "../db/client.js";
import type { Caller } from "./authz.js";
import { startSelfEnrollment } from "./enrollment-write.js";
import { recordStagePathEvents } from "./stage-path-events.js";

vi.mock("./stage-path-events.js", () => ({ recordStagePathEvents: vi.fn(async () => undefined) }));

const caller: Caller = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student",
  name: "受講者",
  email: null,
};

/** 偽 db が持つ enrollment 行 (応答形と同じ snake_case)。 */
interface Row {
  id: string;
  tenant_id: string;
  user_id: string;
  stage_id: string;
  status: "active" | "completed" | "expired";
  due_at: string | null;
  required: boolean;
  completed_at: string | null;
}

/**
 * `(user_id, stage_id)` に 1 行だけ持つ偽 db。
 *
 * insert は既存行があれば `on conflict do nothing` で 0 件を返し、update は
 * 「`status` がまだ `expired` の行だけ」という条件をそのまま真似る (呼び出し側が
 * 比較交換の代わりに使っている条件なので、ここを緩めるとテストの意味が無くなる)。
 */
function createDb(initial?: Row, opts: { readsAs?: Row } = {}) {
  const state: { row: Row | undefined } = { row: initial };
  const updates: Record<string, unknown>[] = [];
  /** 1 回目の読みだけ古い値を返すための細工 (`readsAs`)。 */
  let stale = opts.readsAs;
  const db = {
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (state.row) return [];
            state.row = {
              id: "enr-1",
              tenant_id: values.tenantId as string,
              user_id: values.userId as string,
              stage_id: values.stageId as string,
              status: "active",
              due_at: null,
              required: false,
              completed_at: null,
            };
            return [state.row];
          },
        }),
      }),
    }),
    select: () => {
      const chain: Record<string, unknown> = {};
      chain.from = () => chain;
      chain.where = () => chain;
      chain.limit = async () => {
        // `readsAs` は「読んだ直後に他の誰かが直した」を作るための細工 (1 回目だけ
        // 古い値を返す)。 指定しなければ普通に現在の行を返す。
        const row = stale ?? state.row;
        stale = undefined;
        return row ? [row] : [];
      };
      return chain;
    },
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            updates.push(values);
            // 更新条件は「まだ expired の行」。それ以外は 0 件 (競合で誰かが直した)。
            if (state.row?.status !== "expired") return [];
            state.row = { ...state.row, ...(values as Partial<Row>) };
            return [state.row];
          },
        }),
      }),
    }),
  };
  return { db: db as unknown as Db, state, updates };
}

const baseRow = (status: Row["status"], extra: Partial<Row> = {}): Row => ({
  id: "enr-1",
  tenant_id: "ses",
  user_id: caller.id,
  stage_id: "stage-a",
  status,
  due_at: null,
  required: false,
  completed_at: null,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startSelfEnrollment", () => {
  it("登録が無ければ作り、started を 1 度積む", async () => {
    const { db, state } = createDb();
    const result = await startSelfEnrollment(db, caller, "stage-a");
    expect(result).toMatchObject({ created: true, reactivated: false });
    expect(state.row?.status).toBe("active");
    // 自己開始に期限は付かず、必須にもしない。
    expect(state.row?.due_at).toBeNull();
    expect(state.row?.required).toBe(false);
    expect(recordStagePathEvents).toHaveBeenCalledWith(db, "ses", "started", [
      { userId: caller.id, stageId: "stage-a" },
    ]);
  });

  it("進行中の登録は触らない (期限 / 必須を既定値へ戻さない)", async () => {
    const existing = baseRow("active", { due_at: "2026-09-01T00:00:00.000Z", required: true });
    const { db, updates } = createDb(existing);
    const result = await startSelfEnrollment(db, caller, "stage-a");
    expect(result).toMatchObject({ created: false, reactivated: false });
    expect(result.row).toMatchObject({ due_at: "2026-09-01T00:00:00.000Z", required: true });
    expect(updates).toEqual([]);
    // 2 度目の「始める」で経路の開始日が動かない。
    expect(recordStagePathEvents).not.toHaveBeenCalled();
  });

  it("修了済みの登録も触らない (完了を巻き戻さない)", async () => {
    const { db, updates } = createDb(
      baseRow("completed", { completed_at: "2026-08-01T00:00:00.000Z" }),
    );
    const result = await startSelfEnrollment(db, caller, "stage-a");
    expect(result).toMatchObject({ created: false, reactivated: false });
    expect(result.row?.status).toBe("completed");
    expect(updates).toEqual([]);
  });

  it("期限切れの登録は受講中へ戻す (completed_at は触らない)", async () => {
    const { db, state, updates } = createDb(
      baseRow("expired", {
        due_at: "2026-01-01T00:00:00.000Z",
        completed_at: "2026-01-05T00:00:00.000Z",
      }),
    );
    const result = await startSelfEnrollment(db, caller, "stage-a");
    expect(result).toMatchObject({ created: false, reactivated: true });
    expect(result.row?.status).toBe("active");
    expect(state.row?.completed_at).toBe("2026-01-05T00:00:00.000Z");
    // 書き換えるのは status だけ (期限もそのまま残す — 運用が入れた値を消さない)。
    expect(updates).toEqual([{ status: "active" }]);
    // 復帰は「初めて始めた日」ではないので started は積み直さない。
    expect(recordStagePathEvents).not.toHaveBeenCalled();
  });

  it("戻す直前に他の誰かが状態を直していたら、上書きせず現在の行を返す", async () => {
    // 読んだ時点では expired だが、書く時点では staff が完了へ直したあと。
    const { db } = createDb(baseRow("completed"), { readsAs: baseRow("expired") });
    const result = await startSelfEnrollment(db, caller, "stage-a");
    expect(result).toMatchObject({ created: false, reactivated: false });
    expect(result.row?.status).toBe("completed");
  });
});
