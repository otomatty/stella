import { FolderOpen, PanelRight, Puzzle, ShieldCheck } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Puzzle,
    text: "拡張機能 STELLA を入れる",
    note: "発行元 saedgewell を確認",
  },
  { number: 2, icon: FolderOpen, text: "学習フォルダーを選ぶ（初回だけ）" },
  { number: 3, icon: ShieldCheck, text: "『信頼しますか』→ 信頼する" },
];

export function VscodeHandoffHint() {
  return (
    <div className="space-y-2 text-[12px] leading-snug text-current">
      <p className="flex items-start gap-1.5 font-semibold">
        <PanelRight className="size-4 shrink-0" aria-hidden="true" />
        <span>右側の『進め方』から始めましょう</span>
      </p>
      <div className="space-y-1">
        <p className="text-[11px] opacity-70">課題文が出ないときは</p>
        <ol className="space-y-1">
          {steps.map(({ number, icon: Icon, text, note }) => (
            <li key={text} className="flex items-start gap-1.5">
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ring-1 ring-current opacity-70">
                {number}
              </span>
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span>
                {text}
                {note && <span className="block text-[11px] opacity-70">{note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
