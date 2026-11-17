// 引数は前から順に当てはめるので、省略できる引数が前にあると、後ろの必須の引数にどの値が入るか決められない
export function greet(name: string, title?: string): string {
  return title === undefined ? `${name}さん、こんにちは` : `${name}${title}、こんにちは`;
}

export function formatName(last: string, first?: string, middle?: string): string {
  let text = last;
  if (middle !== undefined) {
    text += ` ${middle}`;
  }
  if (first !== undefined) {
    text += ` ${first}`;
  }
  return text;
}

export function createTag(name: string, color?: string): { name: string; color: string } {
  return { name, color: color ?? "gray" };
}
