import { describe, expect, it } from "vitest";
import { findTestLine } from "./find-test-line.js";

describe("findTestLine", () => {
  it("最後の区切りの後を題に使い、完全に一致した最初の行を返す", () => {
    const source = [
      'test("合計を返すこと", () => {});',
      "test('合計を返す', () => {});",
      "test(`合計を返す`, () => {});",
    ].join("\r\n");
    expect(findTestLine(source, "演習 › 計算 › 合計を返す")).toBe(1);
  });

  it.each([
    [String.raw`test("a \"b\" (x+y)[0]", fn)`, 'a "b" (x+y)[0]'],
    [String.raw`test('it\'s a file at C:\\tmp', fn)`, "it's a file at C:\\tmp"],
    ["test(`a \\`b\\` and 'c'`, fn)", "a `b` and 'c'"],
    [String.raw`test("a \'b\'", fn)`, "a 'b'"],
    ['test("works", fn)', "works"],
  ])("引用符のエスケープを含む題を探す (%s)", (line, title) => {
    expect(findTestLine(`// case\n${line}`, title)).toBe(1);
  });

  it("C# の完全修飾名と短いメソッド名を探す", () => {
    const source = [
      "public void MyMethodLonger() {}",
      "public void PrefixMyMethod() {}",
      "public async Task MyMethod () {}",
      "public void MyMethod() {}",
    ].join("\n");
    expect(findTestLine(source, "Namespace.Class.MyMethod")).toBe(2);
    expect(findTestLine(source, "MyMethod")).toBe(2);
    expect(findTestLine("void MyMethod() {}", "Namespace.Class.MyMethod")).toBe(0);
  });

  it("題が見つからなければ undefined を返す", () => {
    expect(findTestLine('test("abcd", fn)', "a.*d")).toBeUndefined();
    expect(findTestLine(String.raw`test("\"abc", fn)`, "abc")).toBeUndefined();
    expect(findTestLine("public void Other() {}", "Class.Method")).toBeUndefined();
    expect(findTestLine('test("", fn)', "")).toBeUndefined();
  });
});
