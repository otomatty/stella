import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { InlineMarkdown } from "./InlineMarkdown";

it("型の山括弧を文字として残し、行内コードと太字を描画する", () => {
  const html = renderToStaticMarkup(
    createElement(InlineMarkdown, null, "`Array<number>` と Array<String> と **太字**"),
  );
  expect(html).toMatch(/<code\b[^>]*>Array&lt;number&gt;<\/code>/);
  expect(html).toContain("Array&lt;String&gt;");
  expect(html).toContain("<strong>太字</strong>");
});
