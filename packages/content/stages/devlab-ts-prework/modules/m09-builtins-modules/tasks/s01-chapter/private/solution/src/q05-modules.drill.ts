// 問1
export function double(n: number): number {
  return n * 2;
}

// 問2
export const MAX_ITEMS = 10;

// 問3
export type Point = { x: number; y: number };

// 問4
function add(a: number, b: number): number {
  return a + b;
}

function sub(a: number, b: number): number {
  return a - b;
}

export { add, sub };

// 問5
function internalSquare(n: number): number {
  return n * n;
}

export { internalSquare as square };

// 問6
import { priceWithTax } from "./q05-modules.lib";

export function withTax(price: number): number {
  return priceWithTax(price);
}

// 問7
import { formatYen as yen } from "./q05-modules.lib";

export function priceLabel(price: number): string {
  return yen(price);
}

// 問8
import greet from "./q05-modules.lib";

export function welcome(name: string): string {
  return `${greet(name)}！`;
}

// 問9
import * as shop from "./q05-modules.lib";

export function siteTitle(page: string): string {
  return `${page} | ${shop.SITE_NAME}`;
}

// 問10
import type { Product } from "./q05-modules.lib";

export function cheapest(items: readonly Product[]): Product | undefined {
  let result: Product | undefined;
  for (const item of items) {
    if (result === undefined || item.price < result.price) {
      result = item;
    }
  }
  return result;
}

// 問11
export { formatYen } from "./q05-modules.lib";

// 問12
export { priceWithTax as taxed } from "./q05-modules.lib";

// 問13
export { default as greetUser } from "./q05-modules.lib";

// 問14
export type { Product } from "./q05-modules.lib";

// 問15
export * as library from "./q05-modules.lib";

// 問16
function farewell(name: string): string {
  return `さようなら、${name}さん`;
}

export default farewell;

// 問17
export const half = (n: number): number => n / 2;

// 問18
import { SITE_NAME, products } from "./q05-modules.lib";

export function catalog(): string {
  return `${SITE_NAME}: ${products.map((p) => p.name).join("、")}`;
}

// 問19
import { TAX_RATE } from "./q05-modules.lib";

export function taxLabel(): string {
  return `消費税 ${Math.round(TAX_RATE * 100)}%`;
}

// 問20
export class Stack {
  private items: number[] = [];

  push(n: number): void {
    this.items.push(n);
  }

  pop(): number | undefined {
    return this.items.pop();
  }

  get size(): number {
    return this.items.length;
  }
}
