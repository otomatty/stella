import { Download, Eye } from '@/lib/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';

export const CertificatePage = () => (
  <>
    <PageHeader
      title="修了証"
      sub="発行済みの修了証を確認できます"
      actions={
        <>
          <Button>
            <Download size={14} />
            PDF ダウンロード
          </Button>
          <Button>
            <Eye size={14} />
            公開検証ページ
          </Button>
        </>
      }
    />

    <div className="bg-card border border-border rounded-lg py-14 px-12 relative overflow-hidden max-w-[760px] mx-auto text-center">
      <div className="absolute inset-4 border border-border-2 rounded-lg pointer-events-none" />
      <div className="w-[72px] h-[72px] rounded-full mx-auto mb-4 bg-ink text-card grid place-items-center text-[22px] tracking-tight font-semibold relative">
        U
      </div>
      <h2 className="text-xs tracking-widest uppercase text-ink-3 font-semibold mb-1.5 relative">
        Certificate of Completion
      </h2>
      <div className="text-[11.5px] text-ink-3 uppercase tracking-wider relative">修了証明書</div>
      <div className="text-[32px] tracking-tight font-semibold my-5 relative">田中 翔太</div>
      <div className="text-sm text-ink-2 leading-relaxed mb-5 relative">
        上記の者は本学習プログラム
        <br />
        <strong className="text-foreground text-[15px]">
          「Git / GitHub 実務ワークフロー」
        </strong>
        <br />
        の全カリキュラムを修了したことを認定します
      </div>
      <div className="flex justify-around text-xs text-ink-3 mt-7 pt-5 border-t border-dashed border-border-2 relative">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-ink-4 mb-0.5">
            発行日
          </div>
          <div className="font-mono text-[12.5px] text-ink-2">2026-04-10</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-ink-4 mb-0.5">
            認定番号
          </div>
          <div className="font-mono text-[12.5px] text-ink-2">URL-2026-4A9F-2E11</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold text-ink-4 mb-0.5">
            発行者
          </div>
          <div className="font-mono text-[12.5px] text-ink-2">FALCON INFORMAL</div>
        </div>
      </div>
    </div>
  </>
);
