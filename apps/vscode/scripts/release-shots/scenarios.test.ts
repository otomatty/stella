import { readFile, stat } from "node:fs/promises";
import { expect, it } from "vitest";
import {
  collectShotNames,
  extractChangelogSection,
  parseChangelogItems,
} from "../../../api/scripts/lib/release-notes.js";
import { version } from "../../package.json";
import { vscodeShots } from "./scenarios.js";

it.each(Object.entries(vscodeShots))(
  "VS Code の撮影場面 %s が実在する素材で WebView の HTML を生成する",
  async (name, shot) => {
    expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(shot.description.trim()).not.toBe("");
    const media = new URL("../../media/", import.meta.url);
    for (const file of [shot.media.style, shot.media.script]) {
      const url = new URL(file, media);
      expect(url.href.startsWith(media.href), file).toBe(true);
      expect((await stat(url)).isFile()).toBe(true);
    }
    const assets = {
      cspSource: "https://webview.example.test",
      styleUri: `https://assets.example.test/${shot.media.style}`,
      scriptUri: `https://assets.example.test/${shot.media.script}`,
      nonce: "test",
    };
    const html = shot.html(assets);
    expect(html).toContain("<html");
    expect(html).toContain(`style-src ${assets.cspSource}`);
    expect(html).toContain(`href="${assets.styleUri}"`);
    expect(html).toContain(`src="${assets.scriptUri}"`);
  },
);

it("VS Code の現在の版の CHANGELOG が登録済みの場面を参照する", async () => {
  const markdown = await readFile(new URL("../../CHANGELOG.md", import.meta.url), "utf8");
  const section = extractChangelogSection(markdown, version);
  expect(section).not.toBeNull();
  const { items, errors } = parseChangelogItems(section ?? "");
  expect(errors).toEqual([]);
  expect(Object.keys(vscodeShots)).toEqual(expect.arrayContaining(collectShotNames(items)));
});
