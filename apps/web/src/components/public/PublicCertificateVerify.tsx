/** ログイン不要の公開検証ページ。公開 API が返す発行の記録だけを表示する。 */
import { DISPLAY_NAME } from "@stella/shared/brand/display";
import type { CertificateVerification } from "@stella/shared/cms/types";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Brand } from "@/components/common/Brand";
import { CertificateView } from "@/components/common/CertificateView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiConfigured } from "@/lib/api-client";
import {
  achievementConditionText,
  formatCheckedAtJa,
  formatIssuedDateJa,
  normalizeCertCode,
} from "@/lib/certificate-display";
import { buildVerificationUrl, verifyCertificate } from "@/lib/certificates-api";
import { AlertTriangle, Search, ShieldCheck } from "@/lib/icons";

const tableClass =
  "grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-x-8 gap-y-[18px] px-5 py-6 sm:px-7";

function Detail({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-[3px]">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={`m-0 break-words ${mono ? "font-mono text-sm" : "text-[15px] font-semibold"}`}>
        {children}
      </dd>
    </div>
  );
}

export const PublicCertificateVerify = ({ certCode }: { certCode: string }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "done">("loading");
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [inputCode, setInputCode] = useState(certCode);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `修了証の検証 | ${DISPLAY_NAME}`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  // retry は同じ認定番号をフォームから再送信したときの再照会にも使う。
  useEffect(() => {
    void retry;
    setState("loading");
    setResult(null);
    setError(null);
    setCheckedAt(null);
    setInputCode(certCode);
    if (!isApiConfigured()) {
      setError("検証サービスが構成されていません (API 未設定)。");
      setState("done");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await verifyCertificate(certCode);
        if (!cancelled) {
          setResult(r);
          setCheckedAt(new Date());
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "検証に失敗しました。");
      } finally {
        if (!cancelled) setState("done");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [certCode, retry]);

  const valid = result?.valid === true;
  const revoked = result?.reason === "revoked";
  const condition = achievementConditionText(result?.achievement);
  const code = result?.cert_code ?? certCode;
  const checked = checkedAt ? formatCheckedAtJa(checkedAt) : "";
  const issued = result?.issued_at ? formatIssuedDateJa(result.issued_at) : "";
  const Icon = error ? Search : valid ? ShieldCheck : revoked ? AlertTriangle : Search;
  const tone = error
    ? "bg-sunken text-ink-2"
    : valid
      ? "bg-success-soft text-green-800 dark:text-success"
      : revoked
        ? "bg-danger-soft text-red-800 dark:text-danger"
        : "text-foreground";

  return (
    <main className="min-h-screen bg-background text-foreground px-4 pt-10 pb-[72px]">
      <div className="mx-auto flex w-full max-w-[960px] min-w-0 flex-col gap-6">
        <header className="flex flex-wrap items-center gap-3">
          <Brand size="sm" />
          <span className="border-l border-border pl-3 text-[13px] text-ink-3">修了証の検証</span>
        </header>

        {state === "loading" ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            aria-label="検証中"
            className="space-y-3 py-6"
          >
            <Skeleton className="mx-auto h-5 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <section
              aria-labelledby="verification-heading"
              className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div
                className={`flex flex-wrap items-start gap-4 px-5 py-6 sm:px-7 ${tone} ${valid || revoked ? "border-b border-border" : ""}`}
              >
                <div
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${valid ? "bg-success-soft" : revoked ? "bg-danger-soft" : "bg-sunken text-ink-2"}`}
                >
                  <Icon size={26} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-[1_1_320px] space-y-1">
                  <h1 id="verification-heading" className="text-[22px] font-bold">
                    {error
                      ? "いまは確かめられません"
                      : valid
                        ? "有効な修了証です"
                        : revoked
                          ? "この修了証は取り消されています"
                          : "この認定番号の修了証は見つかりません"}
                  </h1>
                  <p className="break-words text-[13.5px] leading-[1.7] text-ink-2">
                    {error
                      ? `${error} 時間をおいて開き直してください。`
                      : valid
                        ? `${DISPLAY_NAME} が発行し、取り消されていない修了証です。${checked} に発行の記録と照らし合わせました。`
                        : revoked
                          ? `発行元の ${DISPLAY_NAME} が取り消したため、いまは有効ではありません。くわしくは、この修了証を見せた人にお尋ねください。`
                          : "打ち間違いがないか確かめてください。認定番号は FLC- で始まり、証書の右上に書いてあります。証書の QR コードから開くと、番号を打たずに確かめられます。"}
                  </p>
                </div>
              </div>
              {!error && (valid || revoked) ? (
                <dl className={tableClass}>
                  {valid && (
                    <>
                      <Detail label="受講者">{result?.recipient_name}</Detail>
                      <Detail label="ステージ">{result?.stage_title}</Detail>
                      <Detail label="発行日">{issued}</Detail>
                      <Detail label="発行者">{result?.issuer_name}</Detail>
                    </>
                  )}
                  <Detail label="認定番号" mono>
                    {code}
                  </Detail>
                  {valid && condition && (
                    <Detail label="修了の条件">
                      <span className="text-sm font-normal leading-relaxed">{condition}</span>
                    </Detail>
                  )}
                  {revoked && <Detail label="確かめた日時">{checked}</Detail>}
                </dl>
              ) : !error ? (
                <form
                  className="flex flex-wrap items-end gap-2.5 px-5 pb-7 sm:pl-[92px] sm:pr-7"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const normalized = normalizeCertCode(inputCode);
                    if (!normalized) return;
                    if (normalized === certCode) setRetry((value) => value + 1);
                    void navigate({ to: "/verify/$certCode", params: { certCode: normalized } });
                  }}
                >
                  <div className="flex min-w-0 max-w-[360px] flex-[1_1_280px] flex-col gap-1.5">
                    <label htmlFor="cert-code" className="text-[13px] font-semibold">
                      認定番号
                    </label>
                    <input
                      id="cert-code"
                      type="text"
                      value={inputCode}
                      onChange={(event) => setInputCode(event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="h-[42px] w-full min-w-0 rounded-lg border border-border-strong bg-card px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="lg" className="h-[42px] rounded-lg">
                    確かめる
                  </Button>
                </form>
              ) : null}
            </section>
            {!error && valid && result && (
              <div className="mx-auto w-full max-w-[900px] overflow-hidden border border-border shadow-xl">
                <CertificateView
                  verifyUrl={buildVerificationUrl(code)}
                  achievement={result.achievement}
                  recipientName={result.recipient_name ?? ""}
                  stageTitle={result.stage_title ?? ""}
                  issuer={result.issuer_name ?? ""}
                  issuedAt={issued}
                  certCode={code}
                />
              </div>
            )}
          </>
        )}
        <p className="mt-2 text-center text-[12.5px] leading-[1.8] text-ink-3">
          この画面は、認定番号から {DISPLAY_NAME}{" "}
          の発行の記録を照会しています。内容に心当たりがない場合は発行元にお問い合わせください。
        </p>
      </div>
    </main>
  );
};
