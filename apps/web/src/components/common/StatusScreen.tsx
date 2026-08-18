/**
 * ステータス画面 (404 / 403 / エラー) の共通レイアウト。
 *
 * AppShell の内側 (サイドバー付き) でも、 公開ページ (未ログイン / シェル外) でも
 * 同じ見た目で使えるようにしている。 `standalone` を立てると Brand 付きの全画面表示になる。
 */

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { ChevronRight } from "@/lib/icons";
import { Brand } from "@/components/common/Brand";
import { Card } from "@/components/ui/card";

export interface StatusScreenLink {
  label: string;
  description?: string;
  icon: ComponentType<LucideProps>;
  onSelect: () => void;
}

interface StatusScreenProps {
  /** 大きく表示するステータスコード (404 / 403 / 500)。 装飾なので読み上げ対象外。 */
  code: string;
  icon: ComponentType<LucideProps>;
  title: string;
  description: ReactNode;
  /** 主導線のボタン群。 */
  actions?: ReactNode;
  /** 「ここから探せます」の補助導線。 */
  links?: StatusScreenLink[];
  /** エラー詳細など、 リンクの下に置く任意の要素。 */
  detail?: ReactNode;
  /** AppShell の外 (公開ページ) で使うとき。 */
  standalone?: boolean;
}

export const StatusScreen = ({
  code,
  icon: Icon,
  title,
  description,
  actions,
  links,
  detail,
  standalone = false,
}: StatusScreenProps) => {
  const body = (
    <div className="w-full max-w-[560px] mx-auto text-center">
      <div className="w-12 h-12 rounded-full bg-sunken grid place-items-center text-ink-3 mx-auto mb-5">
        <Icon size={22} />
      </div>
      <div
        aria-hidden="true"
        className="font-display font-extrabold text-[56px] leading-none tracking-tight sf-gradient-text"
      >
        {code}
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight mt-4">{title}</h1>
      <div className="text-[13px] text-ink-3 mt-2 leading-relaxed">{description}</div>

      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">{actions}</div>
      ) : null}

      {links?.length ? (
        <Card className="mt-8 text-left">
          <ul>
            {links.map((link) => (
              <li key={link.label} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={link.onSelect}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sunken transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-sunken grid place-items-center text-ink-3 shrink-0">
                    <link.icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate">{link.label}</span>
                    {link.description ? (
                      <span className="block text-[11.5px] text-ink-3 truncate">
                        {link.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={15} className="text-ink-3 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {detail ? <div className="mt-6 text-left">{detail}</div> : null}
    </div>
  );

  if (!standalone) return <div className="py-8 sm:py-14">{body}</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-4 py-10">
      <div className="mb-10">
        <Brand size="sm" />
      </div>
      <div className="w-full">{body}</div>
    </div>
  );
};
