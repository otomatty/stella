import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import {
  CodeCallout,
  BLUE,
  INK,
  LINE,
  Head,
  Line,
  Mark,
  Stage,
  stageMotion,
  Text,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const gameCancelText = "試合開始中止晴れている9人そろった晴れ && 9人0123456789人";

const PLAYERS = Array.from({ length: 9 }, (_, i) => ({
  id: `player-${i}`,
  x: 256 + i * 116,
  skin: ["#F1BC91", "#D69A70", "#E8AD82"][i % 3],
  cap: BLUE,
}));

/** ベンチに腰掛けた選手。手は描かず、袖を体の後ろに収める。 */
function Player({ skin, cap }: { skin: string; cap: string }) {
  return (
    <g>
      <path
        d="M-28 105 H28 L38 139 L30 171 H10 L14 140 L4 125 H-4 L-14 140 L-10 171 H-30 L-38 139Z"
        fill={LINE}
      />
      <path d="M-29 164 H-10 V187 H-29Z M10 164 H29 V187 H10Z" fill={cap} />
      <path d="M-30 183 H-9 V197 H-44 Q-46 185-30 183 M9 183 H30 Q46 185 44 197 H9Z" fill={INK} />
      <path
        d="M-21 31 Q-35 33-43 49 L-34 84 L-26 78 L-28 113 H28 L26 78 L34 84 L43 49 Q35 33 21 31Z"
        fill={cap}
      />
      <path d="M-15 32 L0 47 L15 32 V107 H-15Z" fill="#fff" />
      <rect x={-9} y={19} width={18} height={20} rx={5} fill={skin} />
      <circle cx={-27} cy={3} r={7} fill={skin} />
      <circle cx={27} cy={3} r={7} fill={skin} />
      <ellipse cy={-2} rx={27} ry={32} fill={skin} />
      <path d="M-27-1 Q-32-39 0-40 Q33-38 27 0 L19-13 Q0-7-19-14 L-22 3Z" fill={INK} />
      <path d="M-30-17 Q-29-47 0-48 Q30-46 30-17 Q45-8 22-7 L-31-10Z" fill={cap} />
      <circle cx={-10} cy={1} r={3} fill={INK} />
      <circle cx={10} cy={1} r={3} fill={INK} />
      <path d="M-8 13 Q0 24 8 13Z" fill="#fff" />
    </g>
  );
}

export function GameCancel({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["game-cancel"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const time = useCurrentFrame() / useVideoConfig().fps;
  const seated = PLAYERS.filter((_, i) => time >= at(1, 0.15 + i * 0.35) + 0.4).length;
  const players = time >= at(2, 2.35) + 0.4 ? 8 : seated;
  const started = seated === 9 && time < at(2, 0.7);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      // 1 文めは、白地に空席のベンチ。
      rise("#ground", at(0));
      // 2 文めは太陽の下で一人ずつ座り、九人目で札が立つ。
      show("#sun", at(1));
      PLAYERS.forEach((p, i) => {
        show(`#${p.id}`, at(1, 0.15 + i * 0.35));
        t.fromTo(
          `#${p.id}-step`,
          { x: -20, y: -28 },
          { x: 0, y: 0, duration: 0.4, ease: "power2.out", immediateRender: false },
          at(1, 0.15 + i * 0.35),
        );
      });
      show("#count", at(1, 0.2));
      show("#sign", at(1, 2.95) + 0.4);
      // 3 文めは雨、続けて晴れでも人数不足になる。
      show("#cloud", at(2));
      t.to("#sun", { opacity: 0, duration: 0.3 }, at(2, 0.25));
      show("#rain", at(2, 0.5));
      show("#rain-reminder, #rain-cross", at(2, 1.3));
      t.fromTo(
        ".raindrop",
        { y: -16 },
        { y: 28, duration: 0.3, repeat: 4, ease: "none", immediateRender: false },
        at(2, 0.5),
      );
      t.to("#rain, #cloud", { opacity: 0, duration: 0.35 }, at(2, 2.1));
      t.to("#player-8-step", { x: 70, y: -30, opacity: 0, duration: 0.4 }, at(2, 2.35));
      show("#sun", at(2, 2.8));
      show("#short-team-reminder, #short-team-cross", at(2, 3));
      // 4 文めは二つの確認を一本の線にまとめ、判定の札へつなぐ。
      show("#checks", at(3));
      show("#sun-check, #team-check", at(3, 0.25));
      draw("#sun-flow .line", at(3, 0.5), 0.6);
      draw("#team-flow .line", at(3, 0.5), 0.6);
      show("#combined", at(3, 1.1));
      draw("#result-flow .line", at(3, 1.4), 0.6);
      show("#result-head", at(3, 1.9));
      show("#formula", at(3, 2.3));
      emphasize("formula", at(3, 3.0));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="ground" opacity={0}>
        {/* ベンチは単色の座板。背景の面は置かない。 */}
        <rect x={184} y={654} width={1096} height={28} rx={12} fill={LINE} />
        {[236, 730, 1230].map((x) => (
          <rect key={x} x={x} y={682} width={18} height={94} rx={6} fill={LINE} />
        ))}
        <path d="M160 831 H1770" stroke={LINE} strokeWidth={3} strokeLinecap="round" />
        <path
          d="M1705 755 L1738 667 Q1745 650 1755 660 Q1762 666 1755 681 L1720 760Z"
          fill="#D4A064"
        />
        <path d="M1706 754 L1718 760 L1708 790 L1697 785Z" fill={INK} />
        <circle cx={1672} cy={796} r={22} fill="#fff" stroke={LINE} strokeWidth={3} />
        <path
          d="M1659 780 Q1680 792 1659 812 M1684 779 Q1665 794 1684 812"
          fill="none"
          stroke="#C45743"
          strokeWidth={2}
        />
      </g>
      <g id="sun" opacity={0}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path
            key={angle}
            d="M330 92 V70"
            transform={`rotate(${angle} 330 170)`}
            stroke="#E9AD36"
            strokeWidth={10}
            strokeLinecap="round"
          />
        ))}
        <circle cx={330} cy={170} r={62} fill="#F8CC4F" />
      </g>
      <g id="cloud" opacity={0}>
        <path
          d="M188 207 Q151 170 192 140 Q192 94 251 101 Q290 54 345 97 Q407 76 432 128 Q484 121 500 166 Q508 210 462 218 H207Z"
          fill="#7E8D9C"
        />
      </g>
      <g id="rain" opacity={0}>
        {[206, 259, 312, 365, 418, 471].map((x) => (
          <g key={x} className="raindrop">
            <path
              d={`M${x} 246 l-12 26 M${x + 18} 287 l-12 26`}
              stroke="#4B9DC0"
              strokeWidth={7}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
      {PLAYERS.map((p) => (
        <g key={p.id} id={p.id} opacity={0}>
          <g transform={`translate(${p.x} 527) scale(1.2)`}>
            <g id={`${p.id}-step`}>
              <Player skin={p.skin} cap={p.cap} />
            </g>
          </g>
        </g>
      ))}
      <g id="count" opacity={0}>
        <Text x={730} y={805} size={40} fill={INK}>
          {players}人
        </Text>
      </g>
      <g id="sign" opacity={0}>
        <rect x={1497} y={581} width={28} height={173} rx={8} fill={LINE} />
        <rect x={1462} y={749} width={100} height={12} rx={6} fill={LINE} />
        <rect
          x={1348}
          y={488}
          width={328}
          height={115}
          rx={18}
          fill={started ? "#16A34A" : "#E5342B"}
        />
        <Text x={1512} y={562} size={52} fill="#fff">
          {started ? "試合開始" : "試合中止"}
        </Text>
      </g>
      {/* 中止になった二つの場合を、晴れに戻ったあとも残す。 */}
      <g transform="translate(1375 365) scale(1.5) translate(-1415 -380)">
        <g id="rain-reminder" opacity={0}>
          <rect
            x={1325}
            y={335}
            width={180}
            height={90}
            rx={14}
            fill="#fff"
            stroke={LINE}
            strokeWidth={3}
          />
          <path
            d="M1349 380 Q1337 368 1352 357 Q1355 342 1374 349 Q1390 334 1405 350 Q1427 348 1428 368 Q1435 381 1418 384 H1360Z"
            fill="#6C8195"
          />
          <path
            d="M1360 394 l-5 12 M1382 394 l-5 12 M1404 394 l-5 12"
            stroke="#4B9DC0"
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
        <Mark id="rain-cross" x={1465} y={380} ok={false} />
      </g>
      <g transform="translate(1685 365) scale(1.5) translate(-1625 -380)">
        <g id="short-team-reminder" opacity={0}>
          <rect
            x={1530}
            y={335}
            width={190}
            height={90}
            rx={14}
            fill="#fff"
            stroke={LINE}
            strokeWidth={3}
          />
          <g transform="translate(1560 360) scale(0.26)">
            <Player skin="#F1BC91" cap={BLUE} />
          </g>
          <Text x={1614} y={394} size={32} fill={INK}>
            8人
          </Text>
        </g>
        <Mark id="short-team-cross" x={1682} y={380} ok={false} />
      </g>
      <g id="checks" opacity={0}>
        <Text x={792} y={115} size={36}>
          晴れている
        </Text>
        <Text x={1108} y={115} size={36}>
          9人そろった
        </Text>
      </g>
      <Mark id="sun-check" x={792} y={176} ok />
      <Mark id="team-check" x={1108} y={176} ok={false} />
      <Line id="sun-flow" d="M792 214 Q792 260 944 260" />
      <Line id="team-flow" d="M1108 214 Q1108 260 976 260" />
      <Mark id="combined" x={960} y={260} ok={false} />
      <Line id="result-flow" d="M995 260 H1160 Q1205 260 1205 375 Q1205 455 1512 455 V473" />
      <Head id="result-head" x={1512} y={482} angle={90} />
      <CodeCallout id="formula" x={960} y={910} text="晴れ && 9人" />
    </Stage>
  );
}
