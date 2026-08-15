import { describe, expect, it } from "vitest";
import { transpileTypeScript } from "./transpile.js";

describe("transpileTypeScript", () => {
  it("型注釈を落として実行可能な JS にする", () => {
    const out = transpileTypeScript("const n: number = 1;\nconsole.log(n);");
    expect(out).not.toContain(": number");
    expect(out).toContain("console.log(n)");
  });

  it("interface と type は消える", () => {
    const out = transpileTypeScript(
      "type A = { a: string };\ninterface B { b: number }\nconsole.log(1);",
    );
    expect(out).not.toContain("interface");
    expect(out).not.toContain("type A");
  });

  it("構文エラーは例外として投げる", () => {
    expect(() => transpileTypeScript("const = ;")).toThrow(/TS\d+/);
  });
});
