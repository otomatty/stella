import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { BLUE, INK, LINE, Mark, PINK, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import {
  Desk,
  DrillDefs,
  drillPartsText,
  Paper,
  Pencil,
  ProtectedSheet,
  PURPLE,
  Tick,
} from "./drill-parts";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const drillRulesText = `${drillPartsText}してよいことしないこと説明AI の自動補完ONOFF`;

function Book() {
  return (
    <g transform="translate(190 480) scale(1.25)">
      <path
        d="M0 0 Q90 -45 180 0 Q270 -45 360 0 L385 250 Q270 212 180 254 Q90 212 -25 250 Z"
        fill={PURPLE}
      />
      <path
        d="M18 0 Q96 -28 180 12 Q264 -28 342 0 L358 219 Q266 194 180 233 Q94 194 2 219 Z"
        fill="#F1F1F4"
      />
      <path d="M180 12 V232" stroke={LINE} strokeWidth={3} />
      {[45, 74, 103, 132, 161].map((y) => (
        <g key={y}>
          <path
            d={`M33 ${y} Q90 ${y - 15} 153 ${y + 7} M207 ${y + 7} Q270 ${y - 15} 327 ${y}`}
            fill="none"
            stroke={LINE}
            strokeWidth={6}
          />
        </g>
      ))}
      <path d="M278 -8 V91 L294 79 L307 91 V-11" fill={PINK} />
    </g>
  );
}

function Robot() {
  return (
    <g transform="translate(800 260) scale(1.5)">
      <rect x={92} y={-24} width={8} height={28} rx={4} fill={BLUE} />
      <circle cx={96} cy={-29} r={12} fill={BLUE} />
      <rect x={12} width={166} height={115} rx={31} fill={LINE} />
      <rect x={35} y={32} width={121} height={49} rx={16} fill={INK} />
      <circle cx={68} cy={56} r={11} fill="#fff" />
      <circle cx={124} cy={56} r={11} fill="#fff" />
      <rect x={72} y={94} width={48} height={5} rx={2.5} fill={BLUE} />
      <rect x={72} y={115} width={48} height={15} fill={BLUE} />
      <rect x={36} y={129} width={122} height={75} rx={18} fill={BLUE} />
      <path
        d="M30 139 Q36 136 42 146 L20 173 L30 187 Q35 195 23 201 L0 177 Q-4 171 2 165Z M152 151 L185 182 Q191 188 199 185 L264 175 Q275 172 261 157 L196 167 L164 139Z"
        fill={BLUE}
      />
      <circle cx={193} cy={177} r={12} fill={LINE} />
      <path
        d="M256 153 L274 162 Q278 165 274 170 L265 185 Q260 191 256 180 L264 168 L252 161 Q247 156 256 153Z"
        fill={BLUE}
      />
      <rect x={57} y={147} width={78} height={40} rx={7} fill={LINE} />
      <Text x={96} y={176} size={26} fill={BLUE}>
        AI
      </Text>
      <rect x={56} y={204} width={16} height={16} fill={LINE} />
      <rect x={122} y={204} width={16} height={16} fill={LINE} />
      <rect x={43} y={215} width={41} height={15} rx={5} fill={BLUE} />
      <rect x={110} y={215} width={41} height={15} rx={5} fill={BLUE} />
    </g>
  );
}

export function DrillRules({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["drill-rules"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show } = stageMotion(t);
      rise("#desk", at(0));
      show("#allowed", at(0, 0.1));
      show("#explain", at(0, 0.4));
      show("#yes", at(0, 1));
      show("#no-area, #robot, #robot-paper, #robot-pencil", at(1, 0.1));
      t.to("#robot-pencil", { x: -12, y: 14, duration: 0.65, ease: "power2.inOut" }, at(1, 0.5));
      show("#no", at(1, 1.2));
      t.to("#robot-pencil", { x: 0, y: 0, duration: 0.4 }, at(1, 1.3));
      show("#switch", at(2, 0.1));
      t.to("#switch-knob", { x: -146, duration: 0.65, ease: "power2.inOut" }, at(2, 0.8));
      t.to("#switch-track", { fill: LINE, duration: 0.65 }, at(2, 0.8));
      t.to("#on", { opacity: 0, duration: 0.2 }, at(2, 1));
      show("#off", at(2, 1.2));
      show("#tests", at(3, 0.1));
      show("#tests-cover, #tests-lock", at(3, 0.3));
      t.fromTo(
        "#tests-lock-shackle",
        { y: -18 },
        { y: 0, duration: 0.35, immediateRender: false },
        at(3, 0.7),
      );
      show("#config", at(4, 0.1));
      show("#config-cover, #config-lock", at(4, 0.4));
      t.fromTo(
        "#config-lock-shackle",
        { y: -18 },
        { y: 0, duration: 0.35, immediateRender: false },
        at(4, 0.8),
      );
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <DrillDefs />
      <Desk />
      <g id="allowed" opacity={0}>
        <Text x={430} y={180} size={43} fill={BLUE}>
          してよいこと
        </Text>
        <Book />
      </g>
      <g id="explain" opacity={0}>
        <path
          d="M264 298 Q264 273 290 273 H579 Q605 273 605 298 V385 Q605 409 579 409 H410 L366 449 L370 409 H290 Q264 409 264 385 Z"
          fill="#F1F1F4"
        />
        <Text x={435} y={359} size={44} fill={BLUE}>
          説明
        </Text>
        <path
          d="M627 305 q43 31 0 63 M648 287 q64 48 0 97"
          fill="none"
          stroke={BLUE}
          strokeWidth={7}
          strokeLinecap="round"
        />
      </g>
      <g id="yes" opacity={0}>
        <g transform="translate(650 800) scale(1.5)">
          <Tick />
        </g>
      </g>
      <g id="no-area" opacity={0}>
        <Text x={1260} y={180} size={43} fill={PURPLE}>
          しないこと
        </Text>
        <path d="M735 240 V940" stroke={LINE} strokeWidth={3} />
      </g>
      <g id="robot-paper" opacity={0}>
        <g transform="translate(1130 340) scale(.7) rotate(5)">
          <Paper blank />
          <path
            d="M35 100 H235 M35 150 H235 M35 200 H235 M35 250 H235 M35 300 H235"
            stroke={LINE}
            strokeWidth={4}
          />
        </g>
      </g>
      <g id="robot" opacity={0}>
        <Robot />
      </g>
      <g id="robot-pencil" opacity={0}>
        <g transform="translate(1200 510) scale(.75) rotate(-48)">
          <Pencil />
        </g>
      </g>
      <g transform="translate(1310 270) scale(1.5)">
        <Mark id="no" x={0} y={0} ok={false} />
      </g>
      <g id="switch" opacity={0}>
        <g transform="translate(1430 335) scale(1.15)">
          <rect x={-36} y={-44} width={340} height={210} rx={22} fill="#F1F1F4" />
          <Text x={134} y={-6} size={28} fill={INK}>
            AI の自動補完
          </Text>
          <rect id="switch-track" x={18} y={21} width={230} height={80} rx={40} fill={BLUE} />
          <g id="on">
            <Text x={75} y={74} size={28} fill="#fff">
              ON
            </Text>
          </g>
          <g id="off" opacity={0}>
            <Text x={190} y={74} size={28} fill={INK}>
              OFF
            </Text>
          </g>
          <g id="switch-knob">
            <circle cx={207} cy={61} r={33} fill="#fff" />
          </g>
        </g>
      </g>
      <g id="tests" opacity={0}>
        <g transform="translate(840 600) scale(1.05)">
          <ProtectedSheet
            width={350}
            height={330}
            kind="tests"
            cover="tests-cover"
            lock="tests-lock"
          />
        </g>
      </g>
      <g id="config" opacity={0}>
        <g transform="translate(1360 600) scale(1.05)">
          <ProtectedSheet
            width={350}
            height={330}
            kind="config"
            cover="config-cover"
            lock="config-lock"
          />
        </g>
      </g>
    </Stage>
  );
}
