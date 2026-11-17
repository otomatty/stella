import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type Profile,
  bioLength,
  companyLabel,
  departmentOf,
  findEmail,
} from "../src/q03-null-undefined";

const full: Profile = {
  name: "山田",
  bio: "TypeScriptを勉強中",
  company: { name: "サンプル商事", department: "開発部" },
};
const noDepartment: Profile = { name: "佐藤", company: { name: "サンプル商事" } };
const freelance: Profile = { name: "鈴木", company: null };

describe("bioLength", () => {
  test("bio の文字数を返す。なければ 0", () => {
    expect(bioLength(full)).toBe(14);
    expect(bioLength(freelance)).toBe(0);
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(bioLength).parameters.toEqualTypeOf<[Profile]>();
    expectTypeOf(bioLength).returns.toEqualTypeOf<number>();
  });
});

describe("departmentOf", () => {
  test("部署名を返す", () => {
    expect(departmentOf(full)).toBe("開発部");
  });

  test("部署がない、または会社がなければ 未設定", () => {
    expect(departmentOf(noDepartment)).toBe("未設定");
    expect(departmentOf(freelance)).toBe("未設定");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(departmentOf).parameters.toEqualTypeOf<[Profile]>();
    expectTypeOf(departmentOf).returns.toEqualTypeOf<string>();
  });
});

describe("companyLabel", () => {
  test("会社と部署の有無で表示を変える", () => {
    expect(companyLabel(full)).toBe("サンプル商事（開発部）");
    expect(companyLabel(noDepartment)).toBe("サンプル商事");
    expect(companyLabel(freelance)).toBe("フリー");
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(companyLabel).parameters.toEqualTypeOf<[Profile]>();
    expectTypeOf(companyLabel).returns.toEqualTypeOf<string>();
  });
});

describe("findEmail", () => {
  const emails = { 山田: "yamada@example.com", 佐藤: "sato@example.com" };

  test("見つかればメールアドレスを返す", () => {
    expect(findEmail(emails, "佐藤")).toBe("sato@example.com");
  });

  test("見つからなければ null を返す", () => {
    expect(findEmail(emails, "鈴木")).toBeNull();
  });

  test("引数と戻り値の型", () => {
    expectTypeOf(findEmail).parameters.toEqualTypeOf<[{ [name: string]: string }, string]>();
    expectTypeOf(findEmail).returns.toEqualTypeOf<string | null>();
  });
});
