import {
  type EvidenceRef,
  type NormalizedRubricResult,
  PSEUDO_FILES,
} from "@stella/shared/review/ai-review";

const RECORD_PATHS = new Set<string>(Object.values(PSEUDO_FILES));

export function evidenceTarget(
  evidence: EvidenceRef,
  fileLineCounts: ReadonlyMap<string, number>,
): EvidenceRef | null {
  const { file, startLine, endLine } = evidence;
  const count = fileLineCounts.get(file);
  if (
    RECORD_PATHS.has(file) ||
    count === undefined ||
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 1 ||
    endLine < startLine ||
    endLine > count
  ) {
    return null;
  }
  return evidence;
}

export function evidenceLineLabel({ startLine, endLine }: EvidenceRef): string {
  return startLine === endLine ? `${startLine} 行` : `${startLine}–${endLine} 行`;
}

export function rubricEvidenceByLine(
  results: NormalizedRubricResult[] | undefined,
  file: string,
  fileLineCounts: ReadonlyMap<string, number>,
): Map<number, Set<string>> {
  const lines = new Map<number, Set<string>>();
  for (const item of results ?? []) {
    if (item.result === "met") continue;
    for (const evidence of item.evidence) {
      if (evidence.file !== file || !evidenceTarget(evidence, fileLineCounts)) continue;
      for (let line = evidence.startLine; line <= evidence.endLine; line++) {
        const labels = lines.get(line) ?? new Set<string>();
        if (line === evidence.startLine) {
          labels.add(`${item.required ? "必須" : "任意"} · ${item.id}`);
        }
        lines.set(line, labels);
      }
    }
  }
  return lines;
}
