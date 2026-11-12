import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { saveRecording } from "./save-recording";

it("コピーに失敗したら古い3ファイルを保ち、成功したら3つとも置き換える", async () => {
  const tempRoot = path.resolve(await mkdtemp(path.join(os.tmpdir(), "stella-save-recording-")));
  if (!tempRoot.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)) {
    throw new Error("テストの一時フォルダーが OS の一時ディレクトリの外にあります");
  }
  const outDir = path.join(tempRoot, "out");
  const topicDir = path.join(tempRoot, "topic");
  const extensions = ["mp4", "vtt", "jpg"];
  const screenFiles = extensions.map((extension) => `screen.${extension}`).sort();
  try {
    await mkdir(outDir);
    await mkdir(topicDir);
    for (const extension of extensions) {
      await writeFile(path.join(topicDir, `screen.${extension}`), `old ${extension}`);
      if (extension !== "vtt") {
        await writeFile(path.join(outDir, `edit-save.${extension}`), `new ${extension}`);
      }
    }

    await expect(saveRecording(outDir, "edit-save", topicDir)).rejects.toThrow();
    for (const extension of extensions) {
      expect(await readFile(path.join(topicDir, `screen.${extension}`), "utf8")).toBe(
        `old ${extension}`,
      );
    }
    expect((await readdir(topicDir)).sort()).toEqual(screenFiles);

    await writeFile(path.join(outDir, "edit-save.vtt"), "new vtt");
    await saveRecording(outDir, "edit-save", topicDir);
    for (const extension of extensions) {
      expect(await readFile(path.join(topicDir, `screen.${extension}`), "utf8")).toBe(
        `new ${extension}`,
      );
    }
    expect((await readdir(topicDir)).sort()).toEqual(screenFiles);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
