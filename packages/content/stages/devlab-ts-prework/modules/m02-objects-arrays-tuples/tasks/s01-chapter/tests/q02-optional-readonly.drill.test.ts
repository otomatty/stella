// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import {
  greetUser,
  hasEmail,
  emailText,
  ageText,
  colorOf,
  perPageOf,
  createTodo,
  completeTodo,
  nameWithMiddle,
  isComplete,
  countFilled,
  payAmount,
  addressText,
  frozenPoint,
  moveRight,
  titleText,
  timeoutMs,
  isGuest,
  labelOf,
  settingText,
} from "../src/q02-optional-readonly.drill";

test("問1 greetUser", () => {
  expect(greetUser({ name: "山田太郎", nickname: "たろう" })).toBe("こんにちは、たろうさん");
  expect(greetUser({ name: "佐藤花子" })).toBe("こんにちは、佐藤花子さん");
  expectTypeOf(greetUser).parameters.toEqualTypeOf<[{ name: string; nickname?: string }]>();
  expectTypeOf(greetUser).returns.toEqualTypeOf<string>();
});

test("問2 hasEmail", () => {
  expect(hasEmail({ email: "a@example.com" })).toBe(true);
  expect(hasEmail({})).toBe(false);
  expectTypeOf(hasEmail).parameters.toEqualTypeOf<[{ email?: string }]>();
  expectTypeOf(hasEmail).returns.toEqualTypeOf<boolean>();
});

test("問3 emailText", () => {
  expect(emailText({ email: "a@example.com" })).toBe("a@example.com");
  expect(emailText({})).toBe("（未登録）");
  expectTypeOf(emailText).parameters.toEqualTypeOf<[{ email?: string }]>();
  expectTypeOf(emailText).returns.toEqualTypeOf<string>();
});

test("問4 ageText", () => {
  expect(ageText({ age: 30 })).toBe("30歳");
  expect(ageText({ age: 0 })).toBe("0歳");
  expect(ageText({})).toBe("年齢不明");
  expectTypeOf(ageText).parameters.toEqualTypeOf<[{ age?: number }]>();
  expectTypeOf(ageText).returns.toEqualTypeOf<string>();
});

test("問5 colorOf", () => {
  expect(colorOf({ color: "red" })).toBe("red");
  expect(colorOf({})).toBe("black");
  expectTypeOf(colorOf).parameters.toEqualTypeOf<[{ color?: string }]>();
  expectTypeOf(colorOf).returns.toEqualTypeOf<string>();
});

test("問6 perPageOf", () => {
  expect(perPageOf({ perPage: 50 })).toBe(50);
  expect(perPageOf({ perPage: 0 })).toBe(0);
  expect(perPageOf({})).toBe(20);
  expectTypeOf(perPageOf).parameters.toEqualTypeOf<[{ perPage?: number }]>();
  expectTypeOf(perPageOf).returns.toEqualTypeOf<number>();
});

test("問7 createTodo", () => {
  const todo = createTodo(1, "買い物");
  expect(todo).toEqual({ id: 1, title: "買い物", done: false });
  // @ts-expect-error id は読み取り専用なので代入できない
  todo.id = 2;
  expectTypeOf(createTodo).parameters.toEqualTypeOf<[number, string]>();
  expectTypeOf(createTodo).returns.toEqualTypeOf<{
    readonly id: number;
    title: string;
    done: boolean;
  }>();
});

test("問8 completeTodo", () => {
  const todo = { id: 1, title: "買い物", done: false };
  expect(completeTodo(todo)).toEqual({ id: 1, title: "買い物", done: true });
  expect(todo.done).toBe(false);
  expectTypeOf(completeTodo).parameters.toEqualTypeOf<
    [{ readonly id: number; title: string; done: boolean }]
  >();
  expectTypeOf(completeTodo).returns.toEqualTypeOf<{
    readonly id: number;
    title: string;
    done: boolean;
  }>();
});

test("問9 nameWithMiddle", () => {
  expect(nameWithMiddle({ first: "John", middle: "F", last: "Kennedy" })).toBe("John F Kennedy");
  expect(nameWithMiddle({ first: "Taro", last: "Yamada" })).toBe("Taro Yamada");
  expectTypeOf(nameWithMiddle).parameters.toEqualTypeOf<
    [{ first: string; middle?: string; last: string }]
  >();
  expectTypeOf(nameWithMiddle).returns.toEqualTypeOf<string>();
});

test("問10 isComplete", () => {
  expect(isComplete({ name: "山田", email: "a@example.com" })).toBe(true);
  expect(isComplete({ name: "山田" })).toBe(false);
  expect(isComplete({})).toBe(false);
  expectTypeOf(isComplete).parameters.toEqualTypeOf<[{ name?: string; email?: string }]>();
  expectTypeOf(isComplete).returns.toEqualTypeOf<boolean>();
});

test("問11 countFilled", () => {
  expect(countFilled({ a: "x", c: "z" })).toBe(2);
  expect(countFilled({})).toBe(0);
  expect(countFilled({ a: "", b: "", c: "" })).toBe(3);
  expectTypeOf(countFilled).parameters.toEqualTypeOf<[{ a?: string; b?: string; c?: string }]>();
  expectTypeOf(countFilled).returns.toEqualTypeOf<number>();
});

test("問12 payAmount", () => {
  expect(payAmount({ price: 1000, coupon: 200 })).toBe(800);
  expect(payAmount({ price: 1000 })).toBe(1000);
  expectTypeOf(payAmount).parameters.toEqualTypeOf<[{ price: number; coupon?: number }]>();
  expectTypeOf(payAmount).returns.toEqualTypeOf<number>();
});

test("問13 addressText", () => {
  expect(addressText({ city: "渋谷区", building: "渋谷ビル" })).toBe("渋谷区 渋谷ビル");
  expect(addressText({ city: "新宿区" })).toBe("新宿区");
  expectTypeOf(addressText).parameters.toEqualTypeOf<[{ city: string; building?: string }]>();
  expectTypeOf(addressText).returns.toEqualTypeOf<string>();
});

test("問14 frozenPoint", () => {
  const point = frozenPoint(1, 2);
  expect(point).toEqual({ x: 1, y: 2 });
  // @ts-expect-error x は読み取り専用なので代入できない
  point.x = 5;
  expectTypeOf(frozenPoint).parameters.toEqualTypeOf<[number, number]>();
  expectTypeOf(frozenPoint).returns.toEqualTypeOf<{ readonly x: number; readonly y: number }>();
});

test("問15 moveRight", () => {
  const point = { x: 1, y: 2 };
  expect(moveRight(point)).toEqual({ x: 2, y: 2 });
  expect(point).toEqual({ x: 1, y: 2 });
  expectTypeOf(moveRight).parameters.toEqualTypeOf<[{ readonly x: number; readonly y: number }]>();
  expectTypeOf(moveRight).returns.toEqualTypeOf<{ readonly x: number; readonly y: number }>();
});

test("問16 titleText", () => {
  expect(titleText({ title: "入門", subtitle: "TypeScript" })).toBe("入門: TypeScript");
  expect(titleText({ title: "入門" })).toBe("入門");
  expectTypeOf(titleText).parameters.toEqualTypeOf<[{ title: string; subtitle?: string }]>();
  expectTypeOf(titleText).returns.toEqualTypeOf<string>();
});

test("問17 timeoutMs", () => {
  expect(timeoutMs({ timeoutSeconds: 5 })).toBe(5000);
  expect(timeoutMs({})).toBe(30000);
  expectTypeOf(timeoutMs).parameters.toEqualTypeOf<[{ timeoutSeconds?: number }]>();
  expectTypeOf(timeoutMs).returns.toEqualTypeOf<number>();
});

test("問18 isGuest", () => {
  expect(isGuest({ name: "山田" })).toBe(true);
  expect(isGuest({ name: "佐藤", memberId: 0 })).toBe(false);
  expectTypeOf(isGuest).parameters.toEqualTypeOf<[{ name: string; memberId?: number }]>();
  expectTypeOf(isGuest).returns.toEqualTypeOf<boolean>();
});

test("問19 labelOf", () => {
  expect(labelOf({ id: 7, label: "会議室A" })).toBe("会議室A");
  expect(labelOf({ id: 7 })).toBe("#7");
  expectTypeOf(labelOf).parameters.toEqualTypeOf<[{ id: number; label?: string }]>();
  expectTypeOf(labelOf).returns.toEqualTypeOf<string>();
});

test("問20 settingText", () => {
  expect(settingText({ darkMode: true })).toBe("ダーク / 16px");
  expect(settingText({ darkMode: false, fontSize: 20 })).toBe("ライト / 20px");
  expectTypeOf(settingText).parameters.toEqualTypeOf<
    [{ readonly darkMode: boolean; fontSize?: number }]
  >();
  expectTypeOf(settingText).returns.toEqualTypeOf<string>();
});
