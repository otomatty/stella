// 09-e01 発展問題 JSON の読み書き
//
// 教材: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
//       https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
//
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

export function parseUser() {}

export function toJson() {}

export function parseEvent() {}

export function eventToJson() {}
