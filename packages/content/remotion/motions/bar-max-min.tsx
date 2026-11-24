import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, CodeCallout, GRAY, INK, PINK, Stage, stageMotion, Tag } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const COUNTS = [18, 42, 27];
const MAX = "Math.max(18, 42, 27) → 42";
const MIN = "Math.min(18, 42, 27) → 18";
const BOOK_COLORS = ["#748FA5", "#D6AA6A", "#9AAE83", "#B87468"];
export const barMaxMinText = [...COUNTS, MAX, MIN].join("");

export function BarMaxMin({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["bar-max-min"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#bars-shelves", at(0));
      show(".bars-books, #bars-count-18, #bars-count-42, #bars-count-27", at(1));
      t.to(
        "#bars-frame-42",
        { attr: { fill: "#DBEAFE", stroke: BLUE, "stroke-width": 12 }, duration: 0.3 },
        at(2),
      );
      t.to(
        "#bars-frame-18",
        { attr: { fill: "#FCE7F3", stroke: PINK, "stroke-width": 12 }, duration: 0.3 },
        at(2),
      );
      t.to("#bars-count-42 rect", { attr: { fill: BLUE }, duration: 0.3 }, at(2));
      t.to("#bars-count-18 rect", { attr: { fill: PINK }, duration: 0.3 }, at(2));
      show("#bars-max, #bars-min", at(3));
      emphasize("bars-max", at(3, 0.45));
      emphasize("bars-min", at(3, 0.45));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="bars-shelves">
        {COUNTS.map((count, i) => {
          const x = 540 + i * 420;
          const rows = Math.ceil(count / 7);
          const top = 660 - rows * 78;
          return (
            <g key={count}>
              <rect
                id={`bars-frame-${count}`}
                x={x - 140}
                y={top}
                width={280}
                height={rows * 78}
                rx={10}
                fill="#F3E6D4"
                stroke="#805C40"
                strokeWidth={8}
              />
              <g className="bars-books" opacity={0}>
                {Array.from({ length: count }, (_, book) => {
                  const row = Math.floor(book / 7);
                  const bookX = x - 102 + (book % 7) * 30;
                  const y = 652 - row * 78;
                  return (
                    <rect
                      key={`${bookX}-${y}`}
                      x={bookX}
                      y={y - 45 - (book % 3) * 4}
                      width={23}
                      height={45 + (book % 3) * 4}
                      rx={3}
                      fill={BOOK_COLORS[book % BOOK_COLORS.length]}
                      stroke={INK}
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
              {Array.from({ length: rows - 1 }, (_, row) => {
                const y = 656 - (row + 1) * 78;
                return (
                  <path key={y} d={`M ${x - 134} ${y} h 268`} stroke="#805C40" strokeWidth={7} />
                );
              })}
            </g>
          );
        })}
      </g>
      {COUNTS.map((count, i) => (
        <Tag
          key={count}
          id={`bars-count-${count}`}
          x={540 + i * 420}
          y={738}
          text={String(count)}
          color={GRAY}
        />
      ))}
      <CodeCallout id="bars-max" x={495} y={873} text={MAX} />
      <CodeCallout id="bars-min" x={1425} y={873} text={MIN} />
    </Stage>
  );
}
