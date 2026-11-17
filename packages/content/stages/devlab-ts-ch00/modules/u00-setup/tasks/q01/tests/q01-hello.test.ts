import { expect, test } from "vitest";
import { hello } from "../src/q01-hello";

test('hello は "Hello, TypeScript" を返す', () => {
  expect(hello()).toBe("Hello, TypeScript");
});
