/**
 * 殿堂 (Hall of Fame) の型と純関数 — I/O を持たない (Phase 5)。
 *
 * 殿堂は「実在の受講者のストーリー」を載せる場所で、他の画面と決定的に違うのは
 * **人が写る**ことにある。だから仕組みの側で守るべき線をここに集めておく:
 *
 * ## 本人の同意なしに公開へ進む経路を作らない
 *
 * 状態は `nominated` → `submitted` → `published` の一方通行で、
 * **`submitted` にできるのは本人だけ / `published` にできるのは管理者だけ**。
 * 管理者は「本人が書いて出したもの」しか公開できず、管理者が代筆して公開する経路も、
 * 推薦からいきなり公開する経路も存在しない (`canPublish` が `submitted` だけを通す)。
 * 本人はいつでも `declined` (辞退) / `withdrawn` (取り下げ) にできる。
 *
 * ## 序列の数値を持たない
 *
 * XP・レベル・クリア数といった数値はこの型に **無い**。殿堂は順位表ではないので、
 * 型の側から「並べ替えられる数値」を排除しておく。載るのは名前・ジョブ (名乗り)・
 * 引用・歩んだ道 (ステージ名) と 4 章の本文だけ。
 *
 * ## ジョブ (名乗り) は表示専用
 *
 * 本人が自由に書く肩書きで、システムの分類・推薦・検索には一切使わない。長さの上限
 * (`HOF_JOB_TITLE_MAX`) だけを持ち、語彙は縛らない。
 */

/**
 * 殿堂エントリの状態。
 *
 *   - `nominated` … 管理者が推薦した (招待が届いている)。**まだ誰にも見えない**
 *   - `submitted` … 本人が記入して掲載を申請した (公開の同意はここで示される)
 *   - `published` … 管理者が内容を確認して公開した。ここだけが一般に見える
 *   - `declined`  … 本人が辞退した (不利益は無い。監査にも残さない)
 *   - `withdrawn` … 公開後に本人が取り下げた (即座に一般の読み出しから消える)
 */
export type HallOfFameStatus = "nominated" | "submitted" | "published" | "declined" | "withdrawn";

/** 公開されているか (一般の読み出しに出してよいか) の唯一の判定。 */
export function isHallOfFamePublic(status: HallOfFameStatus): boolean {
  return status === "published";
}

/**
 * 本人が記入・申請できる状態か。
 *
 * 公開後 (`published`) は編集させない — 管理者が読んで公開した本文が、誰も読み直さない
 * まま差し替わる経路を作らないため。直したいときは取り下げてからになる。
 *
 * **取り下げ (`withdrawn`) は編集できる。** 画面が「直したいときは一度取り下げて
 * ください」と案内している以上、取り下げた先が行き止まりだとその案内が嘘になる
 * (再招待も一意キーで塞がっていて、本人には戻る道が無かった)。取り下げ → 直す →
 * 出し直す、で元の輪に戻れる。公開はこのあとも管理者の操作なので、同意の順序
 * (本人が出す → 管理者が公開する) は変わらない。
 *
 * 辞退 (`declined`) は編集できない — こちらは「載りたくない」という意思表示で、
 * 直して出し直すための状態ではないため。
 */
export function canEditOwnEntry(status: HallOfFameStatus): boolean {
  return status === "nominated" || status === "submitted" || status === "withdrawn";
}

/** 本人が辞退できる状態か (公開後は「取り下げ」に変わる)。 */
export function canDecline(status: HallOfFameStatus): boolean {
  return status === "nominated" || status === "submitted";
}

/** 本人が取り下げられる状態か。 */
export function canWithdraw(status: HallOfFameStatus): boolean {
  return status === "published";
}

/**
 * 管理者が公開できる状態か。**`submitted` だけ**。
 *
 * ここが「本人の同意なく公開されない」ことの要。推薦しただけ (`nominated`)、辞退済み
 * (`declined`)、取り下げ済み (`withdrawn`) からは公開へ進めない。
 */
export function canPublish(status: HallOfFameStatus): boolean {
  return status === "submitted";
}

/** ジョブ (名乗り) の上限文字数。 */
export const HOF_JOB_TITLE_MAX = 40;

/** 引用 (トップのカードと詳細の大見出しに出る 1 文) の上限文字数。 */
export const HOF_QUOTE_MAX = 80;

/** 各章の上限文字数。 */
export const HOF_CHAPTER_MAX = 2000;

/** 4 章の並びと見出し。順序はこの配列が正 (画面も API もここを参照する)。 */
export const HOF_CHAPTERS = [
  {
    key: "orderReason",
    label: "この道を選んだ理由",
    hint: "学び始めたきっかけや、なぜこの順番で進めたのかを書いてください。",
  },
  {
    key: "struggle",
    label: "つまずいたところ",
    hint: "うまくいかなかったこと、そこをどう抜けたかを書いてください。",
  },
  {
    key: "currentWork",
    label: "いまの仕事",
    hint: "学んだことが今どんな形で仕事になっているかを書いてください。",
  },
  {
    key: "message",
    label: "これから始める人へ",
    hint: "同じ道をこれから歩く人へ、伝えたいことを書いてください。",
  },
] as const;

export type HallOfFameChapterKey = (typeof HOF_CHAPTERS)[number]["key"];

export type HallOfFameChapters = Record<HallOfFameChapterKey, string>;

export const EMPTY_HOF_CHAPTERS: HallOfFameChapters = {
  orderReason: "",
  struggle: "",
  currentWork: "",
  message: "",
};

/**
 * 制御文字・書式文字 (`\p{Cc}` / `\p{Cf}`)。
 *
 * 殿堂に載るのは **実名の隣に置かれる本人の文章** なので、見た目と実体がずれる字を
 * 通さない。特に `\p{Cf}` には U+202E (RLO) のような双方向制御が含まれ、残すと
 * 「表示される名乗り」と「保存されている文字列」が食い違う (staff が読んで公開を
 * 判断した文面と、受講者に見える文面がずれる)。改行は章だけ許す — 1 行の項目
 * (ジョブ・引用) に改行が入ると、カードの 1 行という前提が崩れる。
 */
const CONTROL_CHARS = /[\p{Cc}\p{Cf}]/gu;

function stripControls(raw: string, allowNewline: boolean): string {
  return raw.replace(CONTROL_CHARS, (ch) => (allowNewline && ch === "\n" ? ch : ""));
}

/**
 * 上限で切る。**コードポイント単位**で数える。
 *
 * `String.prototype.slice` は UTF-16 単位なので、絵文字や異体字セレクタの途中で切ると
 * 単独サロゲートが残り、以後の JSON 往復や描画が壊れる。
 */
function truncateByCodePoint(raw: string, max: number): string {
  const points = [...raw];
  return points.length <= max ? raw : points.slice(0, max).join("");
}

/**
 * 自由記述を整える (制御文字を落とす → 前後の空白を落とす → 上限で切る)。
 *
 * 切ってから trim すると末尾に空白だけが残った状態で上限に当たるので、順序はこの通り。
 */
function normalizeLine(raw: unknown, max: number, allowNewline = false): string {
  if (typeof raw !== "string") return "";
  return truncateByCodePoint(stripControls(raw, allowNewline).trim(), max);
}

export function normalizeJobTitle(raw: unknown): string {
  return normalizeLine(raw, HOF_JOB_TITLE_MAX);
}

export function normalizeQuote(raw: unknown): string {
  return normalizeLine(raw, HOF_QUOTE_MAX);
}

/**
 * 章の JSON を整える。
 *
 * **未知のキーは落とし、欠けたキーは空文字で埋める。** D1 には JSON 文字列として
 * 入るので、読み書きの両側でこれを通しておかないと、章が 1 つ増えた / 減った形の
 * 行が混ざって画面の描画が状態依存になる。
 *
 * 章だけは改行を残す (本文は段落で書かれる)。それ以外の制御文字・書式文字は落とす。
 */
export function normalizeHofChapters(raw: unknown): HallOfFameChapters {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_HOF_CHAPTERS };
  for (const chapter of HOF_CHAPTERS) {
    out[chapter.key] = normalizeLine(source[chapter.key], HOF_CHAPTER_MAX, true);
  }
  return out;
}

/** 掲載申請 / 公開に必要な項目が全部埋まっているか。 */
export function isHofContentComplete(input: {
  jobTitle: string;
  quote: string;
  chapters: HallOfFameChapters;
}): boolean {
  if (input.jobTitle.trim() === "" || input.quote.trim() === "") return false;
  return HOF_CHAPTERS.every((chapter) => input.chapters[chapter.key].trim() !== "");
}

/** 未記入の項目名 (画面が「あと何が要るか」を出すため)。 */
export function missingHofFields(input: {
  jobTitle: string;
  quote: string;
  chapters: HallOfFameChapters;
}): string[] {
  const missing: string[] = [];
  if (input.jobTitle.trim() === "") missing.push("ジョブ");
  if (input.quote.trim() === "") missing.push("引用");
  for (const chapter of HOF_CHAPTERS) {
    if (input.chapters[chapter.key].trim() === "") missing.push(chapter.label);
  }
  return missing;
}

/**
 * 掲載本文が同じか (ジョブ・引用・4 章のすべて)。
 *
 * 公開は「管理者が読んだ版」を `submitted_at` で固定する (CAS)。その版が意味を持つのは
 * **本文が変わるたびに `submitted_at` が進む** ときだけなので、「本文が変わったか」の
 * 判定をここに 1 つ置き、書き込み側がそれを見て版を進める。
 *
 * 中身が同じ保存 (押し直し) で版を進めないのは、管理者のプレビューを理由なく無効化
 * しないため。
 */
export function isSameHofContent(
  a: { jobTitle: string; quote: string; chapters: HallOfFameChapters },
  b: { jobTitle: string; quote: string; chapters: HallOfFameChapters },
): boolean {
  if (a.jobTitle !== b.jobTitle || a.quote !== b.quote) return false;
  return HOF_CHAPTERS.every((chapter) => a.chapters[chapter.key] === b.chapters[chapter.key]);
}

/** 「歩んだ道」の 1 ステージ (公開時に固定した記録)。 */
export interface HallOfFamePathStage {
  id: string;
  title: string;
}

/**
 * カードに出す道の数。
 *
 * 一覧では 3 つまで。全部並べると「多くこなした人ほど偉い」という読み方に寄るので、
 * カードは「どんな道か」が分かる長さで切り、続きは詳細で読ませる。
 */
export const HOF_PATH_PREVIEW_COUNT = 3;

/** `path_snapshot` の JSON を整える (壊れた行でも描けるようにする)。 */
export function normalizeHofPath(raw: unknown): HallOfFamePathStage[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const row = entry as { id?: unknown; title?: unknown };
    if (typeof row.id !== "string" || typeof row.title !== "string") return [];
    return [{ id: row.id, title: row.title }];
  });
}
