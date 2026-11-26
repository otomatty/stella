import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import manifest from "../package.json";

const { commands, views, walkthroughs } = manifest.contributes;
const availableCommands = new Set([
  ...commands.map(({ command }) => command),
  ...Object.values(views)
    .flat()
    .map(({ id }) => `${id}.focus`),
]);
const walkthrough = walkthroughs.find(({ id }) => id === "stella.gettingStarted");

describe("STELLA の課題の進め方", () => {
  it("処理中は確認・提出・相談のコマンドを止める", () => {
    for (const id of ["stella.runTask", "stella.submitTask", "stella.consultTask"]) {
      expect(commands.find((item) => item.command === id)?.enablement).toBe("!stella.taskBusy");
    }
  });

  it("4 段を順に登録し、開くコマンドを公開する", () => {
    expect(walkthrough?.steps.map(({ id }) => id)).toEqual(["open", "edit", "submit", "review"]);
    expect(availableCommands.has("stella.openWalkthrough")).toBe(true);
  });

  it.each(walkthrough?.steps ?? [])("$id のリンクと完了条件が有効なコマンドを指す", (step) => {
    const links = [...step.description.matchAll(/\]\(command:([\w.-]+)\)/g)];
    expect(links).toHaveLength(1);
    expect(availableCommands.has(links[0]?.[1] ?? "")).toBe(true);

    if (step.id === "open") {
      expect(step.completionEvents).toEqual(["onContext:stella.inTask"]);
    } else {
      expect(step.completionEvents).toEqual([`onCommand:${links[0]?.[1]}`]);
    }
  });

  it.each(walkthrough?.steps ?? [])("$id の図はテーマ色を使う自己完結した SVG", async (step) => {
    expect(step.media.svg).toBe(`media/walkthrough/${step.id}.svg`);
    expect(step.media.altText).not.toBe("");
    const svg = await readFile(new URL(`../${step.media.svg}`, import.meta.url), "utf8");
    expect(svg).toContain('viewBox="0 0 480 300"');
    expect(svg).not.toMatch(
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i,
    );
    for (const [, , paint] of svg.matchAll(/\b(?:fill|stroke)=(["'])(.*?)\1/g)) {
      expect(paint).toMatch(/^none$|^var\(--vscode-[\w-]+(?:, var\(--vscode-[\w-]+\))?\)$/);
    }
    expect(svg).not.toMatch(/<(?:script|image|foreignObject)\b|<!DOCTYPE|<\?xml-stylesheet/i);
    expect(svg).not.toMatch(/\b(?:href|src|on\w+)\s*=|\burl\s*\(|@import|@font-face/i);
  });
});
