import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, it, vi } from "vitest";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("node:child_process", async () => {
  const { promisify } = await import("node:util");
  return { execFile: Object.assign(vi.fn(), { [promisify.custom]: execute }) };
});
import { writeClip } from "./clip-output";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  execute.mockReset();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it.each([false, true])(
  "formats the written clip JSON without a shell, formatter failure=%s",
  async (fail) => {
    const root = await mkdtemp(join(tmpdir(), "stella-clip-output-"));
    roots.push(root);
    const video = join(root, "source.mp4");
    await writeFile(video, "fixture video");
    execute.mockResolvedValueOnce({
      stdout: JSON.stringify({
        streams: [
          {
            codec_type: "video",
            codec_name: "h264",
            pix_fmt: "yuv420p",
            width: 1600,
            height: 1000,
            avg_frame_rate: "30/1",
            r_frame_rate: "30/1",
          },
        ],
        format: { duration: "12.233333" },
      }),
    });
    if (fail) execute.mockRejectedValueOnce(new Error("formatter unavailable"));
    else execute.mockResolvedValueOnce({ stdout: "formatted" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {
      /* 検査の出力を抑える。 */
    });
    await writeClip(
      root,
      video,
      "web/lesson",
      "source.ts",
      { open: [4.977999925613403, 8.335000038146973] },
      {},
    );
    const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
    const file = join(root, "web/lesson.json");
    expect(execute).toHaveBeenNthCalledWith(
      2,
      join(repoRoot, "node_modules/.bin/biome"),
      ["format", "--write", file],
      { cwd: repoRoot, shell: false },
    );
    expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({
      duration: 12.23,
      marks: { open: [4.98, 8.34] },
    });
    expect(await readFile(join(root, "web/lesson.mp4"), "utf8")).toBe("fixture video");
    expect(await readdir(join(root, "web"))).toEqual(["lesson.json", "lesson.mp4"]);
    if (fail)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Biome で整形できませんでした"));
    else expect(warn).not.toHaveBeenCalled();
  },
);
