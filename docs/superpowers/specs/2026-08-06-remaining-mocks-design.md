# 残モックの仕分け（#63 / Phase 4）

日付: 2026-08-06  
ステータス: 実装完了  
親 Issue: [#58](https://github.com/a-cial-dev/falcon-informal/issues/58)  
対象 Issue: [#63](https://github.com/a-cial-dev/falcon-informal/issues/63)

## 背景

#59〜#62 により実データ開発が既定になり、API 失敗時の fixtures 退避 (#60)・コア学習ループ (#61)・招待制認可 (#62) が完了した。一方 `fixtures.ts` が seed とデモの両方を担い、実データ経路でもプレースホルダ UI が残っていた。

## 目標

1. seed 用カタログとデモ専用 fixtures をファイル分割する
2. 実データ経路 (`isBackendConfigured()`) からモック UI を除去する
3. デモ専用経路 (`VITE_SERVER_URL` 未設定 / Tweaks) は維持する
4. #62 で不要になった `OnboardingScreen` を削除する

## 非目標

- Tweaks / モックログイン / localStorage デモストアの廃止
- 本番ビルドからのデモバンドル tree-shake
- レポート / org 横断 UI の本格実装 (#64 以降)

## 変更概要

### ファイル分割

| ファイル | 用途 | 実データ import |
|---------|------|----------------|
| `apps/web/src/data/seed-catalog.ts` | TENANTS, コースカタログ (D1 seed 由来) | 可 (テナント表示名) |
| `apps/web/src/demo/fixtures.ts` | 提出キュー・KPI チャート・モックユーザー等 | **禁止** |
| `apps/web/src/data/fixtures.ts` | `@/demo/fixtures` への互換 re-export | 非推奨 |

`packages/shared/scripts/export-seed-sql.ts` は `seed-catalog.ts` を参照。

### 実データ経路の修正

| 画面 | 変更前 | 変更後 |
|------|--------|--------|
| `InstructorGeneric` (students/courses) | 常にプレースホルダ行 | API (`/api/analytics/instructor`, courses) または空 |
| `LessonPlayer` | `course.sections` 空時 fixtures へ fallback | 空 sections のまま |
| `AdminGeneric` | 死んだ courses 分岐 + fixtures カード | 未実装スタブのみ |
| `OnboardingScreen` | fixtures TENANTS (未使用) | 削除 (#62 で InviteRequired に置換済み) |

### デモ専用 (維持)

- モックログイン → `TenantSelect` → Tweaks
- `lms_state` / `lms_submissions_v1` localStorage
- `AdminDashboard` の `DashboardDemo`
- `InstructorDashboard` の `*_DEMO` 定数

## 完了条件

- 実データ時に `InstructorGeneric` がプレースホルダ行を出さない
- `LessonPlayer` が fixtures sections に黙って fallback しない
- seed スクリプトが `seed-catalog.ts` から読む
- `bun run typecheck` が通る

## フォローアップ

- #64 — 運用品質（監査・R2・E2E 自動化）
