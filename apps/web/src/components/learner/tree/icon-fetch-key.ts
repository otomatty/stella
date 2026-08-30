/**
 * 講座アイコンの一括取得をやり直す合図。
 *
 * `/api/skill-map/icons` はいま `full` の星だけを返す。ツリーがマウントされたまま
 * 霧→full になると `/mine` は更新されるが、取得を 1 回きりにすると新しい星の SVG が
 * 来ない。見える `has_icon` の集合か受講者が変わったときだけキーが変わるようにする。
 */
export function iconFetchKey(
  userId: string | null,
  nodes: ReadonlyArray<{ id: string; has_icon?: true }>,
): string {
  const ids = nodes.filter((node) => node.has_icon).map((node) => node.id);
  ids.sort();
  return `${userId ?? ""}:${ids.join(",")}`;
}
