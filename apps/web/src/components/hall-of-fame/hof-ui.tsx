/**
 * 殿堂 (Hall of Fame) の共通パーツ (Phase 5)。
 *
 * 殿堂の 2 ページと、本人の記入画面のプレビューが **同じ部品** を使う。プレビューが
 * 別実装だと「公開されたら見た目が違った」が起き、掲載に同意した内容と実際に出る
 * ものがずれてしまう。
 *
 * 配色は `.hof` (index.css) の固定トークンだけを使う — アプリのテーマ (light / dark) を
 * 参照しない唯一の空間。
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** 夜空の面。殿堂のページはすべてこの中に入る。 */
export function HofSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("hof rounded-xl overflow-hidden", className)}>
      <div className="hof-stars">{children}</div>
    </div>
  );
}

/**
 * 読み込み中のプレースホルダ (夜空トーン)。
 *
 * 共通の `Skeleton` は `bg-muted` — アプリのテーマトークンなので、`.hof` の中で使うと
 * ライトテーマでは夜空に明るい灰色の板が浮く。殿堂はテーマを参照しない唯一の空間
 * なので、待ち時間の見た目もここで持つ。
 */
export function HofPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md", className)}
      style={{ background: "var(--hof-panel)", border: "1px solid var(--hof-line)" }}
    />
  );
}

/** 金の輪のアバター (イニシャル)。写真は持たない — 実名と名乗りだけで十分。 */
export function HofAvatar({
  name,
  initials,
  size = "md",
}: {
  name: string;
  initials?: string | null;
  size?: "md" | "lg";
}) {
  const label = (initials ?? name.slice(0, 2)).slice(0, 2);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "hof-ring shrink-0 rounded-full grid place-items-center font-semibold",
        size === "lg" ? "w-16 h-16 text-[19px]" : "w-11 h-11 text-[14px]",
      )}
    >
      {label}
    </div>
  );
}

/** 金タグのジョブ (本人が名乗る肩書き)。表示専用で、絞り込みには使わない。 */
export function HofJobTag({ job, className }: { job: string; className?: string }) {
  if (!job) return null;
  return (
    <span
      className={cn(
        "hof-ring inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-medium",
        className,
      )}
    >
      {job}
    </span>
  );
}

/** 明朝の引用。カードでは 1 行、詳細では大きく出す。 */
export function HofQuote({
  quote,
  size = "sm",
  className,
}: {
  quote: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  if (!quote) return null;
  return (
    <p
      className={cn(
        "hof-serif",
        size === "lg" ? "text-[22px] sm:text-[28px] leading-[1.6]" : "text-[14px] leading-relaxed",
        className,
      )}
      style={{ color: size === "lg" ? "var(--hof-ink)" : "var(--hof-ink-2)" }}
    >
      「{quote}」
    </p>
  );
}

/** ともした星のチップ (教材名)。**数は書かない** — 何個あるかは並びが語れば足りる。 */
export function HofStarChip({ title }: { title: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
      style={{
        border: "1px solid var(--hof-line)",
        color: "var(--hof-ink-2)",
      }}
    >
      <span aria-hidden="true" style={{ color: "var(--hof-gold)" }}>
        ✦
      </span>
      {title}
    </span>
  );
}

/*
 * TODO(hall-of-fame): ステージをクリアした瞬間の祝いモーダルに、殿堂のカードを 1 枚
 * 差し込みたい (「この星をともした人がここにいます」)。**祝いモーダル自体がまだ無い**
 * ので今回は作らない — そのためだけにモーダルを新設すると、殿堂の都合で祝いの体験が
 * 決まってしまう。祝いモーダルを作るときに、この `HofAvatar` / `HofQuote` をそのまま
 * 使って 1 枚組み込むこと (カードの見た目を二重に実装しない)。
 */

/** 「運営が選び、本人が承諾して載っている」という 1 行。トップと詳細の両方に出す。 */
export const HOF_PROVENANCE_NOTE = "運営が学習実績をもとに選出し、本人の承諾を得て掲載しています。";
