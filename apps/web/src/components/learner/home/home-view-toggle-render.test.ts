import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

import { HomeViewToggle } from "./HomeViewToggle";

it.each([
  { value: "tree", treePressed: true, lanesPressed: false },
  { value: "lanes", treePressed: false, lanesPressed: true },
] as const)(
  "$value に対応する表示ボタンだけが押下状態になる",
  ({ value, treePressed, lanesPressed }) => {
    const markup = renderToStaticMarkup(
      createElement(HomeViewToggle, { value, onChange: vi.fn() }),
    );
    const buttons = markup.match(/<button\b.*?<\/button>/g) ?? [];

    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toContain("ツリー</button>");
    expect(buttons[0]).toContain(`aria-pressed="${treePressed}"`);
    expect(buttons[1]).toContain("カード</button>");
    expect(buttons[1]).toContain(`aria-pressed="${lanesPressed}"`);
  },
);
