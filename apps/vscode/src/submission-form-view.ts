import type { DebuggingRecord } from "@stella/shared/tasks/submission";

export const REFLECTION_TEMPLATE = "## 取り組んだこと\n\n## 確認したこと\n\n## 振り返り\n";
export const CONSULT_TEMPLATE =
  "## 困っていること\n\n## 期待した動きと実際の動き\n\n## 試したこと\n";
export const DEBUGGING_LABELS: Record<keyof DebuggingRecord, string> = {
  reproduction: "再現手順",
  expected: "期待した結果と実際の結果",
  cause: "原因",
  fix: "変更した箇所と修正",
  regression: "修正後に確かめたこと",
};

export interface SubmissionDraft {
  explanation: string;
  debuggingRecord?: DebuggingRecord;
}

export interface SubmissionFormInput {
  key: string;
  title: string;
  mode: "submit" | "consult";
  debug?: boolean;
  initial?: SubmissionDraft;
}

export function initialSubmissionDraft(input: SubmissionFormInput): SubmissionDraft {
  return {
    explanation:
      input.initial?.explanation ||
      (input.mode === "consult" ? CONSULT_TEMPLATE : REFLECTION_TEMPLATE),
    ...(input.debug
      ? {
          debuggingRecord: input.initial?.debuggingRecord ?? {
            reproduction: "",
            expected: "",
            cause: "",
            fix: "",
            regression: "",
          },
        }
      : {}),
  };
}

export function parseSubmissionDraft(raw: unknown, debug: boolean): SubmissionDraft {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("explanation" in raw) ||
    typeof raw.explanation !== "string" ||
    raw.explanation.length > 20_000
  ) {
    throw new Error("振り返りは20,000文字以内で記入してください");
  }
  const draft: SubmissionDraft = { explanation: raw.explanation };
  if (debug) {
    const record = "debuggingRecord" in raw ? raw.debuggingRecord : undefined;
    if (!record || typeof record !== "object")
      throw new Error("修正課題の記録を読み取れませんでした");
    const values = {} as DebuggingRecord;
    for (const key of Object.keys(DEBUGGING_LABELS) as (keyof DebuggingRecord)[]) {
      const value = key in record ? (record as Record<string, unknown>)[key] : undefined;
      if (typeof value !== "string" || value.length > 10_000)
        throw new Error(`${DEBUGGING_LABELS[key]}は10,000文字以内で記入してください`);
      values[key] = value;
    }
    draft.debuggingRecord = values;
  }
  return draft;
}

export function submissionDraftProblem(
  draft: SubmissionDraft,
  input: SubmissionFormInput,
): string | undefined {
  const content = draft.explanation
    .split(/\r?\n/)
    .filter((line) => !/^\s*#{1,6}\s/.test(line))
    .join("\n")
    .replace(/[\s\-*]/g, "");
  if (!content)
    return input.mode === "consult"
      ? "困っていることや試したことを記入してください"
      : "テンプレートの見出しの下に振り返りを記入してください";
  if (input.debug && input.mode === "submit") {
    for (const key of Object.keys(DEBUGGING_LABELS) as (keyof DebuggingRecord)[]) {
      if (!draft.debuggingRecord?.[key].trim()) return `${DEBUGGING_LABELS[key]}を記入してください`;
    }
  }
  return undefined;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderSubmissionForm(
  input: SubmissionFormInput,
  draft: SubmissionDraft,
  assets: { nonce: string; cspSource: string; styleUri: string; scriptUri: string },
): string {
  const consulting = input.mode === "consult";
  const title = consulting ? "講師に相談する" : "課題を提出する";
  const debug = input.debug
    ? `<section aria-labelledby="debug-heading"><h2 id="debug-heading">修正課題の記録</h2><p class="description">${consulting ? "分かっている範囲で記入できます。" : "再現から修正後の確認まで、各項目を記入してください。"}</p>${Object.entries(
        DEBUGGING_LABELS,
      )
        .map(
          ([key, label]) =>
            `<label for="${key}">${label}</label><textarea id="${key}" name="${key}" rows="3" maxlength="10000"${consulting ? "" : " required"}>${escapeHtml(draft.debuggingRecord?.[key as keyof DebuggingRecord] ?? "")}</textarea>`,
        )
        .join("")}</section>`
    : "";
  return `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${escapeHtml(assets.cspSource)}; script-src 'nonce-${escapeHtml(assets.nonce)}';"><link rel="stylesheet" href="${escapeHtml(assets.styleUri)}"><title>${title}</title></head><body data-token="${escapeHtml(assets.nonce)}" data-debug="${Boolean(input.debug)}"><main><header><p class="eyebrow">STELLA · ${consulting ? "相談" : "提出前の振り返り"}</p><h1>${escapeHtml(input.title)}</h1><p class="description">${consulting ? "困っていることと試したことを、下のテンプレートに沿ってまとめましょう。" : "実装や確認を振り返り、下のテンプレートの見出しの下に記入しましょう。"}</p></header><form id="submission-form"><section aria-labelledby="reflection-heading"><h2 id="reflection-heading">${consulting ? "相談の内容" : "今回の振り返り"}</h2><div class="guidance"><p>${consulting ? "何をしようとして、どこで進めなくなったかを書きましょう。" : "取り組んだこと：何を変更し、なぜその方法を選んだか。"}</p><p>${consulting ? "エラーや画面の変化、試した方法も手がかりになります。" : "確認したこと：どんな操作をして、どんな結果になったか。"}</p>${consulting ? "" : "<p>振り返り：分かったこと、つまずいたこと、次に試したいこと。</p>"}</div><label class="sr-only" for="explanation">${consulting ? "相談の内容" : "今回の振り返り"}</label><textarea id="explanation" name="explanation" rows="17" maxlength="20000" required spellcheck="false">${escapeHtml(draft.explanation)}</textarea><p class="caption">見出しは自由に書き換えられます。下書きはこの課題に保存されます。</p></section>${debug}<div id="form-status" role="status" aria-live="polite"></div><div class="actions"><button type="button" class="secondary" id="save-draft">下書きを保存</button><button type="submit" class="primary" id="submit">${consulting ? "相談を送る" : "提出する"}</button></div></form></main><script nonce="${escapeHtml(assets.nonce)}" src="${escapeHtml(assets.scriptUri)}"></script></body></html>`;
}
