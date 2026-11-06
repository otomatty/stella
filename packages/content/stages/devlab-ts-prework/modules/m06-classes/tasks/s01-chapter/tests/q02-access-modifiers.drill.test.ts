// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  Account,
  Secret,
  HiddenCounter,
  Password,
  Settings,
  SerialNumber,
  Stock,
  Thermostat,
  Member,
  FixedPoint,
  Prepaid,
  FrozenList,
  Session,
  NumberCache,
  Journal,
  Ballot,
  Review,
  Ticket,
  Tank,
  PetDog,
} from "../src/q02-access-modifiers.drill";

test("問1 Account", () => {
  const account = new Account("A-1");
  expect(account.id).toBe("A-1");
  // @ts-expect-error id は読み取り専用
  account.id = "B";
  expectTypeOf(Account).constructorParameters.toEqualTypeOf<[id: string]>();
});

test("問2 Secret", () => {
  const secret = new Secret("abc");
  expect(secret.matches("abc")).toBe(true);
  expect(secret.matches("xyz")).toBe(false);
  // @ts-expect-error value は private
  expectTypeOf<Secret>().toHaveProperty("value");
  expectTypeOf<Secret["matches"]>().toEqualTypeOf<(guess: string) => boolean>();
});

test("問3 HiddenCounter", () => {
  const c = new HiddenCounter();
  c.increment();
  expect(c.increment()).toBe(2);
  expect(c.current()).toBe(2);
  // @ts-expect-error count は private
  expectTypeOf<HiddenCounter>().toHaveProperty("count");
  expectTypeOf<HiddenCounter["increment"]>().toEqualTypeOf<() => number>();
  expectTypeOf<HiddenCounter["current"]>().toEqualTypeOf<() => number>();
});

test("問4 Password", () => {
  const pw = new Password("abcd");
  expect(pw.check("abcd")).toBe(true);
  expect(pw.masked()).toBe("****");
  // @ts-expect-error raw は private
  expectTypeOf<Password>().toHaveProperty("raw");
  expectTypeOf<Password["check"]>().toEqualTypeOf<(input: string) => boolean>();
  expectTypeOf<Password["masked"]>().toEqualTypeOf<() => string>();
});

test("問5 Settings", () => {
  const s = new Settings({ theme: "dark" });
  expect(s.get("theme")).toBe("dark");
  expect(s.get("lang")).toBeUndefined();
  // @ts-expect-error values は private
  expectTypeOf<Settings>().toHaveProperty("values");
  expectTypeOf<Settings["get"]>().toEqualTypeOf<(key: string) => string | undefined>();
});

test("問6 SerialNumber", () => {
  const s = new SerialNumber("A");
  expect(s.next()).toBe("A-1");
  expect(s.next()).toBe("A-2");
  expectTypeOf(SerialNumber).constructorParameters.toEqualTypeOf<[prefix: string]>();
  expectTypeOf<SerialNumber["next"]>().toEqualTypeOf<() => string>();
});

test("問7 Stock", () => {
  const s = new Stock();
  s.add("りんご", 3);
  s.add("りんご", 2);
  expect(s.count("りんご")).toBe(5);
  expect(s.count("みかん")).toBe(0);
  // @ts-expect-error 在庫は private
  expectTypeOf<Stock>().toHaveProperty("items");
  expectTypeOf<Stock["add"]>().toEqualTypeOf<(item: string, n: number) => void>();
  expectTypeOf<Stock["count"]>().toEqualTypeOf<(item: string) => number>();
});

test("問8 Thermostat", () => {
  const t = new Thermostat();
  expect(t.getTarget()).toBe(20);
  t.setTarget(25);
  expect(t.getTarget()).toBe(25);
  expect(() => {
    t.setTarget(31);
  }).toThrow("10〜30度にしてください");
  // @ts-expect-error 設定温度は private
  expectTypeOf<Thermostat>().toHaveProperty("target");
  expectTypeOf<Thermostat["setTarget"]>().toEqualTypeOf<(n: number) => void>();
});

test("問9 Member", () => {
  const m = new Member("山田");
  expect(m.name).toBe("山田");
  expect(m.login()).toBe(1);
  expect(m.login()).toBe(2);
  // @ts-expect-error name は読み取り専用
  m.name = "佐藤";
  expectTypeOf<Member["login"]>().toEqualTypeOf<() => number>();
});

test("問10 FixedPoint", () => {
  const p = new FixedPoint(1, 2);
  const q = p.moved(3, 3);
  expect([q.x, q.y]).toEqual([4, 5]);
  expect([p.x, p.y]).toEqual([1, 2]);
  // @ts-expect-error x は読み取り専用なので代入できない
  p.x = 0;
  expectTypeOf<FixedPoint["moved"]>().toEqualTypeOf<(dx: number, dy: number) => FixedPoint>();
});

test("問11 Prepaid", () => {
  const p = new Prepaid(1000);
  p.pay(300);
  expect(p.getBalance()).toBe(700);
  expect(() => {
    p.pay(800);
  }).toThrow("残高が足りません");
  // @ts-expect-error 残高は private
  expectTypeOf<Prepaid>().toHaveProperty("balance");
  expectTypeOf<Prepaid["pay"]>().toEqualTypeOf<(n: number) => void>();
});

test("問12 FrozenList", () => {
  const source = ["a", "b"];
  const list = new FrozenList(source);
  source.push("c");
  expect(list.size()).toBe(2);
  expect(list.at(1)).toBe("b");
  expect(list.at(5)).toBeUndefined();
  // @ts-expect-error items は private
  expectTypeOf<FrozenList>().toHaveProperty("items");
  expectTypeOf(FrozenList).constructorParameters.toEqualTypeOf<[items: readonly string[]]>();
});

test("問13 Session", () => {
  const s = new Session();
  expect(s.isLoggedIn()).toBe(false);
  s.login("t");
  expect(s.isLoggedIn()).toBe(true);
  s.logout();
  expect(s.isLoggedIn()).toBe(false);
  // @ts-expect-error トークンは private
  expectTypeOf<Session>().toHaveProperty("token");
});

test("問14 NumberCache", () => {
  const c = new NumberCache();
  c.set("a", 1);
  expect(c.get("a")).toBe(1);
  expect(c.has("a")).toBe(true);
  expect(c.has("b")).toBe(false);
  // @ts-expect-error 入れ物は private
  expectTypeOf<NumberCache>().toHaveProperty("data");
});

test("問15 Journal", () => {
  const j = new Journal();
  j.write("a");
  const copied = j.lines();
  copied.push("x");
  expect(j.lines()).toEqual(["a"]);
  // @ts-expect-error 行の配列は private
  expectTypeOf<Journal>().toHaveProperty("entries");
  expectTypeOf<Journal["lines"]>().toEqualTypeOf<() => string[]>();
});

test("問16 Ballot", () => {
  const b = new Ballot();
  expect(b.result()).toBe("同数");
  b.yes();
  b.yes();
  b.no();
  expect(b.result()).toBe("賛成");
  // @ts-expect-error 票数は private
  expectTypeOf<Ballot>().toHaveProperty("yesCount");
  expectTypeOf<Ballot["result"]>().toEqualTypeOf<() => "賛成" | "反対" | "同数">();
});

test("問17 Review", () => {
  const r = new Review();
  expect(r.average()).toBe(0);
  r.add(4);
  r.add(5);
  expect(r.average()).toBe(4.5);
  expect(() => {
    r.add(6);
  }).toThrow("評価は1〜5です");
  // @ts-expect-error 評価の配列は private
  expectTypeOf<Review>().toHaveProperty("ratings");
});

test("問18 Ticket", () => {
  const t = new Ticket(1);
  expect(t.isUsed()).toBe(false);
  t.use();
  expect(t.isUsed()).toBe(true);
  expect(() => {
    t.use();
  }).toThrow("使用済みです");
  // @ts-expect-error 使ったかどうかは private
  expectTypeOf<Ticket>().toHaveProperty("used");
});

test("問19 Tank", () => {
  const t = new Tank(50);
  expect(t.refill(30)).toBe(30);
  expect(t.refill(30)).toBe(50);
  // @ts-expect-error capacity は読み取り専用
  t.capacity = 100;
  // @ts-expect-error 量は private
  expectTypeOf<Tank>().toHaveProperty("amount");
});

test("問20 PetDog", () => {
  expect(new PetDog("ポチ").speak()).toBe("ポチ: ワン");
  // @ts-expect-error name は protected なので外からは見えない
  expectTypeOf<PetDog>().toHaveProperty("name");
});
