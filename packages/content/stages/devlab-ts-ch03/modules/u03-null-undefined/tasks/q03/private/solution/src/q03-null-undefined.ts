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

// bio の undefined は「書いていない（値がない）」、company の null は「所属していない、と分かっている」を表す
export type Profile = {
  name: string;
  bio?: string;
  company: { name: string; department?: string } | null;
};

export function bioLength(profile: Profile): number {
  return profile.bio?.length ?? 0;
}

export function departmentOf(profile: Profile): string {
  return profile.company?.department ?? "未設定";
}

export function companyLabel(profile: Profile): string {
  if (profile.company === null) {
    return "フリー";
  }
  const { name, department } = profile.company;
  if (department === undefined) {
    return name;
  }
  return `${name}（${department}）`;
}

export function findEmail(emails: { [name: string]: string }, name: string): string | null {
  return emails[name] ?? null;
}
