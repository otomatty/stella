const NOT_FOUND_REPLY = "資料に該当する記載がありません。";

const SYSTEM = `渡した資料だけを使って答えてください。資料に答えが無いときは、「${NOT_FOUND_REPLY}」だけを返してください。`;

/**
 * 資料と質問から、引用を有効にした Messages API のリクエストを作る。
 * @param {{ model: string, maxTokens: number, documents: { title: string, text: string }[], question: string }} input
 */
export function buildGroundedRequest({
  model,
  maxTokens,
  documents,
  question,
}) {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("資料がありません");
  }
  return {
    model,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...documents.map((sourceDoc) => ({
            type: "document",
            source: {
              type: "text",
              media_type: "text/plain",
              data: sourceDoc.text,
            },
            title: sourceDoc.title,
            citations: { enabled: true },
          })),
          { type: "text", text: question },
        ],
      },
    ],
  };
}

/**
 * 応答から、引用の付いたテキストだけを残す。
 * @param {{ content?: { type: string, text?: string, citations?: { document_title?: string, cited_text?: string }[] }[], stop_reason?: string }} response
 */
export function readGroundedAnswer(response) {
  if (response.stop_reason === "refusal") return { status: "refused" };
  if (response.stop_reason === "max_tokens") return { status: "truncated" };

  const kept = (response.content ?? []).filter(
    (block) =>
      block.type === "text" &&
      Array.isArray(block.citations) &&
      block.citations.length > 0,
  );
  if (kept.length === 0) return { status: "not_found" };

  const sources = [];
  const seen = new Set();
  for (const block of kept) {
    for (const citation of block.citations ?? []) {
      const source = {
        title: citation.document_title,
        quote: citation.cited_text,
      };
      const key = JSON.stringify([source.title, source.quote]);
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(source);
    }
  }
  return {
    status: "answered",
    text: kept.map((block) => block.text ?? "").join(""),
    sources,
  };
}
