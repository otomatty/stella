import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ExternalLink, HelpCircle, X } from "@/lib/icons";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { GENERIC_HELP, findHelpTopic } from "@/components/shell/helpContent";
import type { Role } from "@/data/types";

/**
 * Topbar の「?」から開く画面連動ヘルプ。 現在のルートに対応するトピックを表示し、
 * 定義が無い画面は汎用ヘルプにフォールバックする。
 * ヘルプ定義は受講者向けの文言なので、 `/` や `/stages` のようにロールで中身が
 * 変わる共有ルートで誤案内しないよう、 受講者以外は常に汎用ヘルプを出す。
 * 完全オンデマンド (自動表示・既読管理なし)。
 */
export const HelpDrawer = ({ role }: { role: Role }) => {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const topic = (role === "learner" ? findHelpTopic(pathname) : null) ?? GENERIC_HELP;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="w-[34px] h-[34px] rounded-full grid place-items-center text-ink-2 hover:bg-sunken border border-transparent hover:border-border"
          title="この画面の使い方"
          aria-label="この画面の使い方"
        >
          <HelpCircle size={16} />
        </button>
      </DrawerTrigger>
      {/* セクション本文が説明そのものなので Description は付けない。 */}
      <DrawerContent direction="right" aria-describedby={undefined}>
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerTitle>{topic.title}</DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="w-7 h-7 rounded-full grid place-items-center text-ink-3 hover:bg-sunken"
              aria-label="ヘルプを閉じる"
            >
              <X size={15} />
            </button>
          </DrawerClose>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {topic.sections.map((section) => (
            <section key={section.heading}>
              <h3 className="text-[13px] font-semibold mb-1.5">{section.heading}</h3>
              <p className="text-[12.5px] text-ink-2 leading-relaxed whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>
        <DrawerFooter>
          <a
            href="/support"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink-1 underline underline-offset-2"
          >
            解決しない場合はサポートページへ
            <ExternalLink size={12} />
          </a>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
