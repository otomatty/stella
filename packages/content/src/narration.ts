/**
 * 教材動画のナレーション台本 (`narration.json`) の読み込み・指紋・読み上げ文・検証
 * (docs/superpowers/specs/2026-09-29-lesson-video-auto-generation-design.md の ①)。
 *
 * 台本はトピックディレクトリに `slides.md` と並べて置く任意ファイル。
 * `slides[i]` が `splitSlides(slides.md)` の i 枚目に対応し、各スライドは字幕 (cue) の列を持つ。
 * 秒数や座標は持たない — 時刻は音声の長さから video-timeline.ts が決める。
 *
 * ここは Node 標準 + split-slides だけに依存させる (CLI・検査・動画生成の全部が使う)。
 */

import { createHash } from "node:crypto";

import { parseSlides } from "./parse-slides.js";
import { splitSlides } from "./split-slides.js";

export const NARRATION_SCHEMA = 1;

/** 字幕 1 つの上限 (STYLE_GUIDE の「1 文 60 字以内」と同じ)。 */
export const CUE_MAX_CHARS = 60;
/** 1 スライドの字幕数の目安。超えたら警告 (詰め込みのサイン)。 */
export const CUES_PER_SLIDE_MAX = 5;
/** 読み上げ速度の見積り (字/秒)。長さの見積りと異常検知に使う。 */
export const SPEECH_CHARS_PER_SEC = 5.5;
/** トピック全体の推定長の目安 (秒)。外れたら警告、上限超えはエラー。 */
export const TOPIC_SECONDS_WARN_MIN = 90;
export const TOPIC_SECONDS_WARN_MAX = 200;
export const TOPIC_SECONDS_MAX = 300;

export interface NarrationCue {
  /** 画面の字幕 (プレーンテキスト・60 字以内)。 */
  text: string;
  /** 読み上げる文 (読み辞書で直らない読みだけを直したもの)。省略時は `text` を読む。 */
  speech?: string;
}

export interface NarrationSlide {
  cues: NarrationCue[];
}

export interface NarrationFile {
  schema: typeof NARRATION_SCHEMA;
  /** 台本を書いた時点のスライドの指紋 (`slidesHash()`)。 */
  slidesHash: string;
  /** 由来の記録 (下書きしたモデルとガイドの版)。検証には使わない。 */
  draft?: { model: string; guide: string };
  slides: NarrationSlide[];
}

/** 表記 → 読み。 */
export type Readings = Record<string, string>;

// ---------------------------------------------------------------- 読み込み

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** JSON を読んで形を確かめる。形が違えば理由付きで throw する。 */
export function parseNarration(json: string): NarrationFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`narration.json が JSON として読めません: ${(e as Error).message}`);
  }
  if (!isRecord(raw)) throw new Error("narration.json の最上位はオブジェクトにしてください");
  if (raw.schema !== NARRATION_SCHEMA) {
    throw new Error(`narration.json の schema は ${NARRATION_SCHEMA} にしてください`);
  }
  if (typeof raw.slidesHash !== "string" || raw.slidesHash === "") {
    throw new Error("narration.json に slidesHash がありません");
  }
  if (!Array.isArray(raw.slides)) throw new Error("narration.json に slides 配列がありません");
  const slides: NarrationSlide[] = raw.slides.map((s, i) => {
    if (!isRecord(s) || !Array.isArray(s.cues)) {
      throw new Error(`slides[${i}] に cues 配列がありません`);
    }
    return {
      cues: s.cues.map((c, j) => {
        if (!isRecord(c) || typeof c.text !== "string") {
          throw new Error(`slides[${i}].cues[${j}] に text がありません`);
        }
        if (c.speech !== undefined && typeof c.speech !== "string") {
          throw new Error(`slides[${i}].cues[${j}].speech は文字列にしてください`);
        }
        return c.speech === undefined ? { text: c.text } : { text: c.text, speech: c.speech };
      }),
    };
  });
  let draft: NarrationFile["draft"];
  if (isRecord(raw.draft) && typeof raw.draft.model === "string") {
    draft = { model: raw.draft.model, guide: String(raw.draft.guide ?? "") };
  }
  return { schema: NARRATION_SCHEMA, slidesHash: raw.slidesHash, draft, slides };
}

/** 書き出し用。キーの順序を固定して差分を読みやすくする。 */
export function stringifyNarration(n: NarrationFile): string {
  const ordered = {
    schema: n.schema,
    slidesHash: n.slidesHash,
    ...(n.draft ? { draft: n.draft } : {}),
    slides: n.slides.map((s) => ({
      cues: s.cues.map((c) => (c.speech ? { text: c.text, speech: c.speech } : { text: c.text })),
    })),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

// ---------------------------------------------------------------- 指紋

/**
 * 台本の前提になるスライドの指紋。各スライドの本文・講師ノート・見た目の型と、
 * front-matter の title / takeaway から作る。`introduces` / `requires` は含めない
 * (語彙台帳の整理で台本が「古い」扱いにならないように)。
 */
export function slidesHash(source: string): string {
  const fm = parseSlides(source);
  const slides = splitSlides(source).map((s) => [s.cls, s.body, s.note]);
  return createHash("sha256")
    .update(JSON.stringify({ title: fm.title, takeaway: fm.takeaway, slides }))
    .digest("hex")
    .slice(0, 16);
}

// ---------------------------------------------------------------- 読み上げ文

const ASCII_WORD_KEY = /^[A-Za-z0-9_]/;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 読み辞書を当てる。長い表記から順に 1 パスで置き換える (置き換えた結果に
 * 別の項目が再び当たることはない)。英数字で始まる表記は単語境界で当てる
 * (`let` が `letter` に当たらないように)。
 */
export function applyReadings(text: string, readings: Readings): string {
  const keys = Object.keys(readings)
    .filter((k) => k !== "")
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  if (keys.length === 0) return text;
  const pattern = keys
    .map((k) => {
      const body = escapeRegExp(k);
      return ASCII_WORD_KEY.test(k) ? `(?<![A-Za-z0-9_])${body}(?![A-Za-z0-9_])` : body;
    })
    .join("|");
  // 大文字小文字は区別する (`Web` と `web` を別の読みにできるように)。
  return text.replace(new RegExp(pattern, "g"), (m) => readings[m] ?? m);
}

/**
 * 字幕 1 つの読み上げ文。`speech` があればそれ、無ければ字幕を元にして、どちらにも
 * 読み辞書を当てる (`speech` には辞書で直らない部分だけを書けばよい)。
 */
export function speechOf(cue: NarrationCue, readings: Readings): string {
  return applyReadings(cue.speech ?? cue.text, readings).trim();
}

/** 講座共通の辞書に講座ごとの辞書を重ねる (講座側が勝つ)。 */
export function mergeReadings(...layers: (Readings | undefined)[]): Readings {
  return Object.assign({}, ...layers.filter(Boolean));
}

/** 読み上げの推定秒数。 */
export function estimateSpeechSeconds(speech: string): number {
  return [...speech.replace(/\s/g, "")].length / SPEECH_CHARS_PER_SEC;
}

// ---------------------------------------------------------------- 検証

export interface NarrationIssue {
  level: "error" | "warning";
  /** 0 始まり。トピック全体の指摘では undefined。 */
  slide?: number;
  cue?: number;
  message: string;
}

export interface NarrationContext {
  /** slides.md 全文 (front-matter・ノート込み)。 */
  slidesSource: string;
  /** doc.md のうち、このトピックの節 (`## <id> ...` から次の `## ` まで)。無ければ空。 */
  docSection?: string;
  /** 次トピックのタイトル。これを台本で言ってはいけない。最後のトピックでは undefined。 */
  nextTopicTitle?: string;
  readings: Readings;
}

/**
 * 読み上げ文に残してはいけない記号。コード記号は TTS が記号名を読むか黙るかが
 * プロバイダ次第で、括弧は話し言葉に無い (「かっこ」と読まれることがある)。
 */
const CODE_SYMBOLS = /[{}()[\];=<>`|\\（）]/;
/** 字幕に書かない Markdown 記法。 */
const MARKDOWN_IN_TEXT = /\*\*|`|^#|\]\(/;
const DIGITS = /[0-9０-９]+(?:[.,][0-9０-９]+)*/g;
/** 読みを当てずに残った英単語 (TTS がアルファベット読みしがち)。 */
const ASCII_WORD = /[A-Za-z][A-Za-z0-9+#.-]*/g;

function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

/** 比較用: 空白・句読点・括弧・強調記法を落とす。 */
export function normalizeForMatch(s: string): string {
  return s.replace(/\*\*|[\s、。・,.「」『』（）()！!？?"'“”:：]/g, "");
}

/** スライド本文の最初の見出し (`## 結論` → `結論`)。 */
export function slideHeading(body: string): string | null {
  const m = /^#{1,3}\s+(.+)$/m.exec(body);
  return m ? m[1].replace(/\*\*/g, "").trim() : null;
}

export function validateNarration(n: NarrationFile, ctx: NarrationContext): NarrationIssue[] {
  const issues: NarrationIssue[] = [];
  const error = (message: string, slide?: number, cue?: number) =>
    issues.push({ level: "error", slide, cue, message });
  const warn = (message: string, slide?: number, cue?: number) =>
    issues.push({ level: "warning", slide, cue, message });

  const slides = splitSlides(ctx.slidesSource);
  const fm = parseSlides(ctx.slidesSource);

  if (n.slides.length !== slides.length) {
    error(`スライドは ${slides.length} 枚ですが、台本は ${n.slides.length} 枚分です`);
  }
  const currentHash = slidesHash(ctx.slidesSource);
  if (n.slidesHash !== currentHash) {
    error(
      `slides.md が台本の作成後に変わっています (台本 ${n.slidesHash} / 現在 ${currentHash})。` +
        "`bun run --filter=@stella/content narrate -- <path> --force` で作り直すか、" +
        "内容が今のスライドに合っていれば `--accept` で承認してください",
    );
  }

  // 数字の出典: スライド (本文・ノート) と doc.md の該当節。
  const sourceDigits = new Set(
    [...toHalfWidthDigits(`${ctx.slidesSource}\n${ctx.docSection ?? ""}`).matchAll(DIGITS)].map(
      (m) => m[0],
    ),
  );
  const unknownAscii = new Set<string>();
  let totalSeconds = 0;

  n.slides.forEach((slide, i) => {
    if (slide.cues.length === 0) error("字幕がありません", i);
    if (slide.cues.length > CUES_PER_SLIDE_MAX) {
      warn(`字幕が ${slide.cues.length} 個あります (目安は ${CUES_PER_SLIDE_MAX} 個まで)`, i);
    }
    slide.cues.forEach((cue, j) => {
      const len = [...cue.text].length;
      if (len === 0) error("字幕が空です", i, j);
      if (len > CUE_MAX_CHARS) error(`字幕が ${len} 字あります (${CUE_MAX_CHARS} 字まで)`, i, j);
      if (/\n/.test(cue.text)) error("字幕に改行を入れないでください", i, j);
      if (MARKDOWN_IN_TEXT.test(cue.text)) {
        error("字幕に Markdown 記法 (** や ` など) を書かないでください", i, j);
      }
      const speech = speechOf(cue, ctx.readings);
      if (CODE_SYMBOLS.test(speech)) {
        error(
          `読み上げ文にコード記号が残っています: 「${speech}」 (言葉で説明するか speech を書いてください)`,
          i,
          j,
        );
      }
      for (const d of new Set(
        [...toHalfWidthDigits(`${cue.text} ${cue.speech ?? ""}`).matchAll(DIGITS)].map((m) => m[0]),
      )) {
        if (!sourceDigits.has(d)) {
          error(`数字「${d}」がスライド・ノート・doc.md のどこにもありません`, i, j);
        }
      }
      if (ctx.nextTopicTitle) {
        const title = normalizeForMatch(ctx.nextTopicTitle);
        if (
          title.length >= 4 &&
          (normalizeForMatch(cue.text).includes(title) || normalizeForMatch(speech).includes(title))
        ) {
          error(`次トピックのタイトル「${ctx.nextTopicTitle}」を言わないでください`, i, j);
        }
      }
      for (const m of speech.matchAll(ASCII_WORD)) unknownAscii.add(m[0]);
      totalSeconds += estimateSpeechSeconds(speech);
    });
  });

  // 結論スライドは takeaway をそのまま言う (STYLE_GUIDE)。
  const conclusion = slides.findIndex((s) => slideHeading(s.body) === "結論");
  if (conclusion !== -1 && n.slides[conclusion]) {
    const joined = normalizeForMatch(n.slides[conclusion].cues.map((c) => c.text).join(""));
    if (!joined.includes(normalizeForMatch(fm.takeaway))) {
      error(`結論スライドの字幕が takeaway「${fm.takeaway}」をそのまま含んでいません`, conclusion);
    }
  }

  const total = Math.round(totalSeconds);
  if (total > TOPIC_SECONDS_MAX) {
    error(`推定 ${total} 秒あります (${TOPIC_SECONDS_MAX} 秒まで)`);
  } else if (total < TOPIC_SECONDS_WARN_MIN || total > TOPIC_SECONDS_WARN_MAX) {
    warn(`推定 ${total} 秒です (目安 ${TOPIC_SECONDS_WARN_MIN}〜${TOPIC_SECONDS_WARN_MAX} 秒)`);
  }
  if (unknownAscii.size > 0) {
    warn(`読み辞書に無い英字が読み上げ文に残っています: ${[...unknownAscii].join(", ")}`);
  }
  return issues;
}

/** doc.md から、指定トピックの節 (`## <id> ...` から次の `## ` の手前まで) を取り出す。 */
export function docSectionFor(doc: string, topicId: string): string {
  const lines = doc.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => l.startsWith(`## ${topicId} `) || l === `## ${topicId}`);
  if (start === -1) return "";
  let end = lines.length;
  for (let k = start + 1; k < lines.length; k++) {
    if (lines[k].startsWith("## ")) {
      end = k;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/** 検証結果を 1 行ずつの文字列にする (CLI 用)。 */
export function formatIssue(label: string, issue: NarrationIssue): string {
  const where =
    issue.slide === undefined
      ? ""
      : ` slide ${issue.slide + 1}${issue.cue === undefined ? "" : ` cue ${issue.cue + 1}`}`;
  return `${issue.level === "error" ? "✗" : "⚠"} ${label}${where}: ${issue.message}`;
}
