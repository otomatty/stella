export function calibrateJudge(labels, judgments) {
  const expectedIds = new Set(labels.map((row) => row.id));
  const decisions = new Map(judgments.map((row) => [row.id, row.pass]));
  if (
    expectedIds.size !== labels.length ||
    decisions.size !== judgments.length ||
    expectedIds.size !== decisions.size
  ) {
    throw new Error("ID の重複か件数の違いがあります");
  }
  if (!labels.some((row) => row.pass) || !labels.some((row) => !row.pass)) {
    throw new Error("人が合格、不合格とした例を両方用意してください");
  }

  const falsePassIds = [];
  const falseFailIds = [];
  for (const { id, pass } of labels) {
    if (!decisions.has(id)) throw new Error("採点器の判定がありません");
    if (decisions.get(id) === pass) continue;
    if (pass) falseFailIds.push(id);
    else falsePassIds.push(id);
  }
  const matched = labels.length - falsePassIds.length - falseFailIds.length;
  const agreement = matched / labels.length;
  return {
    agreement,
    falsePassIds,
    falseFailIds,
    ready: agreement >= 0.8 && falsePassIds.length === 0,
  };
}
