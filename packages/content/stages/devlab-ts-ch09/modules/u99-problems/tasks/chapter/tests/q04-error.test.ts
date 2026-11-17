import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type ValidationResult,
  ValidationError,
  describeError,
  validateAge,
  validateEmail,
  validateUser,
} from "../src/q04-error";

describe("ValidationError", () => {
  test("Error を継承し、field を持つ", () => {
    const error = new ValidationError("email", "形が違います");
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toBeInstanceOf(Error);
    expect(error.field).toBe("email");
    expect(error.message).toBe("形が違います");
    expect(error.name).toBe("ValidationError");
  });

  test("field は readonly", () => {
    const error = new ValidationError("email", "形が違います");
    // @ts-expect-error field は readonly なので書き換えられない
    error.field = "age";
    expectTypeOf(ValidationError).constructorParameters.toEqualTypeOf<[string, string]>();
  });
});

describe("validateEmail", () => {
  test("正しい形ならそのまま返す", () => {
    expect(validateEmail("taro@example.com")).toBe("taro@example.com");
  });

  test("形が違えば ValidationError", () => {
    for (const email of ["taro.example.com", "@example.com", "taro@", "a@b@c"]) {
      expect(() => validateEmail(email)).toThrow(ValidationError);
    }
    expect(() => validateEmail("x")).toThrow("メールアドレスの形が違います");
  });
});

describe("validateAge", () => {
  test("0〜150 の整数ならその数", () => {
    expect(validateAge(0)).toBe(0);
    expect(validateAge(150)).toBe(150);
  });

  test("そうでなければ ValidationError", () => {
    for (const age of [-1, 151, 20.5, "20", null]) {
      expect(() => validateAge(age)).toThrow(ValidationError);
    }
    expect(() => validateAge("20")).toThrow("年齢は0〜150の整数にしてください");
  });

  test("型", () => {
    expectTypeOf(validateAge).parameters.toEqualTypeOf<[unknown]>();
    expectTypeOf(validateAge).returns.toEqualTypeOf<number>();
  });
});

describe("validateUser", () => {
  test("どちらも通れば ok", () => {
    expect(validateUser({ email: "taro@example.com", age: 30 })).toEqual({
      ok: true,
      user: { email: "taro@example.com", age: 30 },
    });
  });

  test("通らなければ、エラーをすべて集める", () => {
    const result = validateUser({ email: "x", age: "abc" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.map((e) => e.field)).toEqual(["email", "age"]);
      expect(result.errors[0]).toBeInstanceOf(ValidationError);
    }
    const ageOnly = validateUser({ email: "taro@example.com", age: -5 });
    expect(ageOnly.ok ? [] : ageOnly.errors.map((e) => e.field)).toEqual(["age"]);
  });

  test("型", () => {
    expectTypeOf(validateUser).returns.toEqualTypeOf<ValidationResult>();
  });
});

describe("describeError", () => {
  test("エラーの種類ごとに説明する", () => {
    expect(describeError(new ValidationError("age", "年齢が違います"))).toBe("age: 年齢が違います");
    expect(describeError(new TypeError("型が違います"))).toBe("エラー: 型が違います");
    expect(describeError("文字列")).toBe("不明なエラー");
  });

  test("validateEmail で投げられたものを説明する", () => {
    try {
      validateEmail("x");
      expect.unreachable();
    } catch (error) {
      expect(describeError(error)).toBe("email: メールアドレスの形が違います");
    }
  });
});
