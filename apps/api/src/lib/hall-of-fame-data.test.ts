/**
 * Phase 5 — 「歩んだ道」(`buildPathSnapshot`) の組み立て。
 *
 * ここだけは **本物の SQL を実行して** 確かめる。写しに何が入るかは where 句が決めて
 * いるので、リポジトリ層をモックした route テストでは何も検証できない (モックが返す
 * 配列を見ているだけになる)。`node:sqlite` の実 DB を D1 の形に被せて、drizzle が
 * 生成したクエリをそのまま走らせる。
 */

import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
import { beforeEach, describe, expect, it } from "vitest";

import * as schema from "../db/schema.js";
import type { Db } from "../db/client.js";
import { buildPathSnapshot } from "./hall-of-fame-data.js";

/**
 * `node:sqlite` を D1 バインディングの形に見せる薄い層。
 *
 * drizzle の D1 ドライバが使うのは `prepare().bind().raw()` / `.all()` / `.run()` だけ。
 * `raw()` は列の値を **選択した順の配列** で返す約束なので、`all()` の結果オブジェクトを
 * そのまま `Object.values` で畳む (drizzle が生成する select は列名が重ならない)。
 */
function fakeD1(sqlite: DatabaseSync) {
  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      return {
        bind(...params: unknown[]) {
          const args = params as never[];
          return {
            all: async () => ({ results: stmt.all(...args) }),
            raw: async () => stmt.all(...args).map((row) => Object.values(row)),
            run: async () => stmt.run(...args),
          };
        },
      };
    },
    batch: async () => [],
  };
}

const SCHEMA_SQL = `
create table stages (
  id text primary key,
  tenant_id text not null,
  slug text not null,
  title text not null,
  status text not null default 'draft'
);
create table enrollments (
  id text primary key,
  tenant_id text not null,
  user_id text not null,
  stage_id text not null,
  status text not null default 'active',
  enrolled_at integer not null,
  completed_at integer
);
create table certificates (
  id text primary key,
  tenant_id text not null,
  user_id text not null,
  stage_id text not null,
  issued_at integer not null,
  revoked integer not null default 0
);
`;

const TENANT = "ses";
const USER = "seed-learner";
const T0 = Date.parse("2026-01-01T00:00:00.000Z");

let sqlite: DatabaseSync;
let db: Db;

function addStage(id: string, title: string, status: "draft" | "published" | "archived") {
  sqlite
    .prepare("insert into stages (id, tenant_id, slug, title, status) values (?, ?, ?, ?, ?)")
    .run(id, TENANT, id, title, status);
}

function completeStage(stageId: string, dayOffset: number, userId = USER) {
  sqlite
    .prepare(
      `insert into enrollments (id, tenant_id, user_id, stage_id, status, enrolled_at, completed_at)
       values (?, ?, ?, ?, 'completed', ?, ?)`,
    )
    .run(`enr-${userId}-${stageId}`, TENANT, userId, stageId, T0, T0 + dayOffset * 86_400_000);
}

function certify(stageId: string, dayOffset: number, revoked = false, userId = USER) {
  sqlite
    .prepare(
      `insert into certificates (id, tenant_id, user_id, stage_id, issued_at, revoked)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      `cert-${userId}-${stageId}`,
      TENANT,
      userId,
      stageId,
      T0 + dayOffset * 86_400_000,
      revoked ? 1 : 0,
    );
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec(SCHEMA_SQL);
  db = drizzle(fakeD1(sqlite) as never, { schema }) as unknown as Db;
});

describe("buildPathSnapshot", () => {
  it("公開ステージだけを、点いた順に写す", async () => {
    addStage("stage-a", "HTML/CSS 入門", "published");
    addStage("stage-b", "JavaScript 入門", "published");
    completeStage("stage-b", 5);
    completeStage("stage-a", 1);

    expect(await buildPathSnapshot(db, TENANT, USER)).toEqual([
      { id: "stage-a", title: "HTML/CSS 入門" },
      { id: "stage-b", title: "JavaScript 入門" },
    ]);
  });

  it("draft のステージは snapshot に入らない (未公開の教材名を漏らさない)", async () => {
    addStage("stage-a", "HTML/CSS 入門", "published");
    addStage("stage-secret", "社外秘の新研修 (下書き)", "draft");
    completeStage("stage-a", 1);
    completeStage("stage-secret", 2);
    // 修了証の側からも漏れないこと (クリアの定義は登録 ∪ 修了証)。
    certify("stage-secret", 3);

    const path = await buildPathSnapshot(db, TENANT, USER);
    expect(path).toEqual([{ id: "stage-a", title: "HTML/CSS 入門" }]);
    expect(JSON.stringify(path)).not.toContain("社外秘");
  });

  it("archived (退役した教材) も入らない", async () => {
    addStage("stage-old", "退役した研修", "archived");
    completeStage("stage-old", 1);
    certify("stage-old", 2);

    expect(await buildPathSnapshot(db, TENANT, USER)).toEqual([]);
  });

  it("修了証だけの星も入り、失効した修了証は入らない", async () => {
    addStage("stage-a", "SQL 入門", "published");
    addStage("stage-b", "Git 入門", "published");
    certify("stage-a", 2);
    certify("stage-b", 3, true);

    expect(await buildPathSnapshot(db, TENANT, USER)).toEqual([
      { id: "stage-a", title: "SQL 入門" },
    ]);
  });

  it("登録と修了証の両方がある星は 1 つに畳み、古い方の時刻で並べる", async () => {
    addStage("stage-a", "先にクリアした研修", "published");
    addStage("stage-b", "あとでクリアした研修", "published");
    completeStage("stage-a", 10);
    certify("stage-a", 1);
    completeStage("stage-b", 5);

    expect(await buildPathSnapshot(db, TENANT, USER)).toEqual([
      { id: "stage-a", title: "先にクリアした研修" },
      { id: "stage-b", title: "あとでクリアした研修" },
    ]);
  });

  it("他テナントのステージ・他人の記録は混ざらない", async () => {
    addStage("stage-a", "自分の研修", "published");
    completeStage("stage-a", 1);
    completeStage("stage-a", 1, "someone-else");

    expect(await buildPathSnapshot(db, "other-tenant", USER)).toEqual([]);
    expect(await buildPathSnapshot(db, TENANT, "someone-else")).toEqual([
      { id: "stage-a", title: "自分の研修" },
    ]);
  });
});
