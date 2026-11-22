/** 起動時の準備。場面の生成コードは既存動画のハッシュに含まれる。 */
import { argumentsOf, buildSceneVideos } from "./build-scene-video.js";
import { loadVideoVoice } from "./build-video.js";
import { logVideoTts, prepareOpenJtalk } from "./lib/tts.js";

try {
  const args = process.argv.slice(2);
  const options = argumentsOf(args);
  if (!options.stills) {
    const { provider } = loadVideoVoice(options.tts);
    logVideoTts(provider);
    if (provider === "openjtalk") prepareOpenJtalk();
  }
  await buildSceneVideos(args);
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
}
