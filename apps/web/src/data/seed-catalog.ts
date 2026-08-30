/**
 * D1 seed とデモ UI が参照するテナント一覧。
 * 教材ステージは `packages/content` が正本で、 `export-seed-sql.ts` が組み立てる。
 * 提出キュー・KPI チャート等のデモ専用データは `@/demo/fixtures` に分離済み。
 */

import type { Tenant } from "./types";

export const TENANTS: Tenant[] = [
  {
    id: "ses",
    name: "SES未経験エンジニア育成",
    subtitle: "TypeScript 入門",
    icon: "cpu",
    active: 87,
  },
];
