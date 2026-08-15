# KPI ダッシュボードから CSV 出力を外す

日付: 2026-08-15  
ステータス: 承認済み

## 背景

テナント KPI ダッシュボード (`/admin/dash`, Issue #28) は「今の状態」を画面で見るための集計である。ヘッダの CSV 出力は KPI 数件とコース別完了率だけを「指標 / 値」の 2 列で落とす薄い機能で、推移・つまずき・受講状況サマリは含まれない。明細の持ち出しは管理画面「レポート」(Issue #75) が担っている。

報告用の代替フォーマットは不要（持ち出し自体が不要）と判断した。

## 目標

1. KPI ダッシュボードの CSV 出力を本番・デモの両方から削除する
2. ダッシュボード専用の CSV 依存（`onExport`、`@/lib/csv`、成功 toast）を除去する

## 非目標

- `/admin/report`・成績台帳・監査ログ・受講登録一覧の CSV は残す
- 共有ユーティリティ `apps/web/src/lib/csv.ts` は他画面が使うため残す
- PDF / Markdown / Slack 向けなど代替エクスポートは作らない
- デモの「直近30日」ボタンは今回の対象外

## 変更概要

対象は `apps/web/src/components/admin/AdminDashboard.tsx` のみ。

| 箇所 | 変更 |
|------|------|
| `DashboardLive` | `onExport` と「CSV出力」ボタンを削除。更新ボタンは残す |
| `DashboardDemo` | 無効な「CSV出力」ボタンを削除。案内文から CSV の言及を外す |
| import | `toast` / `Download` / `downloadCsv` / `toCsv` を削除 |
| ファイル先頭コメント | 「表示中の集計は CSV 出力できる」を削除 |

## テスト

専用テストは無い。変更後に `AdminDashboard.tsx` の型が通ること、他画面の CSV が残っていることを確認する。
