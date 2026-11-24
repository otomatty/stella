import { readFile } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  collectShotNames,
  extractChangelogSection,
  parseChangelogItems,
} from "../../api/scripts/lib/release-notes.js";
import { version } from "../package.json";
import { webShots } from "../release-shots/scenarios";

it.each(Object.entries(webShots))("Web の撮影場面 %s に有効な名前と説明がある", (name, shot) => {
  expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(shot.description.trim()).not.toBe("");
});

it("Web の現在の版の CHANGELOG が登録済みの場面を参照する", async () => {
  const markdown = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
  const section = extractChangelogSection(markdown, version);
  expect(section).not.toBeNull();
  const { items, errors } = parseChangelogItems(section ?? "");
  expect(errors).toEqual([]);
  expect(Object.keys(webShots)).toEqual(expect.arrayContaining(collectShotNames(items)));
});
