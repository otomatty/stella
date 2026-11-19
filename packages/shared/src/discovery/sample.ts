const DEFAULT_SAMPLE_LIMIT = 10;

/**
 * 文字列の 32bit ハッシュ (FNV-1a + 最終撹拌)。
 *
 * 暗号強度は要らない — 欲しいのは「同じ入力なら常に同じ、違う入力ならばらける」
 * だけ。`Math.random` を使わないのは、サンプルを再現するため。
 *
 * **最終撹拌 (MurmurHash3 の fmix32) を必ず通す。** FNV-1a だけだと、末尾 1 文字しか
 * 違わない文字列のハッシュが「素数 × 差」ぶんしか離れず、大小関係が末尾の文字順に
 * ほぼ揃う。設問 id を `q0, q1, …` のように連番で作ると、ハッシュ順に並べたつもりが
 * ただの id 順になり、選ばれる設問が偏る。
 */
function hash32(input: string): number {
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

export interface QuestionSampleInput {
  /** 候補になる設問 id (そのステージの全クイズ設問)。 */
  questionIds: string[];
  userId: string;
  stageId: string;
  /** サンプリングの種の一部。下書きの作成では 0 を使う。 */
  attempt: number;
  /** 設問数の上限 (既定 10 問)。 */
  limit?: number;
}

/**
 * 発見教材の下書きに複製する既存クイズの設問 id を決定的に選ぶ。
 *
 * 候補を「種つきハッシュ」の昇順に並べて先頭から取る。並びは候補の入力順に
 * 依存しないので、D1 の返す順が変わっても同じ設問が選ばれる。同点 (ハッシュ衝突) は
 * id の辞書順で割る。
 */
export function selectQuestionSample(input: QuestionSampleInput): string[] {
  const { questionIds, userId, stageId, attempt } = input;
  const limit = input.limit ?? DEFAULT_SAMPLE_LIMIT;
  const seed = `${userId}:${stageId}:${attempt}`;
  return [...new Set(questionIds)]
    .map((id) => ({ id, key: hash32(`${seed}:${id}`) }))
    .sort((a, b) => a.key - b.key || a.id.localeCompare(b.id))
    .slice(0, Math.max(limit, 0))
    .map((row) => row.id);
}
