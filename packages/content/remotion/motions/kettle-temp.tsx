import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, Mark, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const kettleTempText = '75度90以上熱い60適温それ以外ぬるreturn "";→';
const ROWS = [
  { id: "hot", y: 326, text: "90度以上 → 熱い" },
  { id: "warm", y: 506, text: "60度以上 → 適温" },
  { id: "cool", y: 686, text: "それ以外 → ぬるい" },
];

export function KettleTemp({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["kettle-temp"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#kitchen", at(0));
      t.set("#pot", { x: 400, y: 120, scale: 1.32, svgOrigin: "539 834" }, 0);
      show("#temperature", at(1));
      // 3 文めで案内板を出し、上から二行目まで確かめる。
      t.to("#pot", { x: 0, y: 0, scale: 1, duration: 0.6, ease: "power2.inOut" }, at(2));
      show("#rules", at(2));
      show("#pointer", at(2, 0.5));
      t.fromTo(
        "#pointer-position",
        { y: -65 },
        { y: 0, duration: 0.5, ease: "power2.out" },
        at(2, 0.6),
      );
      t.to("#hot", { opacity: 1, duration: 0.3 }, at(2, 0.7));
      show("#not-hot", at(2, 1.1));
      t.to("#hot", { opacity: 0.4, duration: 0.3 }, at(2, 1.6));
      t.to("#pointer-position", { y: 180, duration: 0.75, ease: "power2.inOut" }, at(2, 1.7));
      t.to("#warm", { opacity: 1, duration: 0.3 }, at(2, 2.3));
      show("#is-warm", at(2, 2.5));
      show("#warm-display", at(2, 2.9));
      draw("#stop-line", at(3), 0.6);
      show("#return-label", at(3, 0.6));
      emphasize("return-label", at(3, 1.3));
      // 確かめる矢印は二行目に止め、湯気だけをゆっくり動かす。
      t.to(
        "#steam",
        { y: -12, opacity: 0.35, duration: 2, repeat: 12, yoyo: true, ease: "sine.inOut" },
        at(0, 0.5),
      );
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="kitchen" opacity={0}>
        <g id="pot">
          {/* 持ち手・注ぎ口・本体を同じ青の面にする。 */}
          <path
            d="M725 374 C935 356 952 698 754 736 L742 678 C869 649 850 423 736 432Z"
            fill={BLUE}
          />
          <path d="M357 482 Q266 460 205 347 L160 373 Q202 563 346 611Z" fill={BLUE} />
          <path
            d="M364 369 Q340 418 328 530 L315 743 Q314 807 390 821 H689 Q772 805 770 743 L756 530 Q746 414 720 369Z"
            fill={BLUE}
          />
          <path d="M363 366 Q382 306 542 300 Q696 305 720 366Z" fill={BLUE} />
          <rect x={496} y={278} width={90} height={42} rx={18} fill={BLUE} />
          <rect x={405} y={469} width={267} height={206} rx={24} fill={INK} />
          <g id="temperature" opacity={0}>
            <Text x={539} y={564} size={68} fill="#fff">
              75度
            </Text>
          </g>
          <g id="warm-display" opacity={0}>
            <Text x={539} y={627} size={44} fill="#fff">
              適温
            </Text>
          </g>
          <circle cx={480} cy={726} r={23} fill="#fff" />
          <circle cx={594} cy={726} r={23} fill="#fff" />
          <rect x={334} y={811} width={419} height={18} rx={9} fill={BLUE} />
          <g
            id="steam"
            opacity={0.6}
            fill="none"
            stroke={LINE}
            strokeWidth={9}
            strokeLinecap="round"
          >
            <path d="M 406 275 C 371 242 437 222 408 185" />
            <path d="M 464 258 C 435 224 492 205 470 161" />
            <path d="M 631 272 C 596 239 661 218 638 182" />
          </g>
        </g>
        <g id="rules" opacity={0}>
          <rect
            x={970}
            y={178}
            width={812}
            height={610}
            rx={24}
            fill="#fff"
            stroke={LINE}
            strokeWidth={3}
          />
          {ROWS.map((r) => (
            <g key={r.id} id={r.id} opacity={0.26}>
              <path d={`M 1030 ${r.y + 50} H 1714`} stroke={LINE} strokeWidth={3} />
              <Text x={1374} y={r.y + 15} size={45} fill={INK}>
                {r.text}
              </Text>
            </g>
          ))}
        </g>
      </g>
      <g id="pointer" opacity={0}>
        <g id="pointer-position">
          <path d="M 899 302 H 954 V 284 L 994 326 L 954 368 V 350 H 899 Z" fill={BLUE} />
        </g>
      </g>
      <Mark id="not-hot" x={1716} y={284} ok={false} />
      <Mark id="is-warm" x={1716} y={464} ok />
      <path
        id="stop-line"
        d="M 1007 579 H 1735"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1}
        stroke="#39866A"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <CodeCallout id="return-label" x={1376} y={873} text={'return "適温";'} />
    </Stage>
  );
}
