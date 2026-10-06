import { composeStories } from "@storybook/react-vite";
import { describe, expect, test } from "vitest";
import * as buttonStories from "../src/Button.stories.jsx";

// src/ の状態見本 (*.stories.jsx) をすべて読み込む。
const modules = import.meta.glob("../src/**/*.stories.jsx", { eager: true });

describe("状態見本", () => {
  test("Button に必要な状態がそろっている", () => {
    expect(Object.keys(composeStories(buttonStories))).toEqual(
      expect.arrayContaining(["Primary", "Secondary", "Disabled"]),
    );
  });

  // 見本を 1 つずつ表示し、play に書いた確認を通す。
  const stories = Object.entries(modules).flatMap(([file, module]) =>
    Object.entries(composeStories(module)).map(([name, story]) => [
      `${file.replace("../src/", "")} › ${name}`,
      story,
    ]),
  );
  test.each(stories)("%s を表示できる", async (_name, Story) => {
    await Story.run();
    expect(document.body).not.toBeEmptyDOMElement();
  });
});
