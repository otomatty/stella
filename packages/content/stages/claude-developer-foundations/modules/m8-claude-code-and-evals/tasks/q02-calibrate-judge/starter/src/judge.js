export function calibrateJudge(labels, judgments) {
  // 仮の実装は、それぞれ何件通ったかだけで採用を決めています。
  const humanPasses = labels.filter((row) => row.pass).length;
  const judgePasses = judgments.filter((row) => row.pass).length;
  return {
    agreement: 0,
    falsePassIds: [],
    falseFailIds: [],
    ready: humanPasses === judgePasses,
  };
}
