// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Door,
  type Light,
  type Ticket,
  type Timer,
  closeDoor,
  openDoor,
  lockDoor,
  unlockDoor,
  doorText,
  turnOn,
  turnOff,
  dim,
  lightText,
  startTimer,
  pauseTimer,
  resetTimer,
  elapsedOf,
  assignTicket,
  closeTicket,
  reopen,
  assigneeOf,
  ticketText,
  canEdit,
  countUnfinished,
} from "../src/q08-order-status.drill";

test("問1 closeDoor", () => {
  expect(closeDoor({ state: "open" })).toEqual({ state: "closed" });
  expect(closeDoor({ state: "locked", key: "A" })).toEqual({ state: "locked", key: "A" });
  expectTypeOf(closeDoor).parameters.toEqualTypeOf<[Door]>();
  expectTypeOf(closeDoor).returns.toEqualTypeOf<Door>();
});

test("問2 openDoor", () => {
  expect(openDoor({ state: "closed" })).toEqual({ state: "open" });
  expect(openDoor({ state: "locked", key: "A" })).toEqual({ state: "locked", key: "A" });
  expect(openDoor({ state: "open" })).toEqual({ state: "open" });
  expectTypeOf(openDoor).parameters.toEqualTypeOf<[Door]>();
  expectTypeOf(openDoor).returns.toEqualTypeOf<Door>();
});

test("問3 lockDoor", () => {
  expect(lockDoor({ state: "closed" }, "A")).toEqual({ state: "locked", key: "A" });
  expect(lockDoor({ state: "open" }, "A")).toEqual({ state: "open" });
  expectTypeOf(lockDoor).parameters.toEqualTypeOf<[Door, string]>();
  expectTypeOf(lockDoor).returns.toEqualTypeOf<Door>();
});

test("問4 unlockDoor", () => {
  expect(unlockDoor({ state: "locked", key: "A" }, "A")).toEqual({ state: "closed" });
  expect(unlockDoor({ state: "locked", key: "A" }, "B")).toEqual({ state: "locked", key: "A" });
  expect(unlockDoor({ state: "open" }, "A")).toEqual({ state: "open" });
  expectTypeOf(unlockDoor).parameters.toEqualTypeOf<[Door, string]>();
  expectTypeOf(unlockDoor).returns.toEqualTypeOf<Door>();
});

test("問5 doorText", () => {
  expect(doorText({ state: "open" })).toBe("開いている");
  expect(doorText({ state: "closed" })).toBe("閉まっている");
  expect(doorText({ state: "locked", key: "A" })).toBe("鍵がかかっている");
  expectTypeOf(doorText).parameters.toEqualTypeOf<[Door]>();
  expectTypeOf(doorText).returns.toEqualTypeOf<string>();
});

test("問6 turnOn", () => {
  expect(turnOn({ state: "off" })).toEqual({ state: "on", brightness: 100 });
  expect(turnOn({ state: "on", brightness: 40 })).toEqual({ state: "on", brightness: 40 });
  expectTypeOf(turnOn).parameters.toEqualTypeOf<[Light]>();
  expectTypeOf(turnOn).returns.toEqualTypeOf<Light>();
});

test("問7 turnOff", () => {
  expect(turnOff({ state: "on", brightness: 40 })).toEqual({ state: "off" });
  expect(turnOff({ state: "off" })).toEqual({ state: "off" });
  expectTypeOf(turnOff).parameters.toEqualTypeOf<[Light]>();
  expectTypeOf(turnOff).returns.toEqualTypeOf<Light>();
});

test("問8 dim", () => {
  expect(dim({ state: "on", brightness: 80 }, 30)).toEqual({ state: "on", brightness: 50 });
  expect(dim({ state: "on", brightness: 20 }, 30)).toEqual({ state: "off" });
  expect(dim({ state: "off" }, 30)).toEqual({ state: "off" });
  expectTypeOf(dim).parameters.toEqualTypeOf<[Light, number]>();
  expectTypeOf(dim).returns.toEqualTypeOf<Light>();
});

test("問9 lightText", () => {
  expect(lightText({ state: "off" })).toBe("消灯");
  expect(lightText({ state: "on", brightness: 80 })).toBe("点灯（80%）");
  expectTypeOf(lightText).parameters.toEqualTypeOf<[Light]>();
  expectTypeOf(lightText).returns.toEqualTypeOf<string>();
});

test("問10 startTimer", () => {
  expect(startTimer({ state: "idle" }, 1000)).toEqual({ state: "running", startedAt: 1000 });
  expect(startTimer({ state: "paused", elapsed: 300 }, 1000)).toEqual({
    state: "running",
    startedAt: 700,
  });
  expect(startTimer({ state: "running", startedAt: 5 }, 1000)).toEqual({
    state: "running",
    startedAt: 5,
  });
  expectTypeOf(startTimer).parameters.toEqualTypeOf<[Timer, number]>();
  expectTypeOf(startTimer).returns.toEqualTypeOf<Timer>();
});

test("問11 pauseTimer", () => {
  expect(pauseTimer({ state: "running", startedAt: 1000 }, 1500)).toEqual({
    state: "paused",
    elapsed: 500,
  });
  expect(pauseTimer({ state: "idle" }, 1500)).toEqual({ state: "idle" });
  expectTypeOf(pauseTimer).parameters.toEqualTypeOf<[Timer, number]>();
  expectTypeOf(pauseTimer).returns.toEqualTypeOf<Timer>();
});

test("問12 resetTimer", () => {
  expect(resetTimer({ state: "paused", elapsed: 300 })).toEqual({ state: "idle" });
  expect(resetTimer({ state: "running", startedAt: 5 })).toEqual({ state: "idle" });
  expectTypeOf(resetTimer).parameters.toEqualTypeOf<[Timer]>();
  expectTypeOf(resetTimer).returns.toEqualTypeOf<Timer>();
});

test("問13 elapsedOf", () => {
  expect(elapsedOf({ state: "idle" }, 1800)).toBe(0);
  expect(elapsedOf({ state: "running", startedAt: 1000 }, 1800)).toBe(800);
  expect(elapsedOf({ state: "paused", elapsed: 300 }, 1800)).toBe(300);
  expectTypeOf(elapsedOf).parameters.toEqualTypeOf<[Timer, number]>();
  expectTypeOf(elapsedOf).returns.toEqualTypeOf<number>();
});

test("問14 assignTicket", () => {
  expect(assignTicket({ status: "open", title: "バグ" }, "山田")).toEqual({
    status: "assigned",
    title: "バグ",
    assignee: "山田",
  });
  expect(assignTicket({ status: "assigned", title: "バグ", assignee: "山田" }, "佐藤")).toEqual({
    status: "assigned",
    title: "バグ",
    assignee: "佐藤",
  });
  expect(assignTicket({ status: "closed", title: "バグ", resolution: "修正" }, "山田")).toEqual({
    status: "closed",
    title: "バグ",
    resolution: "修正",
  });
  expectTypeOf(assignTicket).parameters.toEqualTypeOf<[Ticket, string]>();
  expectTypeOf(assignTicket).returns.toEqualTypeOf<Ticket>();
});

test("問15 closeTicket", () => {
  expect(closeTicket({ status: "open", title: "バグ" }, "修正済み")).toEqual({
    status: "closed",
    title: "バグ",
    resolution: "修正済み",
  });
  expect(closeTicket({ status: "closed", title: "バグ", resolution: "重複" }, "修正済み")).toEqual({
    status: "closed",
    title: "バグ",
    resolution: "重複",
  });
  expectTypeOf(closeTicket).parameters.toEqualTypeOf<[Ticket, string]>();
  expectTypeOf(closeTicket).returns.toEqualTypeOf<Ticket>();
});

test("問16 reopen", () => {
  expect(reopen({ status: "closed", title: "バグ", resolution: "修正" })).toEqual({
    status: "open",
    title: "バグ",
  });
  expect(reopen({ status: "open", title: "バグ" })).toEqual({ status: "open", title: "バグ" });
  expectTypeOf(reopen).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(reopen).returns.toEqualTypeOf<Ticket>();
});

test("問17 assigneeOf", () => {
  expect(assigneeOf({ status: "assigned", title: "バグ", assignee: "山田" })).toBe("山田");
  expect(assigneeOf({ status: "open", title: "バグ" })).toBeUndefined();
  expectTypeOf(assigneeOf).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(assigneeOf).returns.toEqualTypeOf<string | undefined>();
});

test("問18 ticketText", () => {
  expect(ticketText({ status: "open", title: "バグ" })).toBe("[未対応] バグ");
  expect(ticketText({ status: "assigned", title: "バグ", assignee: "山田" })).toBe(
    "[担当: 山田] バグ",
  );
  expect(ticketText({ status: "closed", title: "バグ", resolution: "修正済み" })).toBe(
    "[完了: 修正済み] バグ",
  );
  expectTypeOf(ticketText).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(ticketText).returns.toEqualTypeOf<string>();
});

test("問19 canEdit", () => {
  expect(canEdit({ status: "open", title: "バグ" })).toBe(true);
  expect(canEdit({ status: "closed", title: "バグ", resolution: "修正" })).toBe(false);
  expectTypeOf(canEdit).parameters.toEqualTypeOf<[Ticket]>();
  expectTypeOf(canEdit).returns.toEqualTypeOf<boolean>();
});

test("問20 countUnfinished", () => {
  expect(
    countUnfinished([
      { status: "open", title: "a" },
      { status: "assigned", title: "b", assignee: "山田" },
      { status: "closed", title: "c", resolution: "修正" },
    ]),
  ).toBe(2);
  expect(countUnfinished([])).toBe(0);
  expectTypeOf(countUnfinished).parameters.toEqualTypeOf<[readonly Ticket[]]>();
  expectTypeOf(countUnfinished).returns.toEqualTypeOf<number>();
});
