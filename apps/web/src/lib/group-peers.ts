/** 仲間の進捗の帯で使う、表示用の純関数。 */

export interface PeerStageSnapshot {
  title: string;
  percent: number;
  cleared: boolean;
}

export type PeerNow =
  | { kind: "stage"; title: string }
  | { kind: "ahead" }
  | { kind: "done"; label: string }
  | { kind: "empty" };

/**
 * 「いま」の列。割合は出さない。
 * 1. 修了でなく割合が 0 より大きい、並び順で最初のステージ
 * 2. 見えないステージを始めている (`ahead`) → 「まだ開いていないステージ」
 * 3. 最後に修了したステージより後ろの最初の未修了 (無ければ並び順で最初の未修了)。未着手もここ
 * 4. 見えるステージがすべて修了で見えないステージがある → 次は見えないので「まだ開いていないステージ」
 * 5. グループのステージをすべて修了 → 「まで修了」
 */
export function peerNow(
  stages: readonly PeerStageSnapshot[],
  ahead: boolean,
  hasHiddenStages: boolean,
): PeerNow {
  const current = stages.find((stage) => !stage.cleared && stage.percent > 0);
  if (current) return { kind: "stage", title: current.title };
  if (ahead) return { kind: "ahead" };
  let lastCleared = stages.length - 1;
  while (lastCleared >= 0 && !stages[lastCleared]?.cleared) lastCleared--;
  const next =
    stages.slice(lastCleared + 1).find((stage) => !stage.cleared) ??
    stages.find((stage) => !stage.cleared);
  if (next) return { kind: "stage", title: next.title };
  if (hasHiddenStages) return { kind: "ahead" };
  const last = stages[stages.length - 1];
  if (last) return { kind: "done", label: `✓ ${last.title}まで修了` };
  return { kind: "empty" };
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
