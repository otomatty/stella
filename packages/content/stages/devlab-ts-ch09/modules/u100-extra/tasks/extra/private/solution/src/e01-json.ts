// 問題
// JSON.parse の戻り値は any です。外から来た JSON は、形を確かめてから使う必要があります。
// any を使わずに（unknown の変数に入れて）、次の関数を書いてください。
//
// 1. parseUser(json)
//    JSON の文字列を読み、{ id: number; name: string; tags: string[] } の形なら User として返す。
//    JSON として読めなければ "JSON として読めません"、形が違えば "ユーザーの形が違います" の Error を投げる
//
// 2. toJson(user)
//    User を、2つの空白で字下げした JSON の文字列にする（JSON.stringify の3つ目の引数）
//
// 3. parseEvent(json)
//    { "title": "勉強会", "at": "2026-04-01T10:00:00.000Z" } の形の JSON を読み、
//    { title: string; at: Date }（型 AppEvent）を返す（JSON には Date がないので、日時は文字列で入っている）。
//    title が文字列でない、または at が日時として読めない（new Date(at) が Invalid Date になる）ときは
//    "イベントの形が違います" の Error を投げる
//
// 4. eventToJson(event)
//    AppEvent を JSON の文字列にする（字下げなし）。at は "2026-04-01T10:00:00.000Z" の形になる
//
// 説明すること（答えは、この下に // のコメントで書く）
// - JSON.stringify で、値が undefined のプロパティや、関数のプロパティはどうなるか。試した結果を書く

export type User = { id: number; name: string; tags: string[] };
export type AppEvent = { title: string; at: Date };

function readJson(json: string): unknown {
  try {
    const data: unknown = JSON.parse(json);
    return data;
  } catch {
    throw new Error("JSON として読めません");
  }
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("id" in value && "name" in value && "tags" in value)) {
    return false;
  }
  const { id, name, tags } = value;
  if (typeof id !== "number" || typeof name !== "string" || !Array.isArray(tags)) {
    return false;
  }
  const items: readonly unknown[] = tags;
  return items.every((tag) => typeof tag === "string");
}

export function parseUser(json: string): User {
  const data = readJson(json);
  if (!isUser(data)) {
    throw new Error("ユーザーの形が違います");
  }
  return data;
}

export function toJson(user: User): string {
  return JSON.stringify(user, null, 2);
}

export function parseEvent(json: string): AppEvent {
  const data = readJson(json);
  if (
    typeof data !== "object" ||
    data === null ||
    !("title" in data) ||
    !("at" in data) ||
    typeof data.title !== "string" ||
    typeof data.at !== "string"
  ) {
    throw new Error("イベントの形が違います");
  }
  const at = new Date(data.at);
  if (Number.isNaN(at.getTime())) {
    throw new Error("イベントの形が違います");
  }
  return { title: data.title, at };
}

export function eventToJson(event: AppEvent): string {
  return JSON.stringify(event);
}
