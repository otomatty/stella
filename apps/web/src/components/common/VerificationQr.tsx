import { useMemo } from "react";
import { encode } from "uqr";
import { qrPath } from "@/lib/certificate-display";

export function VerificationQr({ value, className }: { value: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const { data } = encode(value, { ecc: "M", border: 0 });
    return { size: data.length, path: qrPath(data) };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="検証ページの QR コード"
      className={className}
    >
      <path fill="currentColor" d={path} />
    </svg>
  );
}
