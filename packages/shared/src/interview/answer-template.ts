/**
 * Issue #206 — plain common answer templates (retire blank-span decorations).
 */

const BLANK_SPAN_RE = /<span class="blank">(.*?)<\/span>/g;

/** Strip blank-span markup while preserving inner placeholder text. */
export function plainAnswerTemplateText(template: string): string {
  return template.replace(BLANK_SPAN_RE, "$1");
}
