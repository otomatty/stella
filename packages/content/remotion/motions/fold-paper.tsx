import { useCallback, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const foldPaperText = "重なり拡大1248枚×2*= 2";

const VIOLET = "#8330C7";
const LAYERS = [0, 1, 2, 3, 4, 5, 6, 7];
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SIZES = [
  { w: 800, h: 640 },
  { w: 400, h: 640 },
  { w: 400, h: 320 },
  { w: 200, h: 320 },
];

/** 青い面に白い図形を置き、裏は折り返しの細いふちだけに見せる。 */
function PaperFace({ w, h, folded = false }: { w: number; h: number; folded?: boolean }) {
  return (
    <g>
      <rect width={w} height={h} rx={8} fill={BLUE} />
      <circle cx={w * 0.3} cy={h * 0.3} r={Math.min(w, h) * 0.055} fill="#fff" />
      <rect x={w * 0.65} y={h * 0.6} width={w * 0.1} height={h * 0.08} rx={4} fill="#fff" />
      {folded ? <path d={`M8 0 H${w - 8} L${w - 16} 10 H16Z`} fill="#fff" /> : null}
    </g>
  );
}

/** 紙の重なりは青と紫の交互の帯で表す。 */
function PaperEdges({ w, h, layers }: { w: number; h: number; layers: number }) {
  return (
    <g>
      {LAYERS.slice(0, layers).map((i) => (
        <path
          key={i}
          d={"M " + 0.22 * h + " " + (0.64 * h + i * 5) + " h " + w + " v5 h " + -w + " Z"}
          fill={i % 2 ? VIOLET : BLUE}
        />
      ))}
    </g>
  );
}

export function FoldPaper({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["fold-paper"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const now = useCurrentFrame() / useVideoConfig().fps;
  // 2 文めで最初の半折り。3 文めではその続きの 4 層、8 層を作る。
  const ranges = [
    [at(1, 0.55), at(1, 2.85)],
    [at(2, 0.7), at(2, 1.9)],
    [at(2, 2.35), at(2, 3.65)],
  ];
  const folds = ranges.map((range) => {
    const p = interpolate(now, range, [0, 1], clamp);
    return p * p * (3 - 2 * p);
  });
  const completed = folds.filter((p) => p === 1).length;
  const layers = 2 ** completed;
  const p = folds[completed] ?? 0;
  const { w, h } = SIZES[completed];
  const alongY = completed === 1;
  const angle = p * Math.PI;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const footprintW = alongY ? w : w * (1 - p / 2);
  const footprintH = alongY ? h * (1 - p / 2) : h;
  const x = 650 - (footprintW + 0.22 * footprintH) / 2;
  const y = 555 - 0.32 * footprintH - (layers - 1) * 5;
  const folding = completed < 3 && p > 0;
  const fixedW = folding && !alongY ? w / 2 : w;
  const fixedH = folding && alongY ? h / 2 : h;
  const landing = interpolate(p, [0.5, 1], [0, 1], clamp);
  // 2 回めから少し寄る。面積の減少を残しつつ、最後の厚みも読める大きさにする。
  const zoom = 1.1 + 0.35 * Math.max(0, completed + p - 1);
  const cutX = 650 + (x + 0.22 * fixedH + fixedW - 650) * zoom;
  const cutY = 555 + (y + 0.64 * fixedH + layers * 5 - 555) * zoom;

  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#paper-scene", at(0));
      show("#paper-section", at(1, 0.1));
      show("#paper-history-0, #paper-count-0", at(2));
      show("#paper-history-1, #paper-count-1", at(2, 0.25));
      show("#paper-history-2, #paper-count-2", at(2, 1.95));
      show("#paper-history-3, #paper-count-3", at(2, 3.7));
      show("#paper-double", at(3, 0.2));
      emphasize("paper-double", at(3, 0.7));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="paper-scene" opacity={0}>
        <g transform={`translate(650 555) scale(${zoom}) translate(${x - 650} ${y - 555})`}>
          <PaperEdges w={fixedW} h={fixedH} layers={layers} />
          <g transform="matrix(1 0 .22 .64 0 0)">
            <PaperFace w={fixedW} h={fixedH} folded={completed > 0} />
          </g>
          {folding ? (
            <>
              {/* 折る側も同じ折り目につないだまま、面ごとめくる。 */}
              <g
                transform={
                  alongY
                    ? `matrix(1 0 ${0.22 * cos} ${0.64 * cos - 0.8 * sin} ${(0.22 * h) / 2} ${(0.64 * h) / 2 - landing * layers * 5})`
                    : `matrix(${cos} ${-0.8 * sin} .22 .64 ${w / 2} ${-landing * layers * 5})`
                }
              >
                <PaperFace w={alongY ? w : w / 2} h={alongY ? h / 2 : h} folded={p > 0.5} />
              </g>
            </>
          ) : null}
        </g>
      </g>

      <g id="paper-section" opacity={0}>
        <Text x={1495} y={280} size={34} fill={INK}>
          重なり
        </Text>
        <Text x={1495} y={325} size={25} fill={INK}>
          拡大
        </Text>
        <path
          d={`M ${cutX} ${cutY} L 1160 710 L 1210 710`}
          fill="none"
          stroke={LINE}
          strokeWidth={3}
          strokeDasharray="9 9"
        />
        {LAYERS.slice(0, layers * (folding ? 2 : 1)).map((i) => {
          const moving = i >= layers;
          const layerY = 706 - i * 36 - (moving ? (1 - landing) * 125 : 0);
          return (
            <g
              key={`section-${i}`}
              transform={`translate(1225 ${layerY})`}
              opacity={moving ? landing : 1}
            >
              <rect width={530} height={24} rx={6} fill={i % 2 ? VIOLET : BLUE} />
            </g>
          );
        })}
        <Text x={1495} y={800} size={36} fill={INK} opacity={p > 0 ? 0 : 1}>
          {layers}枚
        </Text>
      </g>

      {/* 各段階の小さな紙を残し、最後にも「1→2→4→8」の具体例が見える。 */}
      {SIZES.map((size, i) => (
        <g key={size.w + size.h} id={`paper-history-${i}`} opacity={0}>
          <g
            transform={`translate(${320 + i * 248 - (size.w + 0.22 * size.h) * 0.075} ${820 + (640 - size.h) * 0.065}) scale(.15)`}
          >
            <PaperEdges w={size.w} h={size.h} layers={2 ** i} />
            <g transform="matrix(1 0 .22 .64 0 0)">
              <PaperFace w={size.w} h={size.h} folded={i > 0} />
            </g>
          </g>
          <Tag id={`paper-count-${i}`} x={320 + i * 248} y={922} text={`${2 ** i}枚`} />
          {i > 0 ? (
            <g>
              <Text x={198 + i * 248} y={855} size={25} fill={VIOLET}>
                ×2
              </Text>
              <path
                d={`M ${175 + i * 248} 874 h 47 l -9 -7 m 9 7 l -9 7`}
                fill="none"
                stroke={LINE}
                strokeWidth={3}
                strokeLinecap="round"
              />
            </g>
          ) : null}
        </g>
      ))}
      <CodeCallout id="paper-double" x={1495} y={900} text="*= 2" />
    </Stage>
  );
}
