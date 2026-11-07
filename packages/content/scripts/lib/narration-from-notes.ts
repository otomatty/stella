import { CUE_MAX_CHARS, type NarrationFile, slidesHash } from "../../src/narration.js";
import { splitSlides } from "../../src/split-slides.js";

/** 既存ファイルは内容や指紋によらず保持する。戻り値が undefined なら書き込まない。 */
export function narrationFromNotes(
  source: string,
  exists = false,
  force = false,
): NarrationFile | undefined {
  if (exists && !force) return undefined;
  return {
    schema: 1,
    slidesHash: slidesHash(source),
    slides: splitSlides(source).map((slide, i) => {
      if (!slide.note?.trim()) throw new Error(`スライド ${i + 1}: ノートがありません`);
      const sentences = slide.note.match(/[^。]+。?/gu) ?? [];
      const cues = sentences.flatMap((sentence, j) => {
        let chars = [...sentence.trim().replace(/\s*\n\s*/g, " ")];
        const texts: string[] = [];
        let offset = 0;
        while (chars.length > CUE_MAX_CHARS) {
          const comma = chars.slice(0, CUE_MAX_CHARS).lastIndexOf("、");
          if (comma === -1) {
            throw new Error(
              `スライド ${i + 1}、文 ${j + 1}、${offset + 1} 字目: ` +
                `${CUE_MAX_CHARS} 字以内に分割できる読点がありません「${chars.slice(0, CUE_MAX_CHARS + 1).join("")}」`,
            );
          }
          texts.push(chars.slice(0, comma + 1).join(""));
          offset += comma + 1;
          chars = chars.slice(comma + 1);
        }
        if (chars.length) texts.push(chars.join(""));
        return texts.filter((text) => text.trim()).map((text) => ({ text: text.trim() }));
      });
      if (!cues.length) throw new Error(`スライド ${i + 1}: ノートに文がありません`);
      return { cues };
    }),
  };
}
