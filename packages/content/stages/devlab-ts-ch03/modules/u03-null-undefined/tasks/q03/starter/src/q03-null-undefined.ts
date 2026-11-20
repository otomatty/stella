// 03-q03 null と undefined
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/undefined-vs-null
//       https://typescriptbook.jp/reference/values-types-variables/object/optional-chaining
//
// 問題
// プロフィールを表す型 Profile は定義済みです。
// bio は書いていない人もいます。company は、会社に所属していない人では null になります。
//
// 次の4つの関数を書いてください。引数と戻り値には型注釈を付けること。
//
// 1. bioLength(profile)
//    bio の文字数を返す。bio がなければ 0。オプショナルチェーン（?.）と ?? を使うこと
//
// 2. departmentOf(profile)
//    部署名を返す。会社に所属していない、または部署がなければ "未設定"
//
// 3. companyLabel(profile)
//    会社があり部署もあれば "会社名（部署名）"、会社だけなら "会社名"、会社がなければ "フリー"
//
// 4. findEmail(emails, name)
//    名前からメールアドレスを探して返す。見つからなければ null を返す（undefined ではない）
//    emails の型は { [name: string]: string }、戻り値は string | null
//
// 説明すること（答えは、この下に // のコメントで書く）
// - このコードで、undefined（bio がない）と null（company がない）は、それぞれ何を表しているか

export type Profile = {
  name: string;
  bio?: string;
  company: { name: string; department?: string } | null;
};

export function bioLength() {}

export function departmentOf() {}

export function companyLabel() {}

export function findEmail() {}
