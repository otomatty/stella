import { DISPLAY_NAME } from "@stella/shared/brand/display";
import type { CertificateAchievement } from "@stella/shared/cms/certificate-achievement";
import { BrandMark } from "@/components/common/BrandMark";
import { VerificationQr } from "@/components/common/VerificationQr";
import { achievementLabel, splitVerificationUrl } from "@/lib/certificate-display";

interface CertificateViewProps {
  recipientName: string;
  stageTitle: string;
  /** 発行済みの証書は発行時に保存された名前。 */
  issuer: string;
  /** 日本の発行日として整形済みの文字列。 */
  issuedAt: string;
  certCode: string;
  verifyUrl: string;
  achievement?: CertificateAchievement | null;
  className?: string;
}

/** A4 横の証書。内部の長さは紙の幅を基準とした cqw で縮尺を保つ。 */
export function CertificateView({
  recipientName,
  stageTitle,
  issuer,
  issuedAt,
  certCode,
  verifyUrl,
  achievement,
  className,
}: CertificateViewProps) {
  const label = achievementLabel(achievement);
  const address = splitVerificationUrl(verifyUrl);
  return (
    <div
      className={className}
      style={{
        width: "100%",
        aspectRatio: "297 / 210",
        containerType: "inline-size",
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
        color: "#0e0e10",
        fontFamily: "'Noto Serif JP', serif",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "2.49332cqw",
          right: "2.49332cqw",
          bottom: "2.49332cqw",
          left: "2.49332cqw",
          border: "0.13357cqw solid #1c1a3d",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          top: "3.20570cqw",
          right: "3.20570cqw",
          bottom: "3.20570cqw",
          left: "3.20570cqw",
          border: "0.08905cqw solid #d6d2f3",
        }}
      ></div>
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        style={{
          width: "49.86643cqw",
          height: "49.86643cqw",
          position: "absolute",
          left: "25.02226cqw",
          top: "12.46661cqw",
          opacity: 0.05,
        }}
      >
        <path
          fill="none"
          stroke="#4335c6"
          strokeWidth="4"
          d="M256 92 L298 232 L448 232 L326 316 L368 456 L256 372 L144 456 L186 316 L64 232 L214 232 Z"
        ></path>
      </svg>

      <div
        style={{
          position: "relative",
          height: "100%",
          fontSize: "1.42476cqw",
          boxSizing: "border-box",
          padding: "6.23330cqw 8.19234cqw 5.69902cqw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.89047cqw" }}>
            <div
              className="sf-gradient-135-bg"
              style={{
                width: "3.02760cqw",
                height: "3.02760cqw",
                borderRadius: "0.80142cqw",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
              }}
            >
              <BrandMark style={{ width: "1.86999cqw", height: "1.86999cqw" }} />
            </div>
            <span
              style={{
                fontFamily: "Figtree, sans-serif",
                fontWeight: "700",
                fontSize: "1.42476cqw",
                letterSpacing: "0.19947cqw",
              }}
            >
              {DISPLAY_NAME}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: "1.06857cqw",
              color: "#4a4a52",
              display: "flex",
              alignItems: "baseline",
              gap: "0.89047cqw",
            }}
          >
            <span>認定番号</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1.15761cqw",
                color: "#0e0e10",
                letterSpacing: "0.02315cqw",
              }}
            >
              {certCode}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: "3.02760cqw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.06857cqw",
          }}
        >
          <div
            style={{
              fontSize: "4.09617cqw",
              fontWeight: "600",
              letterSpacing: "1.72039cqw",
              paddingLeft: "1.72039cqw",
              lineHeight: "1.1",
            }}
          >
            修了証明書
          </div>
          <div
            style={{
              fontFamily: "Figtree, sans-serif",
              fontSize: "1.11309cqw",
              fontWeight: "600",
              letterSpacing: "0.37845cqw",
              paddingLeft: "0.37845cqw",
              color: "#55555e",
            }}
          >
            CERTIFICATE OF COMPLETION
          </div>
        </div>

        <div
          style={{
            marginTop: "4.09617cqw",
            minWidth: "40.96171cqw",
            padding: "0 3.20570cqw 1.06857cqw",
            borderBottom: "0.08905cqw solid #1c1a3d",
            display: "flex",
            justifyContent: "center",
            alignItems: "baseline",
            gap: "1.24666cqw",
          }}
        >
          <span
            style={{
              fontSize: "4.45236cqw",
              fontWeight: "600",
              letterSpacing: "0.26714cqw",
              lineHeight: "1.15",
            }}
          >
            {recipientName}
          </span>
          <span style={{ fontSize: "1.78094cqw", color: "#33333a" }}>殿</span>
        </div>

        <div
          style={{
            margin: "2.67142cqw 0 0",
            maxWidth: "62.33304cqw",
            textAlign: "center",
            fontSize: "1.51380cqw",
            lineHeight: "2",
            color: "#26262c",
          }}
        >
          <p className="certificate-phrase" style={{ margin: 0 }}>
            あなたは {DISPLAY_NAME} のステージ「{stageTitle}」の修了条件をすべて満たしました。
          </p>
          <p className="certificate-phrase" style={{ margin: 0 }}>
            その学びの成果をここに証します。
          </p>
        </div>

        {label ? (
          <div
            style={{
              marginTop: "1.42476cqw",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.71238cqw",
              padding: "0.53428cqw 1.42476cqw",
              borderRadius: "88.95815cqw",
              background: "#f2f1fb",
              color: "#3a2fa8",
              fontFamily: "'Noto Sans JP', sans-serif",
              fontSize: "1.15761cqw",
              fontWeight: "500",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ width: "1.33571cqw", height: "1.33571cqw" }}
            >
              <path d="M20 6 9 17l-5-5"></path>
            </svg>
            {label}
          </div>
        ) : null}

        <div style={{ flex: "1 1 auto" }}></div>

        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            alignItems: "end",
            gap: "2.13713cqw",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.24666cqw" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.26714cqw" }}>
              <span
                style={{
                  fontFamily: "'Noto Sans JP', sans-serif",
                  fontSize: "0.97952cqw",
                  letterSpacing: "0.11754cqw",
                  color: "#55555e",
                }}
              >
                発行日
              </span>
              <span style={{ fontSize: "1.51380cqw", fontWeight: "600" }}>{issuedAt}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.26714cqw" }}>
              <span
                style={{
                  fontFamily: "'Noto Sans JP', sans-serif",
                  fontSize: "0.97952cqw",
                  letterSpacing: "0.11754cqw",
                  color: "#55555e",
                }}
              >
                発行者
              </span>
              <span style={{ fontSize: "1.51380cqw", fontWeight: "600" }}>{issuer}</span>
            </div>
          </div>

          <svg
            viewBox="0 0 96 96"
            role="img"
            aria-label="STELLA の認定印"
            style={{ width: "8.90472cqw", height: "8.90472cqw" }}
          >
            <circle cx="48" cy="48" r="45" fill="none" stroke="#3a2fa8" strokeWidth="2"></circle>
            <circle
              cx="48"
              cy="48"
              r="38.5"
              fill="none"
              stroke="#3a2fa8"
              strokeWidth="0.8"
              strokeDasharray="1.6 2.6"
            ></circle>
            <path
              transform="translate(28 19) scale(0.078)"
              fill="#3a2fa8"
              d="M256 92 L298 232 L448 232 L326 316 L368 456 L256 372 L144 456 L186 316 L64 232 L214 232 Z"
            ></path>
            <text
              x="48"
              y="68"
              textAnchor="middle"
              fontSize="8.5"
              letterSpacing="1.6"
              fill="#3a2fa8"
              fontFamily="Figtree, sans-serif"
              fontWeight="700"
            >
              {DISPLAY_NAME}
            </text>
            <text
              x="48"
              y="78"
              textAnchor="middle"
              fontSize="6.5"
              letterSpacing="1.2"
              fill="#3a2fa8"
              fontFamily="'Noto Sans JP', sans-serif"
            >
              認定
            </text>
          </svg>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "flex-end",
              gap: "1.24666cqw",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "0.26714cqw",
                textAlign: "right",
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            >
              <span
                style={{ fontSize: "0.97952cqw", letterSpacing: "0.11754cqw", color: "#55555e" }}
              >
                本物かどうかの確認
              </span>
              <span style={{ fontSize: "1.06857cqw", color: "#26262c" }}>
                QR コードか、次のアドレスから
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.97952cqw",
                  color: "#26262c",
                  lineHeight: "1.5",
                }}
              >
                {address.host}
                <br />
                {address.path}
              </span>
            </div>
            <VerificationQr
              value={verifyUrl}
              className="block w-[7.1238cqw] h-[7.1238cqw] shrink-0 text-[#0e0e10]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
