import { useState } from "react";
import { useLibraryMediaUrl } from "@/lib/library-media";
import { placeholderHue } from "@/lib/library-shelf";
import { cn } from "@/lib/utils";

/**
 * 本の表紙 (縦 2:3)。サムネイルが無い・読めないときは書名入りの代わりの表紙を出す。
 * `src` は API の表紙の URL (`/api/library/...`) か、取り込み前のプレビューの blob URL。
 */
export function BookCover({
  title,
  coverUrl,
  previewUrl,
  className,
}: {
  title: string;
  coverUrl?: string | null;
  previewUrl?: string | null;
  className?: string;
}) {
  const media = useLibraryMediaUrl(previewUrl ? null : (coverUrl ?? null));
  const [broken, setBroken] = useState(false);
  const src = previewUrl ?? media.url;
  const hue = placeholderHue(title);
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-[3px] bg-sunken",
        "shadow-[0_1px_2px_rgba(0,0,0,0.18),0_6px_14px_-6px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full flex-col justify-between p-2.5 text-white"
          style={{
            background: `linear-gradient(160deg, hsl(${hue} 45% 42%), hsl(${hue} 50% 26%))`,
          }}
        >
          <span className="line-clamp-5 text-[11px] font-bold leading-snug [overflow-wrap:anywhere]">
            {title}
          </span>
          <span className="h-0.5 w-6 rounded bg-white/60" />
        </div>
      )}
      {/* 背表紙の折り目 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-[5px] bg-gradient-to-r from-black/25 to-transparent"
      />
    </div>
  );
}
