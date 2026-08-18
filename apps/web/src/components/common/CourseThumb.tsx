import { useState } from "react";

import { cn } from "@/lib/utils";
import { getMaterialUrl, isStorageConfigured } from "@/lib/storage";
import type { CourseColor } from "@/data/types";

const colorClass: Record<CourseColor, string> = {
  indigo: "thumb-stripes-indigo",
  green: "thumb-stripes-green",
  amber: "thumb-stripes-amber",
  slate: "thumb-stripes-slate",
};

interface CourseThumbProps {
  color?: CourseColor;
  label?: string;
  /**
   * サムネイル画像の R2 パス (`courses.thumbnail_path`)。 正本は教材リポジトリの
   * `packages/content/courses/<slug>/thumbnail.*`。 未設定・ストレージ未設定・
   * 読み込み失敗のいずれでも color のストライプ表示にフォールバックする。
   */
  thumbnailPath?: string | null;
  /**
   * 16:9 の固有比を持たず、`relative` な親要素を絶対配置で埋める。 高さを親
   * (グリッドのセルなど) が決める横並びレイアウトで、画像と表示領域がずれない
   * ようにするためのモード。
   */
  fill?: boolean;
  className?: string;
}

export const CourseThumb = ({
  color = "indigo",
  label,
  thumbnailPath,
  fill = false,
  className,
}: CourseThumbProps) => {
  // 失敗を boolean で持つと、同じインスタンスが別コースのパスを受け取ったとき
  // (ダッシュボードの「受講中の講座」切り替えなど) に新しい画像を二度と試さなくなる。
  // 落ちたパス自体を覚えて、そのパスのときだけフォールバックする。
  const [failedPath, setFailedPath] = useState<string | null>(null);
  // パスは内容ハッシュ入りなので、差し替えれば URL ごと変わる (キャッシュを跨がない)。
  const src =
    thumbnailPath && thumbnailPath !== failedPath && isStorageConfigured()
      ? getMaterialUrl(thumbnailPath)
      : null;

  return (
    <div
      className={cn(
        "overflow-hidden",
        fill ? "absolute inset-0" : "relative w-full aspect-[16/9] border-b border-border",
        className,
      )}
    >
      {/* 画像の読み込み前・失敗時の下地。 */}
      <div className={cn("absolute inset-0", colorClass[color])} />
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedPath(thumbnailPath ?? null)}
        />
      ) : label ? (
        <div className="absolute inset-0 grid place-items-center text-ink-2 text-[11px] font-mono tracking-wider uppercase opacity-75">
          {label}
        </div>
      ) : null}
    </div>
  );
};
