import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, Callout, GRAY, INK, Line, PINK, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const ROWS = ["先生は「おはよう」と", "言いました。"];
export const quoteMarksText = `作文${ROWS.join("")}かぎかっこ話した言葉記号で囲むコード"`;

const X0 = 300;
const Y0 = 300;
const CELL = 84;

const cell = (row: number, col: number) => ({ x: X0 + col * CELL, y: Y0 + row * CELL });
const GRID = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: 10 }, (_, col) => cell(row, col)),
).flat();
const CHARACTERS = ROWS.flatMap((line, row) =>
  Array.from(line, (ch, col) => ({ ch, ...cell(row, col) })),
);

/** 作文のかぎかっこ: 話した言葉を記号で囲む。コードの文字も記号で囲む。 */
export function QuoteMarks({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["quote-marks"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 作文の用紙が出てくる
      t.fromTo(
        "#paper",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "720 520" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: かぎかっこのマスを目立たせる
      t.to(".quote-cell", { opacity: 1, duration: 0.3, stagger: 0.25 }, at(1, 0.2));
      draw("#to-quotes .line", at(1, 0.7), 0.5);
      show("#call-quote", at(1, 0.9));

      // 3 文め: 囲んだ中の言葉を目立たせる
      t.to(".word-cell", { opacity: 1, duration: 0.3, stagger: 0.08 }, at(2, 0.2));
      draw("#to-word .line", at(2, 0.7), 0.4);
      show("#tag-word", at(2, 0.9));

      // 4 文め: コードでも記号で囲む
      show("#code", at(3, 0.1));
      t.fromTo(
        "#fly",
        { opacity: 0, x: 0, y: 0 },
        { opacity: 1, duration: 0.2, immediateRender: false },
        at(3, 0.5),
      );
      t.to("#fly", { x: 746, y: 216, duration: 0.8, ease: "power2.inOut" }, at(3, 0.7));
      t.to("#code-word", { opacity: 1, duration: 0.2 }, at(3, 1.5));
      t.to("#fly", { opacity: 0, duration: 0.2 }, at(3, 1.5));
      t.to(".code-quote", { opacity: 1, duration: 0.3, stagger: 0.2 }, at(3, 1.8));
      show("#call-code", at(3, 2.3));
      emphasize("call-quote", at(3, 2.6));
      emphasize("call-code", at(3, 2.6));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="paper">
        <ellipse cx={720} cy={952} rx={460} ry={18} fill={INK} opacity={0.06} />
        <rect
          x={240}
          y={110}
          width={960}
          height={830}
          rx={16}
          fill="#FFFDF5"
          stroke="#D6CDB8"
          strokeWidth={4}
        />
        <Text x={300} y={230} size={48} anchor="start" fill={GRAY}>
          作文
        </Text>
        {/* 色を付けるマス (線と文字より下に置く) */}
        {[3, 8].map((col) => (
          <rect
            key={col}
            className="quote-cell"
            {...cell(0, col)}
            width={CELL}
            height={CELL}
            fill="#FBD5EA"
            opacity={0}
          />
        ))}
        {[4, 5, 6, 7].map((col) => (
          <rect
            key={col}
            className="word-cell"
            {...cell(0, col)}
            width={CELL}
            height={CELL}
            fill="#DBEAFE"
            opacity={0}
          />
        ))}
        {/* マス目 */}
        {GRID.map(({ x, y }) => (
          <rect
            key={`cell-${x}-${y}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill="none"
            stroke="#C9BFA6"
            strokeWidth={2}
          />
        ))}
        {CHARACTERS.map(({ ch, x, y }) => (
          <Text key={`text-${x}-${y}`} x={x + CELL / 2} y={y + 62} size={58} weight={500}>
            {ch}
          </Text>
        ))}
      </g>

      <Line id="to-quotes" d="M 594 296 L 594 250 L 1014 250 L 1014 296 M 804 250 L 804 206" />
      <Callout id="call-quote" x={804} y={170} text="かぎかっこ" />
      <Line id="to-word" d="M 804 390 L 804 520" color={BLUE} />
      <Tag id="tag-word" x={804} y={548} text="話した言葉" color={BLUE} />

      {/* コードの書き方 */}
      <g id="code" opacity={0}>
        <rect x={1280} y={470} width={540} height={170} rx={20} fill="#16161A" />
        <Text x={1310} y={450} size={36} anchor="start" fill={GRAY}>
          コード
        </Text>
        <Text id="code-word" x={1550} y={578} size={62} fill="#B5E39C" opacity={0}>
          おはよう
        </Text>
        <text
          className="code-quote"
          x={1404}
          y={578}
          textAnchor="middle"
          fontFamily="'Noto Sans JP', sans-serif"
          fontWeight={700}
          fontSize={62}
          fill={PINK}
          opacity={0}
        >
          "
        </text>
        <text
          className="code-quote"
          x={1696}
          y={578}
          textAnchor="middle"
          fontFamily="'Noto Sans JP', sans-serif"
          fontWeight={700}
          fontSize={62}
          fill={PINK}
          opacity={0}
        >
          "
        </text>
      </g>
      <Text id="fly" x={804} y={362} size={62} fill={BLUE} opacity={0}>
        おはよう
      </Text>
      <Callout id="call-code" x={1550} y={380} text="記号で囲む" />
    </Stage>
  );
}
