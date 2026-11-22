import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { Callout, GRAY, INK, Line, PINK, Stage, stageMotion, Tag, Text, VIOLET } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const testTotalText = "テストの結果国語算数合計点先に計算する式結果が入る0123456789+=";

/** テストの合計点: 先に足し算をして、結果だけを合計の欄に書く。 */
export function TestTotal({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["test-total"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 成績の用紙が出てくる
      t.fromTo(
        "#paper",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "720 520" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );

      // 2 文め: 2 教科の点数が入る
      show("#score-1", at(1, 0.2));
      show("#score-2", at(1, 1.3));

      // 3 文め: 用紙の外で足し算をして、結果を合計の欄に書く
      show("#call-first", at(2, 0.1));
      show("#fly-1", at(2, 0.3), { duration: 0.2 });
      t.to("#fly-1", { x: 1350, y: 470, duration: 0.6, ease: "power2.inOut" }, at(2, 0.4));
      show("#fly-2", at(2, 0.7), { duration: 0.2 });
      t.to("#fly-2", { x: 1590, y: 470, duration: 0.6, ease: "power2.inOut" }, at(2, 0.8));
      show("#plus", at(2, 1.3));
      show("#equals", at(2, 1.8));
      show("#sum", at(2, 2.0));
      t.to("#sum", { x: 846, y: 716, duration: 0.8, ease: "power2.inOut" }, at(2, 2.8));
      t.to("#equals", { opacity: 0, duration: 0.3 }, at(2, 2.8));
      t.to("#sum-box", { opacity: 0, duration: 0.25 }, at(2, 3.5));
      t.to("#sum-num", { fill: INK, duration: 0.25 }, at(2, 3.5));
      t.to("#sum-unit", { opacity: 1, duration: 0.25 }, at(2, 3.5));

      // 4 文め: 欄に入るのは式ではなく結果
      t.to("#formula", { opacity: 0.35, duration: 0.4 }, at(3, 0.2));
      show("#tag-expr", at(3, 0.4));
      t.to("#hl-total", { opacity: 1, duration: 0.3 }, at(3, 0.9));
      draw("#to-total .line", at(3, 1.0), 0.4);
      show("#call-result", at(3, 1.2));
      emphasize("call-result", at(3, 1.7));
    },
    [at],
  );
  useTimeline(root, build);

  const rows = ["国語", "算数", "合計"];
  return (
    <Stage root={root}>
      <g id="paper">
        <ellipse cx={720} cy={952} rx={420} ry={18} fill={INK} opacity={0.06} />
        <rect
          x={360}
          y={110}
          width={720}
          height={830}
          rx={20}
          fill="#fff"
          stroke="#CBD5E1"
          strokeWidth={4}
        />
        <Text x={720} y={220} size={56}>
          テストの結果
        </Text>
        {rows.map((label, i) => (
          <g key={label}>
            <rect
              x={420}
              y={300 + i * 170}
              width={600}
              height={170}
              fill={i === 2 ? "#EEF2FF" : "#fff"}
              stroke="#94A3B8"
              strokeWidth={3}
            />
            <rect x={720} y={300 + i * 170} width={3} height={170} fill="#94A3B8" />
            <Text x={570} y={404 + i * 170} size={56}>
              {label}
            </Text>
          </g>
        ))}
        <rect x={420} y={640} width={600} height={170} fill="none" stroke={INK} strokeWidth={5} />
        <Text id="score-1" x={870} y={406} size={64} opacity={0}>
          80点
        </Text>
        <Text id="score-2" x={870} y={576} size={64} opacity={0}>
          90点
        </Text>
        <Text id="sum-unit" x={934} y={746} size={64} anchor="start" opacity={0}>
          点
        </Text>
      </g>
      <rect
        id="hl-total"
        x={712}
        y={632}
        width={316}
        height={186}
        rx={10}
        fill="none"
        stroke={PINK}
        strokeWidth={7}
        opacity={0}
      />

      {/* 用紙の外で計算する */}
      <g id="formula">
        <g id="fly-1" transform="translate(838 406)" opacity={0}>
          <Text x={0} y={0} size={84}>
            80
          </Text>
        </g>
        <g id="fly-2" transform="translate(838 576)" opacity={0}>
          <Text x={0} y={0} size={84}>
            90
          </Text>
        </g>
        <Text id="plus" x={1470} y={466} size={84} fill={GRAY} opacity={0}>
          +
        </Text>
      </g>
      <Text id="equals" x={1280} y={650} size={84} fill={GRAY} opacity={0}>
        =
      </Text>
      <g id="sum" transform="translate(1470 620)" opacity={0}>
        <rect id="sum-box" x={-130} y={-70} width={260} height={130} rx={18} fill={VIOLET} />
        <Text id="sum-num" x={0} y={30} size={76} fill="#fff">
          170
        </Text>
      </g>

      <Callout id="call-first" x={1470} y={330} text="先に計算する" />
      <Tag id="tag-expr" x={1470} y={560} text="式" chars={2} color={GRAY} />
      <Line id="to-total" d="M 1034 726 L 1180 726" />
      <Callout id="call-result" x={1330} y={726} text="結果が入る" />
    </Stage>
  );
}
