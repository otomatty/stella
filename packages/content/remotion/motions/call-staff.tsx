import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  BLUE,
  Callout,
  GRAY,
  Head,
  INK,
  Line,
  Stage,
  stageMotion,
  Tag,
  Text,
  VIOLET,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const callStaffText = "計算の担当山田さん待っている名前で呼ぶ動く結果が返る1200+5007";

/** 人の形 (頭と肩)。色を変えられるよう、塗りは親の fill を使う。 */
function Person({ id, x, y, fill }: { id: string; x: number; y: number; fill: string }) {
  return (
    <g id={id} transform={`translate(${x} ${y})`} fill={fill}>
      <circle cy={-150} r={62} />
      <path d="M -120 60 C -120 -40 -70 -70 0 -70 C 70 -70 120 -40 120 60 Z" />
    </g>
  );
}

/** 担当の人を名前で呼ぶ: 呼ばれるまで動かず、呼ぶと動いて結果を返す。 */
export function CallStaff({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["call-staff"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { show, draw, emphasize } = stageMotion(t);

      // 1 文め: 窓口と担当が出てくる
      t.fromTo(
        "#counter",
        { opacity: 0, y: 26, scale: 0.94, svgOrigin: "1360 560" },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" },
        at(0, -0.5),
      );
      show("#me", at(0, 0.2));

      // 2 文め: 担当は待っている
      show("#wait", at(1, 0.2));
      t.fromTo(
        "#dots circle",
        { opacity: 0.25 },
        { opacity: 1, duration: 0.4, ease: "sine.inOut", stagger: 0.25, repeat: 3, yoyo: true },
        at(1, 0.5),
      );

      // 3 文め: 名前を呼び、伝票を渡す
      show("#bubble", at(2, 0.1));
      show("#call-name", at(2, 0.3));
      t.to("#wait, #dots", { opacity: 0, duration: 0.3 }, at(2, 0.8));
      t.to("#staff", { fill: BLUE, duration: 0.4 }, at(2, 0.8));
      show("#slip", at(2, 1.5));
      t.to("#slip", { x: 1190, y: 640, duration: 0.9, ease: "power2.inOut" }, at(2, 2.0));
      t.to("#bubble", { opacity: 0, duration: 0.3 }, at(2, 2.9));

      // 4 文め: 担当が計算して、結果を返す
      show("#call-work", at(3, 0.1));
      t.to("#lamp", { opacity: 1, duration: 0.3, repeat: 3, yoyo: true }, at(3, 0.3));
      t.to("#slip", { opacity: 0, duration: 0.3 }, at(3, 1.4));
      show("#result", at(3, 1.5));
      t.to("#result", { x: 640, y: 640, duration: 0.9, ease: "power2.inOut" }, at(3, 2.0));
      show("#call-back", at(3, 2.8));

      // 5 文め: 呼ぶ → 動く → 返る を線でつなぐ
      emphasize("call-name", at(4, 0));
      draw("#flow-1 .line", at(4, 0.2), 0.7);
      t.to("#head-1", { opacity: 1, duration: 0.15 }, at(4, 0.8));
      emphasize("call-work", at(4, 0.8));
      draw("#flow-2 .line", at(4, 1.0), 0.7);
      t.to("#head-2", { opacity: 1, duration: 0.15 }, at(4, 1.6));
      emphasize("call-back", at(4, 1.6));
    },
    [at],
  );
  useTimeline(root, build);

  return (
    <Stage root={root}>
      <g id="counter">
        <ellipse cx={1360} cy={952} rx={400} ry={18} fill={INK} opacity={0.06} />
        {/* 担当の札 */}
        <rect x={1180} y={130} width={360} height={84} rx={14} fill="#E0E7FF" />
        <Text x={1360} y={188} size={44}>
          計算の担当
        </Text>
        <Person id="staff" x={1360} y={560} fill="#94A3B8" />
        {/* 窓口の台 */}
        <rect x={1040} y={610} width={640} height={60} rx={12} fill="#C08B5C" />
        <rect x={1070} y={670} width={580} height={270} rx={8} fill="#A9743B" />
        <rect
          x={1420}
          y={540}
          width={160}
          height={70}
          rx={8}
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={1500} y={592} size={40}>
          山田
        </Text>
        <circle id="lamp" cx={1630} cy={585} r={14} fill="#34D399" opacity={0.2} />
      </g>
      <g id="dots" fill="#94A3B8">
        <circle cx={1200} cy={330} r={10} />
        <circle cx={1170} cy={300} r={8} />
        <circle cx={1146} cy={276} r={6} />
      </g>
      <Tag id="wait" x={1040} y={230} text="待っている" color={GRAY} />

      <Person id="me" x={380} y={700} fill={VIOLET} />
      <g id="bubble" opacity={0}>
        <path
          d="M 470 300 h 360 a 24 24 0 0 1 24 24 v 100 a 24 24 0 0 1 -24 24 h -250 l -60 56 l 10 -56 h -60 a 24 24 0 0 1 -24 -24 v -100 a 24 24 0 0 1 24 -24 z"
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={650} y={394} size={56}>
          山田さん
        </Text>
      </g>

      {/* 伝票 (渡す値) と、返ってくる結果 */}
      <g id="slip" transform="translate(640 640)" opacity={0}>
        <rect
          x={-150}
          y={-46}
          width={300}
          height={92}
          rx={12}
          fill="#fff"
          stroke={INK}
          strokeWidth={4}
        />
        <Text x={0} y={18} size={48}>
          1200 + 500
        </Text>
      </g>
      <g id="result" transform="translate(1190 640)" opacity={0}>
        <rect x={-100} y={-46} width={200} height={92} rx={12} fill={VIOLET} />
        <Text x={0} y={18} size={52} fill="#fff">
          1700
        </Text>
      </g>

      <Line id="flow-1" d="M 834 196 Q 1040 60 1262 56" />
      <Head id="head-1" x={1284} y={56} angle={0} />
      <Line id="flow-2" d="M 1050 800 Q 900 900 700 858" />
      <Head id="head-2" x={674} y={852} angle={192} />
      <Callout id="call-name" x={650} y={210} text="名前で呼ぶ" />
      <Callout id="call-work" x={1360} y={56} text="動く" />
      <Callout id="call-back" x={520} y={850} text="結果が返る" />
    </Stage>
  );
}
