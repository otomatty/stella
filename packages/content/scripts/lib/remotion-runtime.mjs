import { readFileSync } from "node:fs";

/** @type {import("./remotion-render.ts").RemotionRequest} */
const request = JSON.parse(readFileSync(process.argv[2], "utf8"));

if (request.action === "bundle") {
  const { bundle } = await import("@remotion/bundler");
  const { entryPoint, rootDir, outDir } = request;
  await bundle({ entryPoint, rootDir, outDir, enableCaching: false });
} else {
  const { openBrowser, selectComposition, renderFrames, renderStill } = await import(
    "@remotion/renderer"
  );
  const { serveUrl, id, inputProps, browserExecutable, chromiumOptions, output } = request;
  const puppeteerInstance = await openBrowser("chrome", { browserExecutable, chromiumOptions });
  try {
    const options = { serveUrl, inputProps, puppeteerInstance, browserExecutable, chromiumOptions };
    const composition = await selectComposition({ ...options, id });
    if (request.action === "frames") {
      await renderFrames({
        ...options,
        composition,
        outputDir: output,
        imageFormat: "jpeg",
        jpegQuality: 90,
        imageSequencePattern: "frame-[frame].[ext]",
        onStart: () => undefined,
        onFrameUpdate: () => undefined,
      });
    } else {
      await renderStill({
        ...options,
        composition,
        frame: request.frame,
        imageFormat: "png",
        output,
      });
    }
  } finally {
    await puppeteerInstance.close({ silent: true });
  }
}
