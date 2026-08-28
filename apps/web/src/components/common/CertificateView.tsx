/**
 * 修了証の見た目 (プレゼンテーション専用)。
 * 受講者ページ (Certificate.tsx) と公開検証ページ (PublicCertificateVerify.tsx) で共用する。
 */

interface CertificateViewProps {
  recipientName: string;
  stageTitle: string;
  /** 発行者表示 (テナント名)。 */
  issuer: string;
  /** 発行日 (YYYY-MM-DD 等に整形済み)。 */
  issuedAt: string;
  certCode: string;
  /** 受講者イニシャル (中央の丸バッジ)。 */
  initials?: string;
}

export const CertificateView = ({
  recipientName,
  stageTitle,
  issuer,
  issuedAt,
  certCode,
  initials,
}: CertificateViewProps) => (
  <div className="bg-card border border-border rounded-lg py-14 px-12 relative overflow-hidden max-w-[760px] mx-auto text-center print:shadow-none">
    <div className="absolute inset-4 border border-border-2 rounded-lg pointer-events-none" />
    <div className="w-[72px] h-[72px] rounded-full mx-auto mb-4 bg-ink text-card grid place-items-center text-[22px] tracking-tight font-semibold relative">
      {initials || recipientName.slice(0, 2)}
    </div>
    <h2 className="text-xs tracking-widest uppercase text-ink-3 font-semibold mb-1.5 relative">
      Certificate of Completion
    </h2>
    <div className="text-[11.5px] text-ink-3 uppercase tracking-wider relative">修了証明書</div>
    <div className="text-[32px] tracking-tight font-semibold my-5 relative">{recipientName}</div>
    <div className="text-sm text-ink-2 leading-relaxed mb-5 relative">
      上記の者は本学習プログラム
      <br />
      <strong className="text-foreground text-[15px]">「{stageTitle}」</strong>
      <br />
      の全カリキュラムを修了したことを認定します
    </div>
    <div className="flex justify-around text-xs text-ink-3 mt-7 pt-5 border-t border-dashed border-border-2 relative">
      <Field label="発行日" value={issuedAt} />
      <Field label="認定番号" value={certCode} />
      <Field label="発行者" value={issuer} />
    </div>
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-widest font-semibold text-ink-4 mb-0.5">
      {label}
    </div>
    <div className="font-mono text-[12.5px] text-ink-2">{value}</div>
  </div>
);

/**
 * issued_at (timestamptz の ISO) → YYYY-MM-DD。 失敗時はそのまま返す。
 * 発行日は閲覧者のタイムゾーンに依らず一貫表示すべきため、 日本のサービスとして
 * Asia/Tokyo に固定して整形する (ローカル時刻で切り出すと日付が前後し得る)。
 */
export function formatIssuedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  })
    .format(d)
    .replace(/\//g, "-");
}
