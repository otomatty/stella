import type { CodeSegment } from "./submission-highlight";

interface CodeBlock {
  startLine: number;
  endLine: number;
}

interface DeclarationBlock extends CodeBlock {
  name: string;
}

interface AlignedBlock {
  submitted: CodeBlock | null;
  reference: CodeBlock | null;
}

const JS_TS_PATH = /\.(?:js|mjs|cjs|jsx|ts|tsx)$/i;
const DECLARATION =
  /^\s*(?:export\s+(?:default\s+)?)?(?:declare\s+)?(?:(?:async\s+)?function(?:\s*\*\s*|\s+)|(?:abstract\s+)?class\s+|(?:const|let|var|interface|type|enum|namespace)\s+)([$_\p{ID_Start}][$_\p{ID_Continue}]*)/u;
const NON_CODE = /\bhljs-(?:comment|string|regexp)\b/;

function splitDeclarations(lines: CodeSegment[][]) {
  const declarations: DeclarationBlock[] = [];
  let depth = 0;
  for (const [index, line] of lines.entries()) {
    // 既存の字句解析を使い、コメントや文字列の括弧を深さに数えない。
    const code = line
      .map(({ text, className }) => (NON_CODE.test(className) ? " " : text))
      .join("");
    const name = depth === 0 ? DECLARATION.exec(code)?.[1] : undefined;
    if (name) {
      declarations.push({ name, startLine: index + 1, endLine: lines.length });
    }
    for (const bracket of code.matchAll(/[{}()[\]]/g)) {
      depth = Math.max(0, depth + ("{([".includes(bracket[0]) ? 1 : -1));
    }
  }

  for (const [index, block] of declarations.entries()) {
    const next = declarations[index + 1];
    if (next) block.endLine = next.startLine - 1;
  }
  const endLine = (declarations[0]?.startLine ?? lines.length + 1) - 1;
  const preamble = endLine > 0 ? { startLine: 1, endLine } : null;
  return { preamble, declarations };
}

/** 提出の順序で宣言を並べ、参考にしかない宣言を末尾に置く。 */
export function alignReference(
  submitted: CodeSegment[][],
  submittedPath: string,
  reference: CodeSegment[][],
  referencePath: string,
): AlignedBlock[] {
  const wholeFile = {
    submitted: { startLine: 1, endLine: submitted.length },
    reference: { startLine: 1, endLine: reference.length },
  };
  if (!JS_TS_PATH.test(submittedPath) || !JS_TS_PATH.test(referencePath)) return [wholeFile];

  const left = splitDeclarations(submitted);
  const right = splitDeclarations(reference);
  if (!left.declarations.length || !right.declarations.length) return [wholeFile];

  const rows: AlignedBlock[] = [];
  if (left.preamble || right.preamble) {
    rows.push({ submitted: left.preamble, reference: right.preamble });
  }
  const byName = new Map<string, DeclarationBlock[]>();
  for (const block of right.declarations) {
    const matches = byName.get(block.name) ?? [];
    matches.push(block);
    byName.set(block.name, matches);
  }
  const matched = new Set<DeclarationBlock>();
  for (const block of left.declarations) {
    const counterpart = byName.get(block.name)?.shift() ?? null;
    if (counterpart) matched.add(counterpart);
    rows.push({ submitted: block, reference: counterpart });
  }
  for (const block of right.declarations) {
    if (!matched.has(block)) rows.push({ submitted: null, reference: block });
  }
  return rows;
}
