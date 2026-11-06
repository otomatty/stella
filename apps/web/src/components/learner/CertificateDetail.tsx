/**
 * 修了証 1 枚の詳細。印刷は証書だけ (`.print-certificate`) を A4 横に出す。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { DISPLAY_NAME } from "@stella/shared/brand/display";
import { achievementFromSnapshot } from "@stella/shared/cms/certificate-achievement";
import type { CertificateRow } from "@stella/shared/cms/types";
import { toast } from "sonner";
import { CertificateView } from "@/components/common/CertificateView";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { buildVerificationUrl, listCertificatesForUser } from "@/lib/certificates-api";
import {
  achievementRows,
  achievementSummary,
  buildLinkedInAddUrl,
  findIssuedCertificate,
  formatIssuedDateJa,
} from "@/lib/certificate-display";
import { ArrowLeft, Check, Download, ExternalLink, LinkIcon, SquarePlus } from "@/lib/icons";
import { cn } from "@/lib/utils";

const PDF_HINT = "印刷の画面で『PDF に保存』を選んでください";
const SHARE_NOTE = "リンクを開いた人には、名前・ステージ名・発行日・認定番号が表示されます。";
const SNAPSHOT_NOTE =
  "発行したときの記録です。あとで教材が増えても、この修了証の内容は変わりません。";

interface CertificateDetailProps {
  certId: string;
  userId: string | null;
  backendEnabled: boolean;
  autoPrint: boolean;
}

export function CertificateDetail({
  certId,
  userId,
  backendEnabled,
  autoPrint,
}: CertificateDetailProps) {
  if (!backendEnabled) {
    return (
      <div className="mx-auto w-full max-w-[1120px] pb-24">
        <BackToList />
      </div>
    );
  }
  if (!userId) return <SkeletonRows rows={3} className="py-6" />;
  return <LiveCertificateDetail certId={certId} userId={userId} autoPrint={autoPrint} />;
}

function LiveCertificateDetail({
  certId,
  userId,
  autoPrint,
}: {
  certId: string;
  userId: string;
  autoPrint: boolean;
}) {
  const [rows, setRows] = useState<CertificateRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setFailed(false);
    listCertificatesForUser(userId)
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[CertificateDetail] load failed", err);
        toast.error("修了証の読み込みに失敗しました");
        setFailed(true);
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const cert = rows ? findIssuedCertificate(rows, certId) : null;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pb-24">
      <BackToList />
      {rows === null ? <SkeletonRows rows={3} className="py-6" /> : null}
      {rows !== null && !cert ? (
        <p className="text-[15px]">
          {failed ? "修了証の読み込みに失敗しました" : "この修了証は見つかりません"}
        </p>
      ) : null}
      {cert ? <CertificateBody cert={cert} autoPrint={autoPrint} /> : null}
    </div>
  );
}

function CertificateBody({ cert, autoPrint }: { cert: CertificateRow; autoPrint: boolean }) {
  const navigate = useNavigate({ from: "/certificates/$certId" });
  const verifyUrl = buildVerificationUrl(cert.cert_code);
  const issuedLabel = formatIssuedDateJa(cert.issued_at);
  const achievement = achievementFromSnapshot(cert.criteria_snapshot);
  const rows = achievementRows(achievement);
  const summary = achievementSummary(achievement);
  const { copied, copy } = useCopiedVerifyLink(verifyUrl);

  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;
    const print = () => {
      if (cancelled) return;
      window.print();
      void navigate({ search: {}, replace: true });
    };
    // 書体が揃ってから 1 回だけ。Strict Mode の再実行は cancelled で捨てる。
    const ready = document.fonts?.ready ?? Promise.resolve();
    void ready.then(print, print);
    return () => {
      cancelled = true;
    };
  }, [autoPrint, navigate]);

  return (
    <>
      <header className="flex flex-col gap-1.5">
        <p className="text-[12.5px] font-semibold text-brand">修了証</p>
        <h1 className="text-[20px] font-bold leading-snug tracking-tight lg:text-[26px]">
          {cert.stage_title}
        </h1>
        <p className="text-[13.5px] text-ink-2">
          {issuedLabel} 発行
          <span className="hidden lg:inline">
            {" · 認定番号 "}
            <span className="font-mono text-[13px] text-foreground">{cert.cert_code}</span>
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="print-certificate overflow-hidden border border-border bg-white shadow-lg">
            <CertificateView
              recipientName={cert.recipient_name}
              stageTitle={cert.stage_title}
              issuer={cert.issuer_name}
              issuedAt={issuedLabel}
              certCode={cert.cert_code}
              verifyUrl={verifyUrl}
              achievement={achievement}
            />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
            PDF はこの証書だけを A4 横で書き出します。画面のメニューや一覧は入りません。
          </p>
        </div>

        <div className="hidden w-80 shrink-0 flex-col gap-3.5 lg:flex">
          <section
            aria-labelledby="cert-share-heading"
            className="flex flex-col gap-2.5 rounded-md border border-border bg-card p-[18px]"
          >
            <h2 id="cert-share-heading" className="text-sm font-bold">
              保存と共有
            </h2>
            <ShareActions
              cert={cert}
              verifyUrl={verifyUrl}
              copied={copied}
              onCopy={copy}
              buttonClassName="h-10 w-full"
            />
            <p className="text-[12.5px] leading-relaxed text-ink-2">{SHARE_NOTE}</p>
          </section>

          <section
            aria-labelledby="cert-done-heading"
            className="flex flex-col gap-3 rounded-md border border-border bg-card p-[18px]"
          >
            <h2 id="cert-done-heading" className="text-sm font-bold">
              修了の内容
            </h2>
            <dl className="flex flex-col gap-2.5 text-[13.5px]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="inline-flex items-center gap-1.5 text-ink-2">
                    <Check
                      size={15}
                      strokeWidth={2.5}
                      className="text-success"
                      aria-hidden="true"
                    />
                    {row.label}
                  </dt>
                  <dd className="font-semibold">{row.value}</dd>
                </div>
              ))}
              <div
                className={cn(
                  "flex items-center justify-between gap-3",
                  rows.length > 0 && "border-t border-border pt-2.5",
                )}
              >
                <dt className="text-ink-2">修了した日</dt>
                <dd className="font-semibold">{issuedLabel}</dd>
              </div>
            </dl>
            <p className="text-[12.5px] leading-relaxed text-ink-2">{SNAPSHOT_NOTE}</p>
          </section>

          <section
            aria-labelledby="cert-verify-heading"
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-[18px]"
          >
            <h2 id="cert-verify-heading" className="text-sm font-bold">
              検証ページ
            </h2>
            <p className="break-all font-mono text-xs text-ink-2">{verifyUrl}</p>
            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center gap-1 self-start text-[13px] font-semibold text-brand hover:text-brand-hover"
            >
              ほかの人に見える画面を開く
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:hidden">
          <ShareActions
            cert={cert}
            verifyUrl={verifyUrl}
            copied={copied}
            onCopy={copy}
            buttonClassName="h-auto min-h-11 w-full whitespace-normal px-3 py-2"
          />
          <p className="text-[12.5px] leading-relaxed text-ink-2">{SHARE_NOTE}</p>
          <MobileFacts certCode={cert.cert_code} summary={summary} issuer={cert.issuer_name} />
        </div>
      </div>
    </>
  );
}

function ShareActions({
  cert,
  verifyUrl,
  copied,
  onCopy,
  buttonClassName,
}: {
  cert: CertificateRow;
  verifyUrl: string;
  copied: boolean;
  onCopy: () => Promise<void>;
  buttonClassName: string;
}) {
  const linkedInUrl = buildLinkedInAddUrl({
    stageTitle: cert.stage_title,
    issuedAt: cert.issued_at,
    certCode: cert.cert_code,
    verifyUrl,
    organizationName: DISPLAY_NAME,
  });
  return (
    <div className="flex flex-col gap-2.5">
      <Button
        type="button"
        variant="primary"
        className={buttonClassName}
        title={PDF_HINT}
        onClick={() => window.print()}
      >
        <Download size={16} aria-hidden="true" />
        PDF で保存
      </Button>
      <Button type="button" className={buttonClassName} onClick={() => void onCopy()}>
        <LinkIcon size={16} aria-hidden="true" />
        {copied ? "コピーしました" : "検証用のリンクをコピー"}
      </Button>
      <Button asChild className={buttonClassName}>
        <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
          <SquarePlus size={16} aria-hidden="true" />
          LinkedIn の資格欄に追加
        </a>
      </Button>
    </div>
  );
}

function MobileFacts({
  certCode,
  summary,
  issuer,
}: {
  certCode: string;
  summary: string | null;
  issuer: string;
}) {
  const items = [
    { label: "認定番号", value: certCode, mono: true },
    ...(summary ? [{ label: "修了の内容", value: summary, mono: false }] : []),
    { label: "発行者", value: issuer, mono: false },
  ];
  return (
    <dl className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 px-3.5 py-3">
          <dt className="text-xs text-ink-2">{item.label}</dt>
          <dd className={cn("text-sm", item.mono && "break-all font-mono")}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BackToList() {
  return (
    <Link
      to="/certificates"
      className="inline-flex min-h-11 items-center gap-1 self-start text-[13px] text-ink-2 hover:text-foreground lg:min-h-8"
    >
      <ArrowLeft size={15} aria-hidden="true" />
      修了証の一覧
    </Link>
  );
}

function useCopiedVerifyLink(url: string): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("検証用のリンクをコピーしました");
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("検証用のリンクをコピーできませんでした");
    }
  }, [url]);

  return { copied, copy };
}
