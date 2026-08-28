/**
 * 腕試し (SkillCheck) の出題サンプリングと合否判定 — 純関数。I/O を持たない。
 *
 * 腕試しは「ステージ 1 つぶんの力があるか」を測るテストで、用途は 2 つ:
 *   1. レベル測定 … 開放済み / クリア済みの星で、いつでも受けられる
 *   2. 飛び級     … ロック星で合格すると、その星だけが即開く (前提は飛ばす)
 *
 * ## 出題は「乱数ではなく決定的」
 *
 * 出題と採点は別のリクエストなので、サーバは「どの問題を出したか」を両方の
 * リクエストで同じに再現できなければならない。素直な作りは出題時に受験票を保存
 * することだが、それは「開いただけで受験扱い」の行を作り、離脱するたびにゴミが残る。
 *
 * そこで **受験票を (利用者 × ステージ × 何回目か) から決定的に導く**。同じ受験の
 * 間は GET も POST も同じ 10 問を選び、受験が 1 回終わる (履歴が 1 行増える) と
 * 次の受験票は選び直される。乱数を使わないので保存も要らない (プールが 10 問以下だと
 * 「選び直し」が並べ替えにしかならない点は下記)。
 *
 * 同じ受験票を 2 つのタブで開いて両方提出する経路は、記録側 (API) で閉じてある:
 * 試行の INSERT が「導出に使った受験回数」と一致するときだけ通るので、2 つ目は
 * 採点されずに 429 で返る (`lib/skill-check-data.ts` の `insertSkillCheckAttempt`)。
 *
 * ## 出題は「回転しない」— 回数制限が防波堤
 *
 * プールが 10 問しか無いステージでは、10 問出すと毎回ほぼ同じ顔ぶれになる (種が
 * 変わっても選べる問題が他に無い)。**これは受容する。** 最低ラインを 25 問などに
 * 上げると、教材にクイズが揃うまでの大半のステージで腕試し自体が消えてしまい、
 * 飛び級の入口ごと無くなるためで、そちらの害の方が大きい。
 *
 * 代わりに **受験回数の上限 (`SKILL_CHECK_DAILY_LIMIT`) を防波堤にする**。
 * 出題が回らない以上、無制限に受けられれば「1 問ずつ答えを変えて正解を特定する」
 * 総当たりが成立してしまう (10 問 4 択なら座標降下で 40 回ほど)。1 日 3 回に絞ると
 * 同じ攻撃に最短でも 2 週間かかり、割に合わなくなる。回転しない前提を、回転させる
 * のではなく「試せる回数」で受け止める、という判断。
 *
 * ## 合格ラインは 80%
 *
 * 小テスト (`quizzes.pass_score`、既定 70%) より高い。飛び級は前提の学習を丸ごと
 * 飛ばす判定なので、通常の理解確認より厳しくする。
 */

/** 腕試しの合格ライン (%)。 */
export const SKILL_CHECK_PASS_SCORE = 80;

/** 1 回の腕試しで出す設問数の上限。 */
export const SKILL_CHECK_MAX_QUESTIONS = 10;

/**
 * 腕試しを成立させる最低の設問数。
 *
 * これを下回るステージは腕試し非対応 (合否が運になる)。教材側にクイズが揃うまでの
 * 過渡期があるので、エラーにせず「非対応」として応答で伝える。
 */
export const SKILL_CHECK_MIN_QUESTIONS = 5;

/**
 * 同じステージの腕試しを 1 日に受けられる回数 (アプリ基準 TZ の暦日で数える)。
 *
 * 上の「出題は回転しない」を受け止めるための上限。合否によらず数える — 不合格ぶんを
 * 数えないと、まさに総当たり (外れを繰り返して正解を絞る) が無制限になる。
 */
export const SKILL_CHECK_DAILY_LIMIT = 3;

/**
 * 文字列の 32bit ハッシュ (FNV-1a + 最終撹拌)。
 *
 * 暗号強度は要らない — 欲しいのは「同じ入力なら常に同じ、違う入力ならばらける」
 * だけ。`Math.random` を使わないのは、出題を保存せずに再現するため。
 *
 * **最終撹拌 (MurmurHash3 の fmix32) を必ず通す。** FNV-1a だけだと、末尾 1 文字しか
 * 違わない文字列のハッシュが「素数 × 差」ぶんしか離れず、大小関係が末尾の文字順に
 * ほぼ揃う。設問 id を `q0, q1, …` のように連番で作ると、ハッシュ順に並べたつもりが
 * ただの id 順になり、受験票が偏る (最初に気付いたのはまさにその形のテストだった)。
 */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // fmix32 — 下位ビットの違いを全体へ広げる。
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface SkillCheckPaperInput {
  /** 候補になる設問 id (そのステージの全クイズ設問)。 */
  questionIds: string[];
  userId: string;
  stageId: string;
  /** これまでの受験回数 (0 なら初回)。受験票を回ごとに変えるための種。 */
  attempt: number;
  /** 出題数の上限 (既定 `SKILL_CHECK_MAX_QUESTIONS`)。 */
  limit?: number;
}

/**
 * 受験票 (出題する設問 id) を決定的に選ぶ。
 *
 * 候補を「種つきハッシュ」の昇順に並べて先頭から取る。並びは候補の入力順に
 * 依存しないので、D1 の返す順が変わっても同じ受験票になる。同点 (ハッシュ衝突) は
 * id の辞書順で割る。
 */
export function selectSkillCheckPaper(input: SkillCheckPaperInput): string[] {
  const { questionIds, userId, stageId, attempt } = input;
  const limit = input.limit ?? SKILL_CHECK_MAX_QUESTIONS;
  const seed = `${userId}:${stageId}:${attempt}`;
  return [...new Set(questionIds)]
    .map((id) => ({ id, key: hash32(`${seed}:${id}`) }))
    .sort((a, b) => a.key - b.key || a.id.localeCompare(b.id))
    .slice(0, Math.max(limit, 0))
    .map((row) => row.id);
}

/** 得点率 (%)。満点 0 は 0% とする (合格にはしない)。 */
export function skillCheckPercent(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score * 100) / maxScore);
}

/**
 * 合否。**満点 0 は不合格**。
 *
 * 小テスト (`routes/quiz.ts`) は満点 0 を合格にしているが、あちらは「設問が無い
 * レッスンを完了させる」ための救済。腕試しで満点 0 を合格にすると、設問の無い
 * ステージへ空の解答を投げるだけで飛び級できてしまう。
 */
export function skillCheckPassed(score: number, maxScore: number): boolean {
  if (maxScore <= 0) return false;
  return skillCheckPercent(score, maxScore) >= SKILL_CHECK_PASS_SCORE;
}
