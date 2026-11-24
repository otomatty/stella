// 問19 型 Contact（{ by: "email"; address } か { by: "phone"; number }）を定義して export し、contactText(contact: Contact) を書く。「メール: a@example.com」「電話: 090-…」
//     例: contactText({ by: "email", address: "a@example.com" }) → "メール: a@example.com"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type Contact = { by: "email"; address: string } | { by: "phone"; number: string };

export function contactText(contact: Contact): string {
  return contact.by === "email" ? `メール: ${contact.address}` : `電話: ${contact.number}`;
}
