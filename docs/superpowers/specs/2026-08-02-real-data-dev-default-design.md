# 実データ開発環境の標準化（#59 / Phase 0）

日付: 2026-08-02  
ステータス: 実装完了（レビュー済み・コミット待ち）  
親 Issue: [#58](https://github.com/a-cial-dev/falcon-informal/issues/58)  
対象 Issue: [#59](https://github.com/a-cial-dev/falcon-informal/issues/59)

## 背景

FALCON INFORMAL は Hono + D1 + Google OAuth + R2 の主要 CRUD が実装済みだが、ドキュメントとエージェント指示が「fixtures / モックログインで十分」を前面に出している。そのため日常開発がデモ経路に寄り、実データ操作可能な LMS への移行（#58）の入口が弱い。

技術部品（`.env.local.example` の `VITE_SERVER_URL`、migrate/seed/smoke、ロール昇格の一行コマンド）は既にある。不足は **既定パスの明示** と **デモ専用への格下げ** である。

## 目標

1. ドキュメント上、日常の開発体験を「実データ経路」に固定する
2. モック / Tweaks 単体起動を「デモ専用」と明記する
3. 初回 Google ログイン後の `admin` / `instructor` 昇格手順を再現可能にする
4. 手動検証チェックリストを README に置き、完了確認を人間が辿れるようにする

## 非目標（このタスク外）

- fixtures フォールバックの削除や API 失敗時のデモ化け解消（#60）
- 同時起動スクリプト、seed への検証アカウント埋め込み、モック OAuth 等の DX 拡張
- Google OAuth 実機確認の代行（実装側はチェックリストまで。ログイン後確認は利用者）
- 新規 `docs/*.md` の追加

## 選定方針

### 採用: README / AGENTS をその場で書き換え（Approach 1）

触るファイルを入口ドキュメントに限定し、二重管理を避ける。

**不採用**

- 専用ガイド新設: #59 のゴールに対してファイルが増え、README と内容が分岐しやすい
- example / 一文だけの最小修正: 「モックが既定」印象が残り完了条件を満たしにくい

## 変更対象

| ファイル | 変更 |
|---------|------|
| `README.md` | セットアップ周りを実データ既定の流れに組み替え。デモ専用節・ロール昇格・手動チェックリストを追加 |
| `AGENTS.md` | 日常の既定を `dev:api` + `dev` + ローカル D1 に。fixtures / Tweaks はデモ専用と注記 |
| `apps/web/.env.local.example` | `VITE_SERVER_URL` は現状維持。未設定=デモ経路／日常開発では必須、のコメントを追加 |

`apps/api/.dev.vars.example` は現状で十分（`AUTH_JWT_SECRET` / Google OAuth の説明あり）のため、必須変更なし。

## README 節立て（セットアップ周り）

1. **セットアップ（実データ開発・既定）** — install、env コピー、必須変数
2. **DB 初期化** — `db:migrate` → `db:seed` → `smoke:d1`
3. **起動（既定）** — `bun run dev:api` と `bun run dev`（2 ターミナル）
4. **初回ログインとロール昇格** — 既定 `student`。検証用に `admin` / `instructor` の `wrangler d1 execute ... update profiles set role=...` 例
5. **手動検証チェックリスト** — healthz、Google ログイン、Learner の D1 表示、昇格後の Instructor / Admin（Tweaks なし）
6. **デモ専用（モック単体）** — `VITE_SERVER_URL` 未設定 + Tweaks。日常開発には使わない
7. 既存の R2 / 添削 / 進捗 / 修了証 / Anthropic 節は維持。API 未設定時フォールバック言及はデモ専用への誘導と矛盾しないよう軽く揃える

「開発」「ロール切替」の独立節は上記 3・6 に吸収または短縮する。  
Google ログイン失敗時は既存の [`docs/google-login-troubleshooting.md`](../../google-login-troubleshooting.md) へリンク。スタック詳細は [`docs/cloudflare-stack.md`](../../cloudflare-stack.md)。

## AGENTS.md / example の方針

- Running services: 既定 = API + Web + ローカル D1
- fixtures / モックログイン / Tweaks: 削除せず「デモ専用」1 段落
- Env / DB setup の既存記述は README の実データ手順と矛盾しないよう揃える
- `.env.local.example`: 値変更なし。コメントのみ

## 検証方針

実装者（エージェント）:

- ドキュメント差分の一貫性確認（既定パスとデモ専用の役割が矛盾していないこと）
- 実機での Google ログイン・3 ロール確認は行わない

利用者（人手）:

- README の手動検証チェックリストを実行して完了条件を満たす

## 完了条件（Issue #59 と同一）

- ドキュメント上、Tweaks に頼らない 3 ロール実データ操作の手順が辿れる
- モック単体起動が「デモ専用」と明記されている
- コード変更・新規スクリプト・新規 docs は含まない（上記 3 ファイルのみ）

## フォローアップ

- #60 — fixtures フォールバック廃止（Phase 1）
- #61 以降 — コア学習ループ・認可・残モック仕分け・運用品質
