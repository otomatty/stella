// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cheapestName, type Product, type Service } from "../src/q07-18-cheapest-name";
test("問18 cheapestName", () => {
  const product: Product = { name: "りんご", price: 150, stock: 10 };
  const service: Service = { name: "相談", price: 3000, hours: 1 };
  expect(cheapestName([service, product])).toBe("りんご");
  expect(() => cheapestName([])).toThrow(Error);
  expectTypeOf(cheapestName).parameters.toEqualTypeOf<
    [readonly { name: string; price: number }[]]
  >();
  expectTypeOf(cheapestName).returns.toEqualTypeOf<string>();
});
