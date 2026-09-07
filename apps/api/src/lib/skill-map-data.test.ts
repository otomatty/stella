import { describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/d1";

import { evaluateSkillMap } from "@stella/shared/skill-map/evaluate";

import type { Db } from "../db/client.js";
import type { Caller } from "./authz.js";
import { isEnrolledInStage } from "./stage-queue-data.js";
import {
  INVALID_PREREQUISITE_SENTINEL,
  isDevMode,
  isUsableFocus,
  loadEnrolledStageIds,
  parsePrerequisites,
  pickActiveStageId,
  selectableActiveStages,
  shouldRevealDevMap,
} from "./skill-map-data.js";

const id_ = (slug: string) => `id-${slug}`;

/** テスト出力を汚さずに、ログに残っていることだけ確かめる。 */
function withSilencedError<T>(fn: () => T): { value: T; logged: boolean } {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {
    // 握り潰す。
  });
  try {
    return { value: fn(), logged: spy.mock.calls.length > 0 };
  } finally {
    spy.mockRestore();
  }
}

describe("parsePrerequisites", () => {
  it("JSON 配列文字列を slug 配列にする", () => {
    expect(parsePrerequisites('["a-basics","b-basics"]')).toEqual(["a-basics", "b-basics"]);
  });

  it("null / 空文字は前提なし", () => {
    expect(parsePrerequisites(null)).toEqual([]);
    expect(parsePrerequisites("")).toEqual([]);
    expect(parsePrerequisites("[]")).toEqual([]);
  });

  it("文字列以外の要素は落とす", () => {
    expect(parsePrerequisites('["a-basics",null,3,"  "]')).toEqual(["a-basics"]);
  });

  it("壊れた JSON は「前提なし」ではなく番兵にして locked 側へ倒す", () => {
    // 前提はハードロックなので、読めない行を「前提なし」と解釈すると全員に開いてしまう。
    // 開きすぎより閉じすぎ (誰も進めないので気付く)。
    const { value, logged } = withSilencedError(() => parsePrerequisites("not json"));
    expect(value).toEqual([INVALID_PREREQUISITE_SENTINEL]);
    // 手で直す合図としてログには残す。
    expect(logged).toBe(true);
  });

  it("配列でない JSON も番兵にする", () => {
    const { value } = withSilencedError(() => parsePrerequisites('{"a":1}'));
    expect(value).toEqual([INVALID_PREREQUISITE_SENTINEL]);
  });
});

describe("開発モードの判定 (isDevMode)", () => {
  it("'1' / 'true' だけを開発モードとみなす", () => {
    expect(isDevMode({ DEV_MODE: "1" })).toBe(true);
    expect(isDevMode({ DEV_MODE: "true" })).toBe(true);
  });

  it("未設定・空文字・その他の値は本番挙動 (島の表示条件を適用)", () => {
    // 本番に紛れ込んでも「明示的に 1/true」以外は無効 — 閉じすぎ側に倒す。
    expect(isDevMode({})).toBe(false);
    expect(isDevMode({ DEV_MODE: "" })).toBe(false);
    expect(isDevMode({ DEV_MODE: "0" })).toBe(false);
    expect(isDevMode({ DEV_MODE: "yes" })).toBe(false);
  });
});

describe("開発者表示を出すか (shouldRevealDevMap)", () => {
  const on = { DEV_MODE: "1" };

  it("本番 (env オフ) ではヘッダが 1 でも出さない", () => {
    // FAB を付けてもサーバが拒否すれば本番の霧 / 島は漏れない。
    expect(shouldRevealDevMap({}, "1")).toBe(false);
    expect(shouldRevealDevMap({ DEV_MODE: "0" }, "1")).toBe(false);
  });

  it("env オン + ヘッダ 1/true / 未指定は出す (未指定は互換: 以前は env だけで出していた)", () => {
    expect(shouldRevealDevMap(on, "1")).toBe(true);
    expect(shouldRevealDevMap(on, "true")).toBe(true);
    expect(shouldRevealDevMap(on, undefined)).toBe(true);
    expect(shouldRevealDevMap(on, "")).toBe(true);
  });

  it("env オンでもヘッダ 0/false なら出さない (FAB オフ)", () => {
    expect(shouldRevealDevMap(on, "0")).toBe(false);
    expect(shouldRevealDevMap(on, "false")).toBe(false);
  });
});

describe("壊れた prerequisites の行き先", () => {
  it("番兵はどのステージにも解決せず、その星は locked のまま残る", () => {
    const stages = [
      { id: "id-a", slug: "a", title: "a の講座", prerequisites: [], category: "" },
      {
        id: "id-broken",
        slug: "broken",
        title: "broken の講座",
        prerequisites: parsePrerequisites("["),
        category: "",
      },
    ];
    const { value: r } = withSilencedError(() =>
      evaluateSkillMap({ stages, clearedStageIds: new Set(["id-a"]) }),
    );
    expect(r.states.get(id_("broken"))).toBe("locked");
    // 解放条件にも番兵の文字列は出さない (評価器が未知 slug を伏せる)。
    const labels = (r.lockReasons.get(id_("broken")) ?? []).map((reason) => reason.label);
    expect(labels).toEqual(["非公開の教材"]);
    expect(labels.join()).not.toContain(INVALID_PREREQUISITE_SENTINEL);
  });
});

/**
 * 受講登録の絞り込み — 「どの行を enrolled と数えるか」は道の見え方とフォーカス /
 * キューの受け入れを直接決めるので、SQL の形として固定しておく。
 *
 * D1 は差し替えず、発行された SQL とバインド値を記録するだけのドライバを噛ませる
 * (`lesson-progress-write.test.ts` と同じ流儀)。行を返さないので戻り値は空だが、
 * 見たいのは **どの行が候補から外れるか** = where 句そのもの。
 */
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

const CALLER: Caller = {
  id: "seed-learner",
  tenantId: "ses",
  role: "student",
  name: "受講者",
  email: null,
};

describe("受講登録の絞り込み (loadEnrolledStageIds / isEnrolledInStage)", () => {
  it("読める登録 (active / completed) だけを数える — expired は enrolled 扱いにしない", async () => {
    const { db, last } = recordingDb();
    await loadEnrolledStageIds(db, CALLER);
    const q = last();
    expect(q.sql).toContain('"status" in (?, ?)');
    expect(q.params).toContain("active");
    expect(q.params).toContain("completed");
    // 期限切れの割当は「今すぐ始められる星」ではない (開くと 404 になる)。
    expect(q.params).not.toContain("expired");
  });

  it("テナントも絞る (他テナントに残った行はフォーカス / キューに効かない)", async () => {
    const { db, last } = recordingDb();
    await loadEnrolledStageIds(db, CALLER);
    const q = last();
    expect(q.sql).toContain('"tenant_id" = ?');
    expect(q.params).toContain("ses");
  });

  it("キューの受け入れ判定も同じ規約 (status + tenant) で絞る", async () => {
    const { db, last } = recordingDb();
    await isEnrolledInStage(db, CALLER, "stage-a");
    const q = last();
    expect(q.sql).toContain('"status" in (?, ?)');
    expect(q.sql).toContain('"tenant_id" = ?');
    expect(q.params).toContain("active");
    expect(q.params).toContain("completed");
    expect(q.params).not.toContain("expired");
    expect(q.params).toContain("ses");
  });
});

describe("「進行中」に据えてよい星か (selectableActiveStages)", () => {
  /** 一本道 a → b → c → d。クリア無しなら a が起点で、c は 2 歩・d は 3 歩。 */
  const line = ["a", "b", "c", "d"].map((slug, i) => ({
    id: id_(slug),
    slug,
    title: `${slug} の講座`,
    category: "基礎",
    prerequisites: i === 0 ? [] : [String(["a", "b", "c", "d"][i - 1])],
  }));

  const selectable = () => selectableActiveStages(line, new Set(), new Set());

  it("手が届く星 (0〜1 歩) は据えてよい", () => {
    const isSelectable = selectable();
    expect(isSelectable(id_("a"))).toBe(true); // unlocked = 起点
    expect(isSelectable(id_("b"))).toBe(true); // 1 歩
  });

  it("霧より先の星は据えない (保存済みフォーカスの迂回を塞ぐ)", () => {
    // 視界の段を変える前は 2 歩先もフォーカスに保存できた。その行が残っていても、
    // 読み出し側で `full` へ昇格させない (書き込み側は今この星を 400 で断る)。
    const isSelectable = selectable();
    expect(isSelectable(id_("c"))).toBe(false); // 2 歩 = 霧
    expect(isSelectable(id_("d"))).toBe(false); // 3 歩 = 線だけ
  });

  it("知らない星も据えない", () => {
    expect(selectable()("id-does-not-exist")).toBe(false);
  });

  it("飛び級で開いた星は据えてよい (前提が未充足でも起点)", () => {
    const isSelectable = selectableActiveStages(line, new Set(), new Set([id_("d")]));
    expect(isSelectable(id_("d"))).toBe(true);
    // その隣 (c) も 1 歩に上がるので据えられる。
    expect(isSelectable(id_("c"))).toBe(true);
  });
});

describe("進捗から「進行中」を導く (pickActiveStageId)", () => {
  const always = () => true;

  it("進捗の新しい順に、最初の据えてよい星を採る", () => {
    expect(pickActiveStageId(["a", "b"], new Set(), always)).toBe("a");
  });

  it("クリア済みで打ち切らず、次の候補まで見る", () => {
    expect(pickActiveStageId(["done", "a"], new Set(["done"]), always)).toBe("a");
  });

  it("視界の外の候補でも打ち切らない (据えてよい古い星を落とさない)", () => {
    // 前提が変わって遠のいた星が先頭に来ても、その後ろの星でホームの「続きから」を保つ。
    const isSelectable = (id: string) => id !== "far";
    expect(pickActiveStageId(["far", "a"], new Set(), isSelectable)).toBe("a");
  });

  it("どれも据えられなければ進行中なし", () => {
    expect(pickActiveStageId(["far"], new Set(), () => false)).toBeUndefined();
    expect(pickActiveStageId([], new Set(), always)).toBeUndefined();
  });
});

describe("保存済みフォーカスを採ってよいか (isUsableFocus)", () => {
  const cleared = new Set(["stage-cleared"]);
  const enrolled = new Set(["stage-active", "stage-cleared"]);

  it("読める登録があり、まだクリアしていない星なら採る", () => {
    expect(isUsableFocus("stage-active", cleared, enrolled)).toBe(true);
  });

  it("未設定は採らない (導出に落とす)", () => {
    expect(isUsableFocus(undefined, cleared, enrolled)).toBe(false);
  });

  it("クリア済みの星は採らない (「続きから」が古い星を指し続けないように)", () => {
    expect(isUsableFocus("stage-cleared", cleared, enrolled)).toBe(false);
  });

  it("読める登録が無くなった星は採らない (期限切れ / 解除のあと)", () => {
    // ここを通すと、教材 API は拒否するのにスキルマップだけ「進行中」と言い、
    // そのステージの発見教材まで公開条件 (active か cleared) を満たしてしまう。
    expect(isUsableFocus("stage-active", cleared, new Set())).toBe(false);
  });
});
