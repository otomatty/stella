/**
 * 公開検証ページ (Issue #26)。 ログイン不要で cert_code から修了証の真正性を確認する。
 *
 * `/?cert=<CODE>` で到達する。 App.tsx が認証分岐より前にこのコンポーネントへ振り分ける。
 * 検証は verify_certificate RPC (security definer, anon 実行可) を呼ぶだけで、
 * certificates テーブルそのものは匿名公開しない (公開して良い情報だけ返る)。
 */

import { useEffect, useState } from "react";
import { ShieldCheck, XCircle } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Brand } from "@/components/common/Brand";
import { CertificateView, formatIssuedAt } from "@/components/common/CertificateView";
import { isApiConfigured } from "@/lib/api-client";
import { verifyCertificate } from "@/lib/certificates-api";
import type { CertificateVerification } from "@falcon/shared/cms/types";

export const PublicCertificateVerify = ({ certCode }: { certCode: string }) => {
  const [state, setState] = useState<"loading" | "done">("loading");
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured()) {
      setError("検証サービスが構成されていません (API 未設定)。");
      setState("done");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await verifyCertificate(certCode);
        if (!cancelled) setResult(r);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "検証に失敗しました");
        }
      } finally {
        if (!cancelled) setState("done");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [certCode]);

  const valid = result?.valid === true;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10">
      <div className="mb-8">
        <Brand size="sm" />
      </div>

      <div className="w-full max-w-[760px]">
        <div className="text-center mb-6">
          <h1 className="text-[20px] font-semibold tracking-tight">修了証の検証</h1>
          <div className="text-[12.5px] text-ink-3 mt-1 font-mono">{certCode}</div>
        </div>

        {state === "loading" ? (
          <div aria-busy="true" aria-live="polite" aria-label="検証中" className="space-y-3 py-6">
            <Skeleton className="mx-auto h-5 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : valid && result ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-brand">
              <ShieldCheck size={18} />
              この修了証は有効です
            </div>
            <CertificateView
              recipientName={result.recipient_name ?? ""}
              courseTitle={result.course_title ?? ""}
              issuer={result.tenant_name ?? ""}
              issuedAt={result.issued_at ? formatIssuedAt(result.issued_at) : ""}
              certCode={result.cert_code ?? certCode}
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg px-6 py-12 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-destructive mb-2">
              <XCircle size={18} />
              {result?.reason === "revoked"
                ? "この修了証は失効しています"
                : "有効な修了証が見つかりません"}
            </div>
            <p className="text-[12.5px] text-ink-3">
              {error ??
                "認定番号をご確認のうえ、 再度お試しください。 不明な点は発行元にお問い合わせください。"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
