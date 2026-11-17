import { describe, expect, expectTypeOf, test } from "vitest";
import { type AppEvent, type User, eventToJson, parseEvent, parseUser, toJson } from "../src/e01-json";

describe("parseUser", () => {
  test("形が合えば User", () => {
    expect(parseUser('{"id":1,"name":"山田","tags":["admin"]}')).toEqual({
      id: 1,
      name: "山田",
      tags: ["admin"],
    });
    expect(parseUser('{"id":2,"name":"佐藤","tags":[]}').tags).toEqual([]);
  });

  test("JSON として読めなければ Error", () => {
    expect(() => parseUser("{id:1}")).toThrow("JSON として読めません");
  });

  test("形が違えば Error", () => {
    for (const json of [
      '{"id":"1","name":"山田","tags":[]}',
      '{"id":1,"name":"山田"}',
      '{"id":1,"name":"山田","tags":[1]}',
      "null",
      "[]",
    ]) {
      expect(() => parseUser(json)).toThrow("ユーザーの形が違います");
    }
  });

  test("型", () => {
    expectTypeOf(parseUser).returns.toEqualTypeOf<User>();
  });
});

describe("toJson", () => {
  test("字下げ付き", () => {
    const user: User = { id: 1, name: "山田", tags: ["admin"] };
    expect(toJson(user)).toBe('{\n  "id": 1,\n  "name": "山田",\n  "tags": [\n    "admin"\n  ]\n}');
    expect(parseUser(toJson(user))).toEqual(user);
  });
});

describe("parseEvent", () => {
  test("日時を Date にする", () => {
    const event = parseEvent('{"title":"勉強会","at":"2026-04-01T10:00:00.000Z"}');
    expect(event.title).toBe("勉強会");
    expect(event.at).toBeInstanceOf(Date);
    expect(event.at.getTime()).toBe(Date.UTC(2026, 3, 1, 10));
  });

  test("形が違えば Error", () => {
    expect(() => parseEvent('{"title":"勉強会","at":"あした"}')).toThrow("イベントの形が違います");
    expect(() => parseEvent('{"title":1,"at":"2026-04-01T10:00:00.000Z"}')).toThrow(
      "イベントの形が違います",
    );
    expect(() => parseEvent('{"title":"勉強会"}')).toThrow("イベントの形が違います");
  });

  test("型", () => {
    expectTypeOf(parseEvent).returns.toEqualTypeOf<AppEvent>();
  });
});

describe("eventToJson", () => {
  test("Date は ISO の文字列になる", () => {
    const event: AppEvent = { title: "勉強会", at: new Date(Date.UTC(2026, 3, 1, 10)) };
    expect(eventToJson(event)).toBe('{"title":"勉強会","at":"2026-04-01T10:00:00.000Z"}');
    expect(parseEvent(eventToJson(event))).toEqual(event);
  });
});
