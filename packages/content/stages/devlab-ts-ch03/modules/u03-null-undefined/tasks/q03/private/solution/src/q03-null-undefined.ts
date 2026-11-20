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
