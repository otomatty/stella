import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { expect, it } from "vitest";
import { extractChangelogSection, parseChangelogItems } from "./release-notes.js";

const root = new URL("../../../../", import.meta.url);

it.each(["web", "vscode"])("apps/%s の現在の版に変更履歴がある", (product) => {
  const packagePath = `apps/${product}/package.json`;
  const changelogPath = `apps/${product}/CHANGELOG.md`;
  const { version } = JSON.parse(readFileSync(new URL(packagePath, root), "utf8")) as {
    version: string;
  };
  const changelogUrl = new URL(changelogPath, root);
  const changelog = readFileSync(changelogUrl, "utf8");
  const section = extractChangelogSection(changelog, version);
  if (section === null) throw new Error(`${changelogPath} に ${version} の節がありません`);
  const { errors } = parseChangelogItems(section);
  expect(errors, errors.join("\n")).toEqual([]);
});
