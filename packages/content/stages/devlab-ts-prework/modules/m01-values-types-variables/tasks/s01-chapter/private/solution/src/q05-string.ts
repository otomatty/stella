export function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, "-");
}

export function truncate(text: string, max: number): string {
  if (max < 1) {
    throw new Error("max は 1 以上にしてください");
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) {
    throw new Error("メールアドレスの形になっていません");
  }
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}
