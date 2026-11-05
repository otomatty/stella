/**
 * 外部リポジトリの名前の台帳 (`packages/content/extra-repositories.json`)。
 *
 * 名前をステージ slug の頭に付け、外部リポジトリどうし、および stella 本体と slug が重ならないようにする。
 * 非公開リポジトリの所在 (owner/repo) は書かない。stella は公開リポジトリなので。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const EXTRA_REPOSITORIES_FILE = "extra-repositories.json";

/** ハイフンを含めない。頭に付けたとき、どこまでが名前か分かるようにする。 */
export const EXTRA_REPOSITORY_NAME = /^[a-z0-9][a-z0-9]*$/;

export interface ExtraRepository {
  name: string;
  note?: string;
}

export function readExtraRepositories(contentRoot: string): ExtraRepository[] {
  const path = join(contentRoot, EXTRA_REPOSITORIES_FILE);
  if (!existsSync(path)) throw new Error(`${EXTRA_REPOSITORIES_FILE} がありません。`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new Error(`${EXTRA_REPOSITORIES_FILE} の JSON が読めません。`);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${EXTRA_REPOSITORIES_FILE} はオブジェクトにしてください。`);
  }
  const row = raw as Record<string, unknown>;
  if (row.schemaVersion !== 1) {
    throw new Error(`${EXTRA_REPOSITORIES_FILE} の schemaVersion は 1 にしてください。`);
  }
  if (!Array.isArray(row.repositories)) {
    throw new Error(`${EXTRA_REPOSITORIES_FILE} の repositories は配列にしてください。`);
  }
  const repositories: ExtraRepository[] = [];
  const seen = new Set<string>();
  for (const item of row.repositories) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(
        `${EXTRA_REPOSITORIES_FILE} の repositories の要素はオブジェクトにしてください。`,
      );
    }
    const name = (item as { name?: unknown }).name;
    if (typeof name !== "string" || !EXTRA_REPOSITORY_NAME.test(name)) {
      throw new Error(
        `${EXTRA_REPOSITORIES_FILE} の name「${String(name)}」は英小文字と数字だけにしてください (先頭は英小文字か数字。ハイフンは付けません)。`,
      );
    }
    if (seen.has(name)) {
      throw new Error(`${EXTRA_REPOSITORIES_FILE} の name「${name}」が重複しています。`);
    }
    seen.add(name);
    const note = (item as { note?: unknown }).note;
    if (note !== undefined && typeof note !== "string") {
      throw new Error(`${EXTRA_REPOSITORIES_FILE} の note は文字列にしてください。`);
    }
    repositories.push(note === undefined ? { name } : { name, note });
  }
  return repositories;
}
