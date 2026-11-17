import { PanelRight } from "lucide-react";

export function VscodeHandoffHint() {
  return (
    <p className="flex items-start gap-1.5 text-[12px] font-semibold leading-snug text-current">
      <PanelRight className="size-4 shrink-0" aria-hidden="true" />
      <span>右側の『進め方』から始めましょう</span>
    </p>
  );
}
