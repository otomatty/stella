import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  beatOverlayCss,
  beatOverlayFrame,
  codeColorsCss,
  dialogOverlayCss,
  OVERLAY_FADE_SECONDS,
  overlayBackdrop,
  termOverlayCss,
  VIDEO_COLORS,
  VIDEO_FONT,
  WHITE_FADE_SECONDS,
} from "../src/scene-overlays";
import { useSceneFonts } from "./lib/fonts";
import type { BeatOverlay, MotionSceneProps } from "./lib/props";
import { motionComponents } from "./motions";

function Overlay({ overlay }: { overlay: BeatOverlay }) {
  if (overlay.term) {
    const { text, ruby, note } = overlay.term;
    return (
      <div>
        <div className="term-text">
          {ruby ? (
            <ruby>
              {text}
              <rt>{ruby}</rt>
            </ruby>
          ) : (
            text
          )}
        </div>
        <div className="term-line" />
        {note && <div className="term-note">{note}</div>}
      </div>
    );
  }
  const { title, fontSize, lines } = overlay.dialog;
  const code: ReactNode[] = [];
  let offset = 0;
  for (const line of lines) {
    for (const { text, className } of line) {
      code.push(
        <span key={offset} className={className}>
          {text}
        </span>,
      );
      offset += text.length;
    }
    code.push("\n");
    offset++;
  }
  code.pop();
  return (
    <div className="code-dialog">
      <header className="dialog-heading">
        <h2 className="dialog-title">{title}</h2>
      </header>
      <pre className="dialog-code" style={{ fontSize }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ThinkTimer({
  think,
  time,
}: {
  think: NonNullable<MotionSceneProps["think"]>;
  time: number;
}) {
  const { start, duration } = think;
  const fade = OVERLAY_FADE_SECONDS;
  const end = start + duration;
  const opacity = Math.max(
    0,
    Math.min(1, (time - start + fade) / fade, (end + fade - time) / fade),
  );
  if (!opacity) return null;
  const remaining = Math.max(0, Math.min(duration, end - time));
  const { line, violet } = VIDEO_COLORS;
  return (
    <div
      style={{
        position: "absolute",
        right: 60,
        top: 32,
        zIndex: 4,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "12px 16px 12px 24px",
        background: "white",
        border: `2px solid ${line}`,
        borderRadius: 16,
        color: "#5C5C66",
        fontSize: 28,
        opacity,
      }}
    >
      考える時間
      <svg width={72} height={72} viewBox="0 0 72 72" aria-hidden="true">
        <circle cx={36} cy={36} r={33} fill="none" stroke={line} strokeWidth={6} />
        <circle
          cx={36}
          cy={36}
          r={33}
          fill="none"
          stroke={violet}
          strokeWidth={6}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - remaining / duration}
          transform="rotate(-90 36 36)"
        />
        <text
          x={36}
          y={36}
          textAnchor="middle"
          dominantBaseline="central"
          fill={violet}
          fontSize={34}
          fontWeight={700}
        >
          {Math.max(1, Math.ceil(remaining - 1e-9))}
        </text>
      </svg>
    </div>
  );
}

export function MotionScene({
  motion,
  beats,
  duration,
  fadeFromBackground,
  overlays,
  think,
}: MotionSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const { Component, text } = motionComponents[motion];
  const overlayText = overlays
    .map(({ term, dialog }) => (term ? [term.text, term.ruby, term.note].join("") : dialog.title))
    .join("");
  const code = overlays
    .flatMap(({ dialog }) => dialog?.lines.flat().map(({ text }) => text) ?? [])
    .join("");
  useSceneFonts(text + overlayText + code + (think ? "考える時間0123456789" : ""), code);

  const { index, opacity, scale } = beatOverlayFrame(overlays, time, OVERLAY_FADE_SECONDS);
  const overlay = overlays[index];
  return (
    <AbsoluteFill
      style={{
        background: VIDEO_COLORS.white,
        color: VIDEO_COLORS.ink,
        fontFamily: VIDEO_FONT,
        fontWeight: 500,
        overflow: "hidden",
      }}
    >
      <style>{`*{box-sizing:border-box}${beatOverlayCss}${termOverlayCss}${dialogOverlayCss}${codeColorsCss}`}</style>
      <Component beats={beats} duration={duration} />
      {fadeFromBackground && time < WHITE_FADE_SECONDS && (
        <AbsoluteFill
          style={{
            background: VIDEO_COLORS.white,
            opacity: 1 - time / WHITE_FADE_SECONDS,
            zIndex: 2,
          }}
        />
      )}
      {think && <ThinkTimer think={think} time={time} />}
      {overlay && opacity > 0 && (
        <div
          id="beat-overlay"
          style={{
            background: overlayBackdrop(Boolean(overlay.dialog)),
            opacity,
            visibility: "visible",
          }}
        >
          <div style={{ transform: `scale(${scale})` }}>
            <Overlay overlay={overlay} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}
