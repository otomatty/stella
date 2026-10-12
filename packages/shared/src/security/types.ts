/**
 * セキュリティ監視 (管理者の「セキュリティ」画面と API) の語彙と応答の形。
 *
 * 出来事 (event) は API と Cloudflare Access のログから集め、検知ルール (rule) がそこから
 * アラートを出す。ラベルはここを唯一の定義とし、API (通知文) と画面が同じ語を使う。
 */

export const SECURITY_EVENT_LABELS = {
  "session.start": "サインイン (新しいセッション)",
  "access.login": "Access のログイン",
  "access.denied": "Access でのログイン拒否",
  "auth.no_profile": "未招待の利用者からのアクセス",
  "auth.disabled": "無効化済みアカウントからのアクセス",
  "auth.tenant_inactive": "利用停止中の組織からのアクセス",
  "auth.invalid_token": "認証トークンなし・不正なトークン",
  "authz.forbidden": "権限外の操作 (403)",
  rate_limited: "レート制限の超過 (429)",
  server_error: "サーバーエラー (5xx)",
  "data.export": "データの一括出力",
  "session.revoke": "Access セッションの失効",
} as const;

export type SecurityEventKind = keyof typeof SECURITY_EVENT_LABELS;

export function isSecurityEventKind(value: unknown): value is SecurityEventKind {
  return typeof value === "string" && Object.hasOwn(SECURITY_EVENT_LABELS, value);
}

export type SecuritySeverity = "high" | "medium" | "low";
export type SecurityAlertStatus = "open" | "acknowledged" | "resolved";

export const SECURITY_SEVERITY_LABELS: Record<SecuritySeverity, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const SECURITY_ALERT_STATUS_LABELS: Record<SecurityAlertStatus, string> = {
  open: "未対応",
  acknowledged: "確認中",
  resolved: "解決済み",
};

export function isSecurityAlertStatus(value: unknown): value is SecurityAlertStatus {
  return value === "open" || value === "acknowledged" || value === "resolved";
}

/** 検知ルール。`what` は画面の説明、`action` は見つけたときに最初にやること。 */
export const SECURITY_RULES = {
  new_location: {
    label: "いつもと違う国からのサインイン",
    what: "過去 30 日に使っていない国からサインインした (管理者・講師・営業は重要度「高」)",
    action:
      "本人に心当たりを確認する。心当たりが無ければ Access のセッションを失効し、アカウントを無効化する",
  },
  off_hours_admin: {
    label: "深夜帯の管理者サインイン",
    what: "管理者が 0〜5 時 (日本時間) にサインインした",
    action: "本人の作業かを確認する",
  },
  access_denied_burst: {
    label: "Access でのログイン拒否の連続",
    what: "1 時間に同じメールアドレスか IP から 5 回以上、Access がログインを拒否した",
    action:
      "総当たり・なりすましの可能性。IP とメールアドレスを確認し、必要なら Access の方針で遮断する",
  },
  uninvited_identity: {
    label: "未招待の利用者が Access を通過",
    what: "Access は通したが、アプリに招待されていない利用者がアクセスした",
    action: "Access の許可の方針 (メールアドレス・ドメイン) が広すぎないか見直す",
  },
  disabled_account_access: {
    label: "無効化済みアカウントの利用",
    what: "無効化したアカウントが Access を通ってアクセスした",
    action: "Access のセッションを失効し、Access の方針からも外す",
  },
  invalid_token: {
    label: "認証を通らないアクセス",
    what: "Access のトークンが無いか、検証に失敗したリクエストが API に届いた",
    action: "Access を迂回する経路 (別のホスト名・プレビュー URL) が開いていないか確認する",
  },
  forbidden_burst: {
    label: "権限外の操作の連続",
    what: "1 時間に同じ利用者か IP が 20 回以上、権限の無い操作 (403) をした",
    action: "他人のデータを探る試行の可能性。利用者に確認し、必要ならセッションを失効・無効化する",
  },
  rate_limit_burst: {
    label: "レート制限の超過の連続",
    what: "1 時間に同じ IP が 30 回以上、レート制限を超えた",
    action: "自動化された攻撃の可能性。IP を確認し、必要なら WAF で遮断する",
  },
  error_spike: {
    label: "サーバーエラーの急増",
    what: "1 時間のサーバーエラー (5xx) が 20 件以上で、過去 7 日の平均の 3 倍を超えた",
    action: "障害か攻撃かを切り分ける。Cloudflare のログで該当時間帯の通信を確認する",
  },
  privilege_grant: {
    label: "管理者権限の付与・アカウントの復帰",
    what: "利用者を管理者にした、または無効化したアカウントを復帰させた",
    action: "正規の申請に基づく変更かを確認する",
  },
  bulk_export: {
    label: "データの一括出力の連続",
    what: "1 時間に同じ利用者が 5 回以上、レポートや監査ログを出力した",
    action: "持ち出しの可能性。業務上の理由を確認する",
  },
} as const;

export type SecurityRule = keyof typeof SECURITY_RULES;

export interface SecurityAlertRow {
  id: string;
  rule: SecurityRule | string;
  severity: SecuritySeverity;
  status: SecurityAlertStatus;
  title: string;
  detail: Record<string, unknown>;
  subject: string | null;
  event_count: number;
  first_seen_at: string;
  last_seen_at: string;
  notified_at: string | null;
  status_changed_by: string | null;
  status_changed_at: string | null;
  note: string | null;
}

export interface SecurityEventRow {
  id: string;
  kind: SecurityEventKind | string;
  source: "app" | "access";
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  email: string | null;
  ip: string | null;
  country: string | null;
  user_agent: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SecurityAccountRow {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  disabled: boolean;
  created_at: string;
  last_session_at: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  last_country: string | null;
  sessions_30d: number;
  /** 管理者・講師・営業 (受講者のデータを見られるロール)。 */
  privileged: boolean;
  /** 権限のあるロールで、90 日サインインが無い (棚卸しで外す候補)。 */
  dormant: boolean;
}

export interface SecurityConfigStatus {
  /** API が Cloudflare Access のトークンを検証している (本番は必ず true)。 */
  access_enforced: boolean;
  /** Access のログ (拒否を含むログイン記録) を取り込める (CF_ACCESS_API_TOKEN)。 */
  access_logs_import: boolean;
  /** Access のセッションを画面から失効できる (CF_ACCESS_API_TOKEN)。 */
  session_revoke: boolean;
  /** アラートを外部 (Slack など) へ送る (SECURITY_ALERT_WEBHOOK_URL)。 */
  webhook: boolean;
  last_scan_at: string | null;
  last_access_log_import_at: string | null;
  /** 出来事を残す日数。 */
  retention_days: number;
}

export interface SecurityOverview {
  config: SecurityConfigStatus;
  open_alerts: Record<SecuritySeverity, number>;
  /** 直近 24 時間の出来事の件数 (種類ごと)。 */
  last24h: Partial<Record<SecurityEventKind, number>>;
  /** 直近 7 日の 1 日ごとの件数 (古い順。サインイン・拒否・403・5xx)。 */
  daily: Array<{
    date: string;
    sign_ins: number;
    denied: number;
    forbidden: number;
    errors: number;
  }>;
  accounts: {
    total: number;
    privileged: number;
    admins: number;
    dormant_privileged: number;
    disabled: number;
  };
}
