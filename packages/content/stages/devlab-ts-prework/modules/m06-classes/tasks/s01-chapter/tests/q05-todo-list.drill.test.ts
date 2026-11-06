// このファイルは書き換えないでください
import { expect, test } from "vitest";
import {
  NoteBook,
  Playlist,
  ShoppingCart,
  Library,
  Scoreboard,
  EventCalendar,
  ParkingLot,
  PriorityQueue,
  Inbox,
  Gradebook,
  Elevator,
  VotingBox,
  HistoryWallet,
  ChatRoom,
  SeatReservation,
  TodoStore,
  LapTimer,
  RateLimiter,
  UndoCounter,
  TagIndex,
} from "../src/q05-todo-list.drill";

test("問1 NoteBook", () => {
  const book = new NoteBook();
  expect(book.add("買い物")).toBe(1);
  expect(book.add("掃除")).toBe(2);
  expect(book.get(1)).toBe("買い物");
  expect(book.get(3)).toBeUndefined();
  expect(book.count()).toBe(2);
});

test("問2 Playlist", () => {
  const list = new Playlist();
  expect(list.next()).toBeUndefined();
  list.add("A");
  list.add("B");
  expect([list.next(), list.next(), list.next()]).toEqual(["A", "B", "A"]);
});

test("問3 ShoppingCart", () => {
  const cart = new ShoppingCart();
  cart.add("りんご", 150, 2);
  cart.add("みかん", 80);
  expect(cart.total()).toBe(380);
  cart.add("りんご", 150);
  expect(cart.total()).toBe(530);
  cart.remove("りんご");
  expect(cart.total()).toBe(80);
});

test("問4 Library", () => {
  const lib = new Library();
  lib.addBook("A");
  lib.addBook("B");
  lib.borrow("A");
  expect(lib.available()).toEqual(["B"]);
  expect(() => {
    lib.borrow("A");
  }).toThrow("貸出中です: A");
  expect(() => {
    lib.borrow("C");
  }).toThrow("本がありません: C");
  lib.giveBack("A");
  expect(lib.available()).toEqual(["A", "B"]);
});

test("問5 Scoreboard", () => {
  const board = new Scoreboard();
  board.record("山田", 70);
  board.record("佐藤", 90);
  board.record("山田", 95);
  board.record("佐藤", 10);
  expect(board.best("山田")).toBe(95);
  expect(board.best("鈴木")).toBeUndefined();
  expect(board.top(1)).toEqual(["山田"]);
  expect(board.top(5)).toEqual(["山田", "佐藤"]);
});

test("問6 EventCalendar", () => {
  const cal = new EventCalendar();
  cal.add("2026-12-01", "会議");
  cal.add("2026-12-01", "勉強会");
  expect(cal.on("2026-12-01")).toEqual(["会議", "勉強会"]);
  expect(cal.on("2026-12-02")).toEqual([]);
  cal.on("2026-12-01").push("いたずら");
  expect(cal.on("2026-12-01")).toHaveLength(2);
});

test("問7 ParkingLot", () => {
  const lot = new ParkingLot(1);
  expect(lot.park("A")).toBe(true);
  expect(lot.park("B")).toBe(false);
  expect(lot.free()).toBe(0);
  lot.leave("A");
  expect(lot.free()).toBe(1);
});

test("問8 PriorityQueue", () => {
  const q = new PriorityQueue();
  expect(q.dequeue()).toBeUndefined();
  q.enqueue("a", 1);
  q.enqueue("b", 5);
  q.enqueue("c", 5);
  expect(q.dequeue()).toBe("b");
  expect(q.dequeue()).toBe("c");
  expect(q.dequeue()).toBe("a");
});

test("問9 Inbox", () => {
  const inbox = new Inbox();
  inbox.receive("山田", "こんにちは");
  inbox.receive("佐藤", "会議です");
  expect(inbox.unreadCount()).toBe(2);
  expect(inbox.read(0)).toBe("山田: こんにちは");
  expect(inbox.unreadCount()).toBe(1);
  expect(() => inbox.read(5)).toThrow("メッセージがありません");
});

test("問10 Gradebook", () => {
  const book = new Gradebook();
  expect(book.average()).toBe(0);
  book.add("山田", 80);
  book.add("佐藤", 50);
  expect(book.average()).toBe(65);
  expect(book.passed(60)).toEqual(["山田"]);
});

test("問11 Elevator", () => {
  const e = new Elevator(5);
  expect(e.current()).toBe(1);
  e.goTo(3);
  expect(e.current()).toBe(3);
  expect(e.history()).toEqual([1, 3]);
  expect(() => {
    e.goTo(6);
  }).toThrow("その階はありません");
});

test("問12 VotingBox", () => {
  const box = new VotingBox(["A", "B"]);
  expect(box.winner()).toBeUndefined();
  box.vote("B");
  expect(box.winner()).toBe("B");
  box.vote("A");
  expect(box.winner()).toBe("A");
  expect(() => {
    box.vote("C");
  }).toThrow("選択肢にありません: C");
});

test("問13 HistoryWallet", () => {
  const w = new HistoryWallet();
  expect(w.deposit(1000)).toBe(1000);
  expect(w.withdraw(300)).toBe(700);
  expect(() => w.withdraw(800)).toThrow("残高が足りません");
  expect(w.history()).toEqual(["+1000", "-300"]);
});

test("問14 ChatRoom", () => {
  const room = new ChatRoom();
  room.join("山田");
  room.post("山田", "こんにちは");
  expect(room.messages()).toEqual(["山田: こんにちは"]);
  room.leave("山田");
  expect(() => {
    room.post("山田", "まだいる？");
  }).toThrow("参加していません: 山田");
});

test("問15 SeatReservation", () => {
  const r = new SeatReservation();
  r.reserve("A1", "山田");
  r.reserve("A2", "山田");
  r.reserve("B1", "佐藤");
  expect(r.seatsOf("山田")).toEqual(["A1", "A2"]);
  expect(() => {
    r.reserve("A1", "鈴木");
  }).toThrow("予約済みです: A1");
  r.cancel("A1");
  expect(r.seatsOf("山田")).toEqual(["A2"]);
});

test("問16 TodoStore", () => {
  const store = new TodoStore();
  expect(store.add("a")).toBe(1);
  expect(store.add("b")).toBe(2);
  store.toggle(1);
  expect(store.remaining()).toBe(1);
  store.toggle(1);
  expect(store.remaining()).toBe(2);
  expect(() => {
    store.toggle(9);
  }).toThrow("ToDo がありません: 9");
});

test("問17 LapTimer", () => {
  const timer = new LapTimer();
  timer.start(1000);
  expect(timer.lap(1500)).toBe(500);
  expect(timer.lap(1800)).toBe(300);
  expect(timer.laps()).toEqual([500, 300]);
});

test("問18 RateLimiter", () => {
  const limiter = new RateLimiter(2, 1000);
  expect(limiter.hit(0)).toBe(true);
  expect(limiter.hit(100)).toBe(true);
  expect(limiter.hit(200)).toBe(false);
  expect(limiter.hit(1100)).toBe(true);
});

test("問19 UndoCounter", () => {
  const c = new UndoCounter();
  c.increment();
  c.increment();
  c.undo();
  expect(c.value()).toBe(1);
  c.undo();
  c.undo();
  expect(c.value()).toBe(0);
});

test("問20 TagIndex", () => {
  const index = new TagIndex();
  index.tag("記事1", "TS");
  index.tag("記事2", "TS");
  index.tag("記事1", "React");
  index.tag("記事1", "TS");
  expect(index.itemsWith("TS")).toEqual(["記事1", "記事2"]);
  expect(index.tagsOf("記事1")).toEqual(["TS", "React"]);
  expect(index.tagsOf("記事3")).toEqual([]);
});
