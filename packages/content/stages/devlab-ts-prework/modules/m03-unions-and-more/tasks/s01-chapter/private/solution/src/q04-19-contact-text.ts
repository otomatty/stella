// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問19
export type Contact = { by: "email"; address: string } | { by: "phone"; number: string };

export function contactText(contact: Contact): string {
  return contact.by === "email" ? `メール: ${contact.address}` : `電話: ${contact.number}`;
}
