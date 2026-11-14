import { validateClipId } from "../lib/clips";

export function recordingOptions(argv: string[]) {
  const args = argv.filter((arg) => arg !== "--");
  const filters: string[] = [];
  let clip: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--clip") {
      if (clip !== undefined) throw new Error("--clip は 1 回だけ指定してください");
      clip = args[++i];
      if (!clip || clip.startsWith("--"))
        throw new Error("--clip には id の一部を指定してください");
    } else if (["--save", "--no-narration", "--keep-frames"].includes(arg)) continue;
    else if (arg.startsWith("--")) throw new Error(`不明な引数: ${arg}`);
    else filters.push(arg);
  }
  const save = args.includes("--save");
  if (save && clip !== undefined) throw new Error("--clip と --save は同時に指定できません");
  if (save && args.includes("--no-narration"))
    throw new Error(
      "--save と --no-narration は同時に指定できません。教材には音声付きの動画を保存します",
    );
  return {
    clip,
    filters,
    save,
    noNarration: clip !== undefined || args.includes("--no-narration"),
    keepFrames: args.includes("--keep-frames"),
  };
}
export function selectsScenario(
  s: { id: string; clip?: string },
  options: ReturnType<typeof recordingOptions>,
) {
  if (s.clip !== undefined) validateClipId(s.clip);
  if (options.clip === undefined ? s.clip !== undefined : !s.clip?.includes(options.clip))
    return false;
  return !options.filters.length || options.filters.some((f) => s.id.includes(f));
}
