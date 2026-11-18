import { expect, it } from "vitest";
import { createApp } from "../src/app";
import { records } from "../src/records";

const errorMessage: unknown = expect.stringMatching(/\S/);

it("指定週の記録と下書きも含めた合計を JSON で返す", async () => {
  const app = createApp();
  const response = await app.request("/weeks/2026-W10/records");

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/^application\/json\b/);
  expect(await response.json()).toEqual({
    week: "2026-W10",
    records: records.filter((record) => record.week === "2026-W10"),
    total: 50,
  });
});

it("作業時間が未入力の記録を一覧に残す", async () => {
  const app = createApp();
  const response = await app.request("/weeks/2026-W12/records");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    week: "2026-W12",
    records: records.filter((record) => record.week === "2026-W12"),
    total: 15,
  });
});

it("記録のない週には空の一覧と合計0分を返す", async () => {
  const app = createApp();
  const response = await app.request("/weeks/2026-W20/records");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    week: "2026-W20",
    records: [],
    total: 0,
  });
});

it.each(["2026-W1", "26-W10", "2026-w10", "2026-W10extra"])(
  "対象週 %s の形式が違うときは400を返す",
  async (week) => {
    const app = createApp();
    const response = await app.request(`/weeks/${week}/records`);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: errorMessage });
  },
);

it("同名の記録でも指定した ID だけを確定し、次の一覧にも反映する", async () => {
  const expectedRecords = records
    .filter((record) => record.week === "2026-W12")
    .map((record) => ({
      ...record,
      status: record.id === "r4" ? "confirmed" : record.status,
    }));
  const app = createApp();
  const response = await app.request("/records/r4/confirm", { method: "POST" });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    id: "r4",
    week: "2026-W12",
    title: "画面調整",
    minutes: 15,
    status: "confirmed",
  });

  const listing = await app.request("/weeks/2026-W12/records");

  expect(listing.status).toBe(200);
  expect(await listing.json()).toEqual({
    week: "2026-W12",
    records: expectedRecords,
    total: 15,
  });
});

it("存在しない ID を確定すると404を返す", async () => {
  const app = createApp();
  const response = await app.request("/records/unknown/confirm", {
    method: "POST",
  });

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: errorMessage });
});
