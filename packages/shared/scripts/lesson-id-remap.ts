/** 旧 section 込みレッスン UUID を新 UUID へ付け替える seed SQL。 */

function valuesOf(
  pairs: { from: string; to: string }[],
  left: "from" | "to",
  right: "from" | "to",
): string {
  return pairs.map((p) => `('${p[left]}', '${p[right]}')`).join(", ");
}

export function lessonIdRemapStatements(
  pairs: { from: string; to: string }[],
  table: (name: string) => string,
): string[] {
  if (pairs.length === 0) return [];
  const fromTo = pairs.map((p) => `when '${p.from}' then '${p.to}'`).join(" ");
  const fromList = pairs.map((p) => `'${p.from}'`).join(", ");
  const progress = table("lesson_progress");
  const newOldValues = valuesOf(pairs, "to", "from");
  const oldNewValues = valuesOf(pairs, "from", "to");
  const retarget = (name: string, col: string) =>
    `update ${table(name)} set ${col} = case ${col} ${fromTo} end where ${col} in (${fromList});`;
  return [
    [
      `with map(new_id, old_id) as (values ${newOldValues})`,
      `update ${progress} as dest set`,
      `completed = case when coalesce(src.completed, 0) > dest.completed then src.completed else dest.completed end,`,
      `watched_sec = case`,
      `when src.watched_sec is null then dest.watched_sec`,
      `when dest.watched_sec is null then src.watched_sec`,
      `when src.watched_sec > dest.watched_sec then src.watched_sec`,
      `else dest.watched_sec end,`,
      `updated_at = case when src.updated_at > dest.updated_at then src.updated_at else dest.updated_at end`,
      `from ${progress} as src, map`,
      `where dest.user_id = src.user_id and dest.lesson_id = map.new_id and src.lesson_id = map.old_id;`,
    ].join(" "),
    [
      `with map(old_id, new_id) as (values ${oldNewValues})`,
      `delete from ${progress} where id in (`,
      `select src.id from ${progress} as src, map`,
      `where src.lesson_id = map.old_id`,
      `and exists (select 1 from ${progress} as dest where dest.user_id = src.user_id and dest.lesson_id = map.new_id));`,
    ].join(" "),
    retarget("lesson_progress", "lesson_id"),
    retarget("submissions", "lesson_id"),
    retarget("lesson_materials", "lesson_id"),
    retarget("quizzes", "lesson_id"),
  ];
}
