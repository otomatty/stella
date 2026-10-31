/**
 * Cloudflare Workers バインディング型。
 */

import type { NarratorService } from "@stella/shared/library/types";

export interface Env {
  LIBRARY_ENABLED?: string;
  LIBRARY_BUCKET?: R2Bucket;
  NARRATOR?: NarratorService;
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  /**
   * 提出の AI 一次レビューだけに使うモデル (未設定なら ANTHROPIC_MODEL)。構造化出力
   * (`output_config.format`) に対応したモデルを選ぶ。人の判定との一致率
   * (`scripts/ai-review-eval.ts`) を見て切り替える。
   */
  AI_REVIEW_MODEL?: string;
  /**
   * 週次の育成メモ (#38) だけに使うモデル (未設定なら ANTHROPIC_MODEL)。構造化出力
   * (`output_config.format`) に対応したモデルを選ぶ。API キーが無ければ機械的な要約になる。
   */
  MENTOR_MEMO_MODEL?: string;
  /** Cloudflare AI Gateway ID (例: stella-ai)。未設定なら Anthropic 直叩き。 */
  AI_GATEWAY_ID?: string;
  /**
   * ランタイム用 Cloudflare アカウント ID (wrangler.toml の account_id は deploy 専用で Workers に渡らない)。
   * AI Gateway URL 構築と Unified Billing REST に必須。
   */
  CLOUDFLARE_ACCOUNT_ID?: string;
  /**
   * AI Gateway REST 専用の最小権限 API トークン。
   * GitHub Actions の deploy 用 CLOUDFLARE_API_TOKEN とは別物 — `wrangler secret put AI_GATEWAY_CF_API_TOKEN`。
   */
  AI_GATEWAY_CF_API_TOKEN?: string;
  /** chat / review-draft の LLM プロバイダ (既定: anthropic)。 */
  CHAT_PROVIDER?: string;
  /** CHAT_PROVIDER に応じたモデル名 (例: grok-4.6)。 */
  CHAT_MODEL?: string;
  /** カンマ区切り。 `*.example.com` でサブドメインを許可。 */
  ALLOWED_ORIGINS: string;
  ISOLATE_MEMORY_LIMIT?: string;

  /**
   * 開発モード ("1" / "true" で有効)。 **ローカル開発専用 — 本番には設定しない**
   * (wrangler.toml の [vars] にも deploy workflow にも載せないこと)。
   *
   * 有効のとき画面に開発者モード FAB が出る。オンにしたリクエストだけ、島を表示条件
   * に関わらず配信し、霧の星の名前も明かす。解放条件はそのまま — 見えるだけで
   * locked の星は開かない。
   */
  DEV_MODE?: string;

  // ---------------------------------------------------------------
  // Cloudflare D1 + 自前認証 (Google OAuth / JWT)
  // ---------------------------------------------------------------
  /** D1 データベースバインディング (`wrangler.toml` の `[[d1_databases]]`)。 */
  DB: D1Database;

  /**
   * Better Auth の署名鍵 (Cookie・OAuth の state)。機密。deploy が GitHub の Secret から入れる。
   * 変えると全員のセッションが切れる。
   */
  BETTER_AUTH_SECRET?: string;
  /** Better Auth の基点 = 受講者用の Web のオリジン (API は Web の `/api/*` の中継で受ける)。 */
  BETTER_AUTH_URL?: string;

  /**
   * ローカル開発とテスト用のトークン (HS256) の署名鍵。localhost へのリクエストでしか
   * 受け付けない (authz.ts の verifyToken)。本番には置かない。
   */
  AUTH_JWT_SECRET?: string;

  /** Google OAuth クライアント ID (公開可)。 */
  GOOGLE_CLIENT_ID?: string;

  /** Google OAuth クライアントシークレット。 `wrangler secret put GOOGLE_CLIENT_SECRET` */
  GOOGLE_CLIENT_SECRET?: string;

  /**
   * Cloudflare R2 — 教材アップロード用バケット。
   * `wrangler.toml` の `[[r2_buckets]]` で `MATERIALS_BUCKET` としてバインドする。
   */
  MATERIALS_BUCKET?: R2Bucket;

  /** 提出コード専用の非公開バケット。公開教材とは分離する。 */
  SUBMISSIONS_BUCKET?: R2Bucket;

  /**
   * CI と公開 (`ci-deploy`) の課題の提出で、GitHub Actions の実行を GitHub の公開 API で確かめる
   * ときのトークン (任意、07 §5.5)。未設定でも動く (未認証は送信元の IP ごとに 1 時間 60 回まで。
   * Workers の送信元は共有なので、当たると照合できずに講師の確認待ちになる)。設定するなら、
   * 権限を持たない fine-grained の個人用アクセストークン (Public Repositories (read-only)) にする。
   * `wrangler secret put GITHUB_API_TOKEN`。値はログにも提出の記録にも残さない。
   */
  GITHUB_API_TOKEN?: string;

  /** 招待メールのリンク先 (受諾後に開くアプリ URL)。 未設定なら ALLOWED_ORIGINS の先頭。 */
  INVITE_REDIRECT_URL?: string;

  /**
   * AI エンドポイント (chat / review-draft) の Rate Limiting バインディング。
   * wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  AI_RATE_LIMITER?: RateLimit;

  /**
   * サポート問い合わせ (公開フォーム) の Rate Limiting バインディング。
   * wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  SUPPORT_RATE_LIMITER?: RateLimit;

  /**
   * ログインなしで読める教材 (`GET /api/public/*`。Issue #41) のテナント。未ログインでは JWT から
   * テナントが決まらないので、ここで決める (wrangler.toml の [vars]。教材の seed と同じ `ses`)。
   * 未設定なら公開 API は何も返さない (一覧は空、本文は 404)。
   */
  PUBLIC_CONTENT_TENANT_ID?: string;

  /**
   * ログインなしで読める教材 (`GET /api/public/*`) の Rate Limiting バインディング。
   * wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  PUBLIC_CONTENT_RATE_LIMITER?: RateLimit;

  /**
   * VS Code の接続コードの交換 (`POST /api/auth/vscode-link/exchange`、認証前) の Rate Limiting
   * バインディング。 wrangler.toml の `unsafe.bindings` で設定する。 未設定なら制限なしで動作する。
   */
  AUTH_LINK_RATE_LIMITER?: RateLimit;
}
