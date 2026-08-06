import { ChevronRight, School, Cpu } from '@/lib/icons';
import { TENANTS } from '@/demo/fixtures';
import type { Tenant } from '@/data/types';
import { Brand } from '@/components/common/Brand';

interface TenantSelectProps {
  onPick: (tenant: Tenant) => void;
}

export const TenantSelect = ({ onPick }: TenantSelectProps) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-10">
    <div className="w-full max-w-[460px]">
      <div className="mb-12">
        <Brand size="md" subtitle="テナントを選択してください" />
      </div>
      <h1 className="text-[24px] tracking-tight font-semibold mb-2">テナントを選択</h1>
      <p className="text-ink-3 text-[13.5px] mb-7">
        田中さんは2つのテナントに所属しています。今回アクセスするテナントを選んでください。
      </p>

      <div className="grid gap-2.5">
        {TENANTS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => onPick(t)}
            className="flex items-center gap-3.5 p-3.5 border border-border-2 rounded-md bg-card hover:border-brand hover:bg-brand-soft transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-md bg-sunken grid place-items-center text-ink-2">
              {t.icon === 'school' ? <School size={20} /> : <Cpu size={20} />}
            </div>
            <div>
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-ink-3 mt-0.5">
                {t.subtitle} · {t.active}名アクティブ
              </div>
            </div>
            <div className="ml-auto text-ink-3">
              <ChevronRight size={18} />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 text-[11.5px] text-ink-3 text-center">
        別のアカウントで <a className="text-brand underline underline-offset-2">再ログイン</a>
      </div>
    </div>
  </div>
);
