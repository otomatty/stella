/** 仲間の進捗の帯で使う、表示用の純関数。 */

export interface PeerStageSnapshot {
  title: string;
  percent: number;
  cleared: boolean;
}

export type PeerNow =
  | { kind: "progress"; title: string; percent: number; compact: string }
  | { kind: "ahead"; label: string; compact: string }
  | { kind: "cleared"; title: string; label: string; compact: string }
  | { kind: "not-started"; label: string; compact: string };

const AHEAD_LABEL = "›› 先に進んでいます";
const NOT_STARTED_LABEL = "まだ始めていません";

/**
 * 「いま」の列。並び順で最初の、修了でなく割合が 0 より大きいステージを出す。
 * それが無いときは、先に進んでいること、最後に修了したステージ、未着手の順。
 */
export function peerNow(stages: readonly PeerStageSnapshot[], ahead: boolean): PeerNow {
  const current = stages.find((stage) => !stage.cleared && stage.percent > 0);
  if (current) {
    return {
      kind: "progress",
      title: current.title,
      percent: current.percent,
      compact: `${current.title} · ${current.percent}%`,
    };
  }
  if (ahead) return { kind: "ahead", label: AHEAD_LABEL, compact: AHEAD_LABEL };
  let lastCleared: PeerStageSnapshot | undefined;
  for (const stage of stages) {
    if (stage.cleared) lastCleared = stage;
  }
  if (lastCleared) {
    const label = `✓ ${lastCleared.title}まで修了`;
    return { kind: "cleared", title: lastCleared.title, label, compact: label };
  }
  return { kind: "not-started", label: NOT_STARTED_LABEL, compact: NOT_STARTED_LABEL };
}

/** 題名の「NN章」の数字。1 つでも無ければ並び順の 1 始まり。 */
const CHAPTER_NUMBER = /(?:^|[^\d])(\d{2})章/;

export function peerStageShortLabels(titles: readonly string[]): string[] {
  const numbers = titles.map((title) => CHAPTER_NUMBER.exec(title)?.[1]);
  if (titles.length > 0 && numbers.every((number): number is string => number !== undefined)) {
    return numbers;
  }
  return titles.map((_, index) => String(index + 1));
}

/**
 * 凡例に出す題名。短いラベルが題名の「NN章」の番号のときは、先頭の「NN章」と続く空白を除く。
 * 並び順の番号のとき、章番号が先頭に無いとき、除くと空になるときは題名のまま。
 */
export function peerLegendTitles(titles: readonly string[], shorts: readonly string[]): string[] {
  const fromChapter =
    titles.length > 0 &&
    titles.length === shorts.length &&
    titles.every((title, index) => CHAPTER_NUMBER.exec(title)?.[1] === shorts[index]);
  if (!fromChapter) return [...titles];
  return titles.map((title, index) => {
    const prefix = `${shorts[index]}章`;
    if (!title.startsWith(prefix)) return title;
    const rest = title.slice(prefix.length).replace(/^\s+/, "");
    return rest === "" ? title : rest;
  });
}

/**
 * 空白区切りで全員に共通する先頭の語を除く。
 * 除いたあとに何も残らない題名があるときは、題名をそのまま返す。
 */
export function stripSharedTitlePrefix(titles: readonly string[]): string[] {
  if (titles.length < 2) return [...titles];
  const words = titles.map((title) =>
    title
      .trim()
      .split(/\s+/)
      .filter((word) => word !== ""),
  );
  const first = words[0] ?? [];
  let shared = 0;
  for (let index = 0; index < first.length; index++) {
    const word = first[index];
    const allShare = words.every((row) => row[index] === word && row.length > index + 1);
    if (!allShare) break;
    shared = index + 1;
  }
  if (shared === 0) return [...titles];
  return words.map((row) => row.slice(shared).join(" "));
}

/** 段の吹き出しと読み上げ。修了は割合の代わりに「修了」。 */
export function peerStageBubble(stage: PeerStageSnapshot): string {
  return stage.cleared ? `${stage.title} 修了` : `${stage.title} ${stage.percent}%`;
}

/** 「その先」の吹き出し。題名は出さない。 */
export function peerHiddenBubble(ahead: boolean): string {
  return ahead ? "先に進んでいます" : "まだ開いていないステージ";
}
