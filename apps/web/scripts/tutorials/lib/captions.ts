/** チャプターの秒数を字幕の表示区間に変える。時刻は動画の終わりで切る。 */
export function chaptersToVtt(
  chapters: readonly { t: number; title: string }[],
  duration: number,
): string {
  const timestamp = (seconds: number) => {
    const ms = Math.max(0, Math.round(seconds * 1000));
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
  };
  const escapeCue = (text: string) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replace(/\r?\n/g, " ");
  const cues = chapters.flatMap((chapter, i) => {
    const start = Math.max(0, chapter.t);
    const end = Math.min(duration, chapters[i + 1]?.t ?? duration);
    return end > start
      ? [`${i + 1}\n${timestamp(start)} --> ${timestamp(end)}\n${escapeCue(chapter.title)}\n`]
      : [];
  });
  return `WEBVTT\n\n${cues.join("\n")}`;
}
