import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadGlobalReadings, loadReadings } from "./narration-topics.js";

describe("loadReadings", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "narration-readings-"));
    file = join(dir, "narration-readings.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const write = (body: unknown) => writeFileSync(file, JSON.stringify(body), "utf8");

  it("表記から読みへの辞書をそのまま返す", () => {
    write({ Web: "ウェブ", "example.com": "イグザンプル ドット コム" });
    expect(loadReadings(file)).toEqual({
      Web: "ウェブ",
      "example.com": "イグザンプル ドット コム",
    });
  });

  it("ファイルが無ければ空の辞書", () => {
    expect(loadReadings(join(dir, "missing.json"))).toEqual({});
  });

  it("値が数値なら、ファイル名とキーを示して落ちる", () => {
    write({ Web: "ウェブ", HTTP: 123 });
    expect(() => loadReadings(file)).toThrow(
      /narration-readings\.json: "HTTP" の読みが文字列ではありません/,
    );
  });

  it("値が空文字なら落ちる (表記が読み上げから消えるため)", () => {
    write({ URL: "" });
    expect(() => loadReadings(file)).toThrow(/narration-readings\.json: "URL" の読みが空です/);
  });

  it("値が空白だけでも落ちる", () => {
    write({ URL: "  　" });
    expect(() => loadReadings(file)).toThrow(/"URL" の読みが空です/);
  });

  it("値がオブジェクトなら落ちる ([object Object] を読ませない)", () => {
    write({ OS: { reading: "オーエス" } });
    expect(() => loadReadings(file)).toThrow(/"OS" の読みが文字列ではありません/);
  });

  it.each([
    ["配列", ["ウェブ"]],
    ["null", null],
    ["文字列", "ウェブ"],
  ])("辞書全体が%sなら落ちる", (_label, body) => {
    write(body);
    expect(() => loadReadings(file)).toThrow(
      /narration-readings\.json: 読み辞書は .*のオブジェクトにしてください/,
    );
  });

  it("JSON として読めなければファイル名を示して落ちる", () => {
    writeFileSync(file, "{ Web: ウェブ }", "utf8");
    expect(() => loadReadings(file)).toThrow(
      /narration-readings\.json: 読み辞書の JSON を読めません/,
    );
  });
});

describe("loadGlobalReadings", () => {
  it("共通の辞書 (narration/readings.json) が検査を通る", () => {
    const readings = loadGlobalReadings();
    expect(Object.keys(readings).length).toBeGreaterThan(0);
  });
});
