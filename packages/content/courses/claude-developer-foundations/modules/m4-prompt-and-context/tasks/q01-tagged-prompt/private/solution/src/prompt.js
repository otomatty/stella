/**
 * 資料・例・指示・質問を、XML のタグで区切ったプロンプトにする。
 * @param {{ documents: { source: string, content: string }[], examples: { question: string, answer: string }[], instructions: string, question: string }} input
 * @returns {string}
 */
export function buildTaggedPrompt(input) {
  const sections = [];
  if (input.documents.length > 0) {
    sections.push(
      wrap("documents", input.documents.map(documentBlock).join("\n")),
    );
  }
  if (input.examples.length > 0) {
    sections.push(
      wrap("examples", input.examples.map(exampleBlock).join("\n")),
    );
  }
  sections.push(wrap("instructions", input.instructions));
  sections.push(wrap("question", input.question));
  return sections.join("\n\n");
}

function documentBlock(doc, index) {
  return [
    `<document index="${index + 1}">`,
    wrap("source", doc.source),
    wrap("document_content", doc.content),
    "</document>",
  ].join("\n");
}

function exampleBlock(example) {
  return wrap(
    "example",
    [wrap("question", example.question), wrap("answer", example.answer)].join(
      "\n",
    ),
  );
}

function wrap(tag, body) {
  return `<${tag}>\n${body}\n</${tag}>`;
}

/**
 * 応答の文章から、指定したタグの中身を取り出す。
 * @param {string} text 応答の文章
 * @param {string} tag タグの名前 (例: "answer")
 * @returns {string | null}
 */
export function readTag(text, tag) {
  const open = `<${tag}>`;
  const start = text.indexOf(open);
  if (start === -1) return null;
  const end = text.indexOf(`</${tag}>`, start + open.length);
  if (end === -1) return null;
  return text.slice(start + open.length, end).trim();
}
