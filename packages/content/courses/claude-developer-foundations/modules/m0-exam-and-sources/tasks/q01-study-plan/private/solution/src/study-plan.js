/**
 * 試験ガイドの配点に合わせて、学習時間を範囲ごとに配る。
 * @param {number} totalHours 学習に使える時間の合計
 * @param {{ name: string, weight: number }[]} domains 範囲の名前と配点
 * @returns {{ name: string, hours: number }[]} 範囲ごとの時間 (0.5 時間単位)
 */
export function allocateStudyHours(totalHours, domains) {
  const totalWeight = domains.reduce((sum, domain) => sum + domain.weight, 0);
  return domains.map((domain) => ({
    name: domain.name,
    hours: Math.round(((totalHours * domain.weight) / totalWeight) * 2) / 2,
  }));
}
