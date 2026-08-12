/**
 * slides.md をスライド単位に分割する。
 *
 * LMS はスライドを PDF ではなく Markdown として受け取り、React 側で 1 枚ずつ描画する。
 * 講師ノート（`<!-- ノート: ... -->`）は収録用の台本なので受講者向けの本文からは外し、
 * 別フィールドとして返す（将来スピーカーノート表示に使えるように捨てはしない）。
 */

export interface Slide {
  /** 講師ノートとディレクティブコメントを除いた本文 Markdown */
  body: string;
  /** 講師ノートの中身。無ければ null */
  note: string | null;
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const NOTE = /<!--\s*ノート:\s*([\s\S]*?)\s*-->/;
/** Marp 時代の名残のディレクティブコメント（`<!-- _class: lead -->` など） */
const DIRECTIVE = /<!--\s*_[\s\S]*?-->/g;

/** front-matter を落として本文だけを返す。 */
export function stripFrontMatter(source: string): string {
  const match = FRONT_MATTER.exec(source.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("slides.md に front-matter がありません");
  return match[2];
}

export function splitSlides(source: string): Slide[] {
  return stripFrontMatter(source)
    .split(/\n---\n/)
    .map((chunk) => {
      const noteMatch = NOTE.exec(chunk);
      const body = chunk.replace(NOTE, "").replace(DIRECTIVE, "").trim();
      return { body, note: noteMatch ? noteMatch[1].trim() : null };
    });
}
