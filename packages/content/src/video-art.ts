import { isRecord, validRegion, type ShotRegion } from "./video-shots";

export interface VideoArt {
  prompt: string;
  aspect: "1:1" | "16:9";
  regions?: Record<string, ShotRegion>;
}
/** 絵コンテ本体の型には依存せず、art だけを検査する。 */
export function parseVideoArt(input: unknown): Record<string, VideoArt> {
  if (input === undefined) return {};
  if (!isRecord(input)) throw new Error("art はオブジェクトにしてください");
  const errors: string[] = [];
  const result: Record<string, VideoArt> = Object.create(null);
  for (const [name, value] of Object.entries(input)) {
    if (!/^[a-z0-9-]+$/.test(name))
      errors.push(`art「${name}」: 名前は英小文字・数字・ハイフンにしてください`);
    if (!isRecord(value)) {
      errors.push(`art「${name}」: オブジェクトにしてください`);
      continue;
    }
    if (typeof value.prompt !== "string" || !value.prompt.trim())
      errors.push(`art「${name}」: prompt が必要です`);
    const aspect = value.aspect === undefined ? "1:1" : value.aspect;
    if (aspect !== "1:1" && aspect !== "16:9")
      errors.push(`art「${name}」: aspect は 1:1 か 16:9 にしてください`);
    if (value.regions !== undefined) {
      if (!isRecord(value.regions))
        errors.push(`art「${name}」: regions はオブジェクトにしてください`);
      else
        for (const [key, rect] of Object.entries(value.regions)) {
          if (!validRegion(rect, 1, 1))
            errors.push(`art「${name}」: 領域「${key}」は 0〜1 の画像内に収めてください`);
        }
    }
    result[name] = { ...value, aspect } as unknown as VideoArt;
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return result;
}
export const STYLE_REFERENCE =
  "Use the attached image only as the style reference (same character, same palette, same level of detail). Draw a new scene.";
export function buildArtRequest(style: string, art: VideoArt, referenceBase64?: string) {
  const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
  if (referenceBase64) {
    parts.push(
      { inlineData: { mimeType: "image/png", data: referenceBase64 } },
      { text: STYLE_REFERENCE },
    );
  }
  parts.push({ text: `${style.trim()}\n\nScene: ${art.prompt}` });
  return {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: art.aspect } },
  };
}

/** 明示した手本を優先し、省略時は従来どおり名前順の先頭を使う。 */
export function selectArtReference(
  files: string[],
  target?: string,
  reference?: string,
): string | undefined {
  if (reference !== undefined) {
    if (!/^[a-z0-9-]+$/.test(reference)) throw new Error("--ref の名前が不正です");
    if (!files.includes(`${reference}.png`))
      throw new Error(`--ref の画像がありません: ${reference}.png`);
    if (target === reference)
      throw new Error(`--ref は作り直す対象と同じ名前にできません: ${target}`);
    return `${reference}.png`;
  }
  return files.filter((f) => /^[a-z0-9-]+\.png$/.test(f) && f !== `${target}.png`).sort()[0];
}
