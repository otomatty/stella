import assert from "node:assert/strict";
import { test } from "node:test";
import { formatMinutes, totalMinutes } from "../site/summary.js";

test("記録の分を合計する", () => {
  assert.equal(totalMinutes([{ minutes: 30 }, { minutes: 45 }]), 75);
});

test("1 時間に満たないときは分だけを返す", () => {
  assert.equal(formatMinutes(45), "45 分");
});

test("60 分以上は時間と分で返す", () => {
  assert.equal(formatMinutes(150), "2 時間 30 分");
});
