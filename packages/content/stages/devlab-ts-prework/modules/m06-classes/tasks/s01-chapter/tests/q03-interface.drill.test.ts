// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  type Named,
  Cat,
  type HasArea,
  Square,
  type Greeting,
  JapaneseGreeting,
  type Figure,
  describeShape,
  type Priced,
  totalPrice,
  type Instrument,
  Bell,
  Drum,
  playAll,
  type FixedPoint,
  origin,
  type Animal,
  type Dog,
  dogLabel,
  type Logger,
  MemoryLogger,
  type KeyValueStore,
  MemoryStore,
  type Vehicle,
  Bike,
  Car,
  type Validator,
  MinLength,
  type Clock,
  FixedClock,
  elapsedSince,
  type PriceFormatter,
  YenFormatter,
  type TallyLike,
  makeTally,
  type Point2D,
  type Point3D,
  length3d,
  type LogEntry,
  latestEntry,
  type Repository,
  ArrayRepository,
  type Discount,
  PercentOff,
  AmountOff,
  applyDiscounts,
  type Serializable,
  JsonUser,
} from "../src/q03-interface.drill";

test("問1 Named", () => {
  const cat: Named = new Cat("ミケ");
  expect(cat.name).toBe("ミケ");
  expect(new Cat("ミケ").meow()).toBe("ミケ: ニャー");
  expectTypeOf<Named>().toEqualTypeOf<{ name: string }>();
});

test("問2 HasArea", () => {
  const shape: HasArea = new Square(3);
  expect(shape.area()).toBe(9);
});

test("問3 Greeting", () => {
  const g: Greeting = new JapaneseGreeting();
  expect(g.greet("山田")).toBe("こんにちは、山田さん");
});

test("問4 describeShape", () => {
  expect(describeShape({ name: "正方形", area: () => 9 })).toBe("正方形（面積 9）");
  expectTypeOf(describeShape).parameters.toEqualTypeOf<[Figure]>();
  expectTypeOf(describeShape).returns.toEqualTypeOf<string>();
});

test("問5 totalPrice", () => {
  expect(totalPrice([{ price: 100 }, { price: 50 }])).toBe(150);
  expectTypeOf(totalPrice).parameters.toEqualTypeOf<[readonly Priced[]]>();
  expectTypeOf(totalPrice).returns.toEqualTypeOf<number>();
});

test("問6 playAll", () => {
  expect(playAll([new Bell(), new Drum()])).toEqual(["チリン", "ドン"]);
  const instrument: Instrument = new Drum();
  expect(instrument.play()).toBe("ドン");
  expectTypeOf(playAll).parameters.toEqualTypeOf<[readonly Instrument[]]>();
  expectTypeOf(playAll).returns.toEqualTypeOf<string[]>();
});

test("問7 origin", () => {
  const p = origin();
  expect(p).toEqual({ x: 0, y: 0 });
  // @ts-expect-error x は読み取り専用なので代入できない
  p.x = 1;
  expectTypeOf<FixedPoint>().toEqualTypeOf<{ readonly x: number; readonly y: number }>();
  expectTypeOf(origin).parameters.toEqualTypeOf<[]>();
  expectTypeOf(origin).returns.toEqualTypeOf<FixedPoint>();
});

test("問8 dogLabel", () => {
  expect(dogLabel({ name: "ポチ", breed: "柴" })).toBe("ポチ（柴）");
  const dog: Dog = { name: "ポチ", breed: "柴" };
  const animal: Animal = dog;
  expect(animal.name).toBe("ポチ");
  expectTypeOf<Dog>().toEqualTypeOf<{ name: string; breed: string }>();
  expectTypeOf(dogLabel).parameters.toEqualTypeOf<[Dog]>();
  expectTypeOf(dogLabel).returns.toEqualTypeOf<string>();
});

test("問9 MemoryLogger", () => {
  const memory = new MemoryLogger();
  const logger: Logger = memory;
  logger.log("a");
  logger.log("b");
  expect(memory.lines).toEqual(["a", "b"]);
});

test("問10 MemoryStore", () => {
  const store: KeyValueStore = new MemoryStore();
  store.set("a", "1");
  expect(store.get("a")).toBe("1");
  expect(store.get("b")).toBeUndefined();
});

test("問11 Vehicle", () => {
  const vehicles: Vehicle[] = [new Bike(), new Car()];
  expect(vehicles.map((v) => v.wheels)).toEqual([2, 4]);
  expect(vehicles.map((v) => v.move())).toEqual(["スイスイ", "ブーン"]);
});

test("問12 MinLength", () => {
  const v: Validator = new MinLength(3);
  expect(v.validate("ab")).toBe(false);
  expect(v.validate("abc")).toBe(true);
});

test("問13 FixedClock", () => {
  const clock: Clock = new FixedClock(1500);
  expect(elapsedSince(clock, 1000)).toBe(500);
  expect(elapsedSince({ now: () => 10 }, 4)).toBe(6);
});

test("問14 YenFormatter", () => {
  const f: PriceFormatter = new YenFormatter();
  expect(f.format(1200)).toBe("1,200円");
});

test("問15 makeTally", () => {
  const t = makeTally();
  t.increment();
  t.increment();
  expect(t.count).toBe(2);
  expectTypeOf(makeTally).parameters.toEqualTypeOf<[]>();
  expectTypeOf(makeTally).returns.toEqualTypeOf<TallyLike>();
});

test("問16 length3d", () => {
  expect(length3d({ x: 1, y: 2, z: 2 })).toBe(3);
  const point: Point3D = { x: 1, y: 2, z: 3 };
  const flat: Point2D = point;
  expect(flat.x).toBe(1);
  expectTypeOf(length3d).parameters.toEqualTypeOf<[Point3D]>();
  expectTypeOf(length3d).returns.toEqualTypeOf<number>();
});

test("問17 latestEntry", () => {
  expect(
    latestEntry([
      { message: "a", at: 1 },
      { message: "b", at: 3 },
    ]),
  ).toEqual({ message: "b", at: 3 });
  expect(latestEntry([])).toBeUndefined();
  expectTypeOf(latestEntry).parameters.toEqualTypeOf<[readonly LogEntry[]]>();
  expectTypeOf(latestEntry).returns.toEqualTypeOf<LogEntry | undefined>();
});

test("問18 ArrayRepository", () => {
  const repo: Repository = new ArrayRepository(["a", "b"]);
  expect(repo.findById(2)).toBe("b");
  expect(repo.findById(3)).toBeUndefined();
});

test("問19 applyDiscounts", () => {
  expect(applyDiscounts(1000, [new PercentOff(10), new AmountOff(100)])).toBe(800);
  expect(applyDiscounts(50, [new AmountOff(100)])).toBe(0);
  expect(applyDiscounts(1000, [])).toBe(1000);
  expectTypeOf(applyDiscounts).parameters.toEqualTypeOf<[number, readonly Discount[]]>();
  expectTypeOf(applyDiscounts).returns.toEqualTypeOf<number>();
});

test("問20 JsonUser", () => {
  const s: Serializable = new JsonUser("山田", 30);
  expect(s.serialize()).toBe('{"name":"山田","age":30}');
});
