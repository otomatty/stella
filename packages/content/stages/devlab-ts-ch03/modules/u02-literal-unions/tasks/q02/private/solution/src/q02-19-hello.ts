// 問19 型 Lang（"ja" か "en"）を定義して export し、hello(lang: Lang) を書く。ja は "こんにちは"、en は "Hello"。戻り値は "こんにちは" | "Hello"
//     例: hello("en") → "Hello"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、リテラル型のユニオンを定義する。

export type Lang = "ja" | "en";

export function hello(lang: Lang): "こんにちは" | "Hello" {
  return lang === "ja" ? "こんにちは" : "Hello";
}
