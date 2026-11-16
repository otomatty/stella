import { describe, expect, it } from "vitest";
import { buildArtRequest, parseVideoArt, selectArtReference, STYLE_REFERENCE } from "./video-art";
describe("イラストの定義とリクエスト", () => {
  it("art が無ければ空、縦横比は正方形が既定", () => {
    expect(parseVideoArt(undefined)).toEqual({});
    expect(parseVideoArt({ read: { prompt: "reading" } }).read).toEqual({
      prompt: "reading",
      aspect: "1:1",
    });
  });
  it("複数の定義エラーをまとめて報告する", () => {
    expect(() =>
      parseVideoArt({
        "../x": { prompt: "", aspect: "4:3", regions: { web: [0.9, 0, 0.3, 1] } },
        read: null,
      }),
    ).toThrow(/名前[\s\S]*prompt[\s\S]*aspect[\s\S]*領域[\s\S]*read/);
  });
  it.each([null, [], "art"])("オブジェクト以外を拒否: %j", (input) => {
    expect(() => parseVideoArt(input)).toThrow();
  });
  it("参照画像なしでは指示と Scene だけを送る", () => {
    const art = parseVideoArt({
      read: { prompt: "new scene", aspect: "16:9", regions: { web: [0.1, 0.2, 0.3, 0.5] } },
    }).read;
    expect(buildArtRequest(" style \n", art)).toEqual({
      contents: [{ role: "user", parts: [{ text: "style\n\nScene: new scene" }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } },
    });
  });
  it("参照画像、参照用途の指示、場面の順に送る", () => {
    const body = buildArtRequest("style", { prompt: "scene", aspect: "1:1" }, "BASE64");
    expect(body.contents[0].parts).toEqual([
      { inlineData: { mimeType: "image/png", data: "BASE64" } },
      { text: STYLE_REFERENCE },
      { text: "style\n\nScene: scene" },
    ]);
  });
});

describe("絵柄の手本", () => {
  const files = ["write.png", "check.png", "read.png", "other.pending.png", "notes.txt"];
  it("指定しなければ自分を除く名前順の先頭を選ぶ", () => {
    expect(selectArtReference(files, "write")).toBe("check.png");
    expect(selectArtReference(files, "check")).toBe("read.png");
    expect(selectArtReference(["read.png"], "read")).toBeUndefined();
  });
  it("--ref の手本を優先する", () => {
    expect(selectArtReference(files, "write", "read")).toBe("read.png");
    expect(selectArtReference(files, undefined, "read")).toBe("read.png");
  });
  it("手本が無い・対象と同じ・名前が不正なら拒む", () => {
    expect(() => selectArtReference(files, "read", "missing")).toThrow("画像がありません");
    expect(() => selectArtReference(files, "read", "read")).toThrow("同じ名前");
    for (const name of ["../read", "read.png", "", "Read"])
      expect(() => selectArtReference(files, "write", name)).toThrow("名前が不正");
  });
});
