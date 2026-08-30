/**
 * Cloudflare Workers バインディング型。
 */

export interface Env {
  ANTHROPIC_API_KEY: string;
  ANTHROPIC_MODEL?: string;
  /** Cloudflare AI Gateway ID (例: falcon-ai)。未設定なら Anthropic 直叩き。 */
  AI_GATEWAY_ID?: string;
  /**
   * ランタイム用 Cloudflare アカウント ID (wrangler.toml の account_id は deploy 専用で Workers に渡らない)。
   * AI Gateway URL 構築と Unified Billing REST に必須。
   */
  CLOUDFLARE_ACCOUNT_ID?: string;
  /**
   * AI Gateway / Workers AI REST 専用の最小権限 API トークン。
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
   * JWT 署名用シークレット (HS256)。 機密。
   * `wrangler secret put AUTH_JWT_SECRET` で設定する。
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

  /**
   * Cloudflare R2 — スキルシート原本 (PDF/xlsx) アップロード用。
   * `wrangler.toml` の `[[r2_buckets]]` で `SKILL_SHEETS_BUCKET` としてバインドする。
   */
  SKILL_SHEETS_BUCKET?: R2Bucket;

  /** 招待メールのリンク先 (受諾後に開くアプリ URL)。 未設定なら ALLOWED_ORIGINS の先頭。 */
  INVITE_REDIRECT_URL?: string;

  /**
   * Workers AI (REST) — 面談対策の回答文字起こし (Whisper)。 読み上げは既定で
   * AI Gateway 経由の Grok TTS を使うため、 このトークンは直叩きフォールバック用。
   * `[ai]` バインディングではなく REST を使う理由は `lib/workers-ai.ts` 参照。
   * アカウント ID は上の CLOUDFLARE_ACCOUNT_ID を共用。 トークンは
   * `wrangler secret put WORKERS_AI_API_TOKEN` (ローカルは `.dev.vars`)。
   * どちらか未設定なら音声エンドポイントだけ 503 を返す。
   */
  WORKERS_AI_API_TOKEN?: string;

  /**
   * 質問読み上げモデル。 既定は `grok-tts` (AI Gateway Unified Billing → xai/grok-tts)。
   *
   * Workers AI 側の TTS は日本語で使えるものが無い (MeloTTS は CJK が破綻、
   * Deepgram Aura は英語 / スペイン語専用) ため、 日本語 20 言語対応の Grok TTS を
   * 既定にしている。 差し替える場合は入力スキーマも `buildTtsInput()` の分岐に従う。
   */
  INTERVIEW_TTS_MODEL?: string;

  /**
   * 読み上げの声。 Grok TTS は eve / ara / rex / sal / leo (既定 eve)。
   * OpenAI TTS なら alloy 等、 Deepgram Aura なら speaker 名。
   */
  INTERVIEW_TTS_VOICE?: string;

  /**
   * 読み上げモデルへ渡す言語コード。 既定 "ja" (Grok TTS は BCP-47。 "auto" で自動判定)。
   */
  INTERVIEW_TTS_LANG?: string;

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
}
