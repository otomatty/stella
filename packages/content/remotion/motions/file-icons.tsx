import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, GREEN, INK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const CODE = '"sea.jpg".endsWith(".jpg") → true';
const FILES = [
  { id: "sea", stem: "sea", ext: ".jpg", kind: "sea" },
  { id: "memo", stem: "memo", ext: ".txt", kind: "memo" },
  { id: "hill", stem: "hill", ext: ".jpg", kind: "hill" },
] as const;
/** 用紙の中央。名前の右端と拡張子の左端をここに揃える。 */
const NAME_JOIN = 0;
const XS = [560, 960, 1360] as const;
export const fileIconsText = `${FILES.map((file) => `${file.stem}${file.ext}`).join("")}${CODE}`;

const SHEET = "M -110 0 H 62 L 110 48 V 280 H -110 Z";
const FOLD = "M 62 0 V 48 H 110";
const KRAFT = "#E2C08A";
const KRAFT_DEEP = "#A67532";
const KRAFT_EDGE = "#8C5E28";

function Sea() {
  return (
    <g>
      <rect x={-86} y={28} width={172} height={148} rx={8} fill="#8ECAE6" />
      <circle cx={46} cy={68} r={22} fill="#F0B429" />
      <path d="M -86 118 Q -40 96 0 118 T 86 118 V 176 H -86 Z" fill={BLUE} />
      <path d="M -86 138 Q -40 122 0 140 T 86 132 V 176 H -86 Z" fill="#1D4E89" />
    </g>
  );
}

function Hill() {
  return (
    <g>
      <rect x={-86} y={28} width={172} height={148} rx={8} fill="#B9DFF5" />
      <ellipse cx={-28} cy={78} rx={28} ry={16} fill="#fff" />
      <ellipse cx={2} cy={74} rx={22} ry={14} fill="#fff" />
      <path d="M -86 176 V 128 Q -20 78 40 124 Q 70 100 86 112 V 176 Z" fill={GREEN} />
      <path d="M -86 176 V 150 Q 0 118 86 156 V 176 Z" fill="#128A3E" />
    </g>
  );
}

export function FileIcons({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["file-icons"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#files-folder", at(0));
      FILES.forEach((file, i) => {
        show(`#files-doc-${file.id}`, at(1, 0.3 + i * 0.7));
        const when = at(2, 0.25 + i * 1.15);
        const photo = file.kind !== "memo";
        const color = photo ? BLUE : GRAY;
        show(`#files-frame-${file.id}`, when);
        t.to(`#files-ext-${file.id}`, { fill: color, duration: 0.3 }, when);
        t.to(`#files-frame-${file.id} rect`, { stroke: color, duration: 0.3 }, when);
        show(photo ? `#files-pic-${file.id}` : `#files-lines-${file.id}`, at(2, 0.5 + i * 1.15));
        if (photo) t.to(`#files-${file.id}-box`, { stroke: BLUE, duration: 0.3 }, when);
      });
      emphasize("files-sea", at(3, 0.25));
      emphasize("files-hill", at(3, 0.5));
      show("#files-code", at(3, 0.9));
      emphasize("files-code", at(3, 1.5));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="files-folder">
        <ellipse cx={960} cy={792} rx={640} ry={18} fill={INK} opacity={0.06} />
        <path
          d="M 300 214 H 1560 Q 1620 214 1620 274 V 740 Q 1620 780 1560 780 H 360 Q 300 780 300 740 Z"
          fill={KRAFT_DEEP}
        />
        <path d="M 300 248 H 520 Q 560 248 590 214 H 360 Q 300 214 300 248 Z" fill="#C9954A" />
        <path
          d="M 260 268 H 500 Q 548 268 584 226 H 340 Q 260 226 260 300 Z"
          fill={KRAFT}
          stroke={KRAFT_EDGE}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <path
          d="M 260 250 H 1600 Q 1660 250 1660 310 V 720 Q 1660 780 1600 780 H 320 Q 260 780 260 720 Z"
          fill={KRAFT}
          stroke={KRAFT_EDGE}
          strokeWidth={5}
        />
        <path
          d="M 300 292 H 1620 V 736 Q 1620 756 1600 756 H 320 Q 300 756 300 736 Z"
          fill="#FFF6E4"
        />
        <path d="M 300 292 H 1620" stroke="#E2C9A0" strokeWidth={8} />
      </g>
      {FILES.map((file, i) => {
        return (
          <g key={file.id} id={`files-doc-${file.id}`} opacity={0}>
            <g transform={`translate(${XS[i]} 300)`}>
              <path d={SHEET} fill="#FFFDF8" />
              <path
                d={FOLD}
                fill="#F3E6C8"
                stroke="#C4B08A"
                strokeWidth={4}
                strokeLinejoin="round"
              />
              <path
                id={`files-${file.id}-box`}
                d={SHEET}
                fill="none"
                stroke="#C4B08A"
                strokeWidth={5}
                strokeLinejoin="round"
              />
              <g id={`files-pic-${file.id}`} opacity={0}>
                {file.kind === "sea" ? <Sea /> : null}
                {file.kind === "hill" ? <Hill /> : null}
              </g>
              <g id={`files-lines-${file.id}`} opacity={0}>
                {file.kind === "memo" ? (
                  <path
                    d="M -72 78 H 72 M -72 118 H 72 M -72 158 H 48 M -72 198 H 72"
                    stroke={GRAY}
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                ) : null}
              </g>
              <Text x={NAME_JOIN} y={352} size={56} anchor="end">
                {file.stem}
              </Text>
              <g id={`files-frame-${file.id}`} opacity={0}>
                <rect
                  x={NAME_JOIN - 4}
                  y={300}
                  width={168}
                  height={68}
                  rx={14}
                  fill="#fff"
                  stroke={GRAY}
                  strokeWidth={5}
                />
              </g>
              <Text id={`files-ext-${file.id}`} x={NAME_JOIN} y={352} size={56} anchor="start">
                {file.ext}
              </Text>
            </g>
          </g>
        );
      })}
      <CodeCallout id="files-code" x={960} y={900} text={CODE} />
    </Stage>
  );
}
