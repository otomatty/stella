import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

export const memberCardText = "こもれび商店会員証お名前はいいいえtruefalseboolean";

/** 同じ店の二つの会計。カードの有無と二択の読み取り機を並べて残す。 */
function Reader({ x, member }: { x: number; member: boolean }) {
  const side = member ? "yes" : "no";
  return (
    <g transform={`translate(${x} 300)`}>
      <rect x={-230} width={460} height={390} rx={30} fill={member ? BLUE : VIOLET} />
      <rect x={-195} y={44} width={390} height={156} rx={20} fill={INK} />
      {[-96, 96].map((cx, i) => (
        <g key={cx}>
          <circle id={`member-${side}-lamp-${i}`} cx={cx} cy={99} r={29} fill="#5C5C66" />
          <g className="member-answers" opacity={0}>
            <Text x={cx} y={165} size={32} fill="#fff">
              {i === 0 ? "はい" : "いいえ"}
            </Text>
          </g>
        </g>
      ))}
      <g id={`member-${side}-result`} opacity={0}>
        <Text x={0} y={249} size={42} fill="#fff">
          {member ? "true" : "false"}
        </Text>
      </g>
      <rect x={-174} y={280} width={348} height={82} rx={18} fill={LINE} />
      <path
        d="M-24 301 Q0 280 24 301 M-17 312 Q0 297 17 312 M-8 322 Q0 315 8 322"
        fill="none"
        stroke={INK}
        strokeWidth={5}
        strokeLinecap="round"
      />

      <g className="member-two-lamps" opacity={0}>
        <path d="M-125 186H-67 M67 186H125" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
  );
}

export function MemberCard({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["member-card"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#member-scene", at(0));
      show(".member-answers", at(1, 0.3));
      show("#membership-card", at(1, 1));
      show(".member-two-lamps", at(1, 1.8));
      t.to(".member-two-lamps", { opacity: 0, duration: at(1, 3.3) - at(1, 3) }, at(1, 3));
      // 会員証をかざす。カードそのものを読み取り面へ動かす。
      t.to(
        "#membership-card",
        { y: -140, duration: at(2, 1.2) - at(2, 0.1), ease: "power2.inOut" },
        at(2, 0.1),
      );
      t.to(
        "#member-yes-lamp-0",
        { fill: "#4ADE80", duration: at(2, 1.5) - at(2, 1.2) },
        at(2, 1.2),
      );
      show("#member-yes-result", at(2, 1.3));
      // カードがない会計では空のトレーを進める。
      t.to(
        "#member-empty-tray",
        { y: -140, duration: at(2, 3.5) - at(2, 2.5), ease: "power2.inOut" },
        at(2, 2.5),
      );
      t.to("#member-no-lamp-1", { fill: "#C7C7CF", duration: at(2, 3.8) - at(2, 3.5) }, at(2, 3.5));
      show("#member-no-result", at(2, 3.6));
      show(".member-two-lamps", at(3, 0.2));
      show("#member-boolean", at(3, 0.7));
      emphasize("member-boolean", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g id="member-scene" opacity={0}>
        <rect x={240} y={108} width={1440} height={90} rx={18} fill={VIOLET} />
        <Text x={960} y={166} size={42} fill="#fff">
          こもれび商店
        </Text>

        <rect x={160} y={698} width={1600} height={24} rx={10} fill={LINE} />

        <rect x={190} y={420} width={190} height={120} rx={14} fill={BLUE} />
        <rect x={210} y={438} width={150} height={76} rx={7} fill={INK} />
        <path d="M234 463 H336 M234 489 H296" stroke={LINE} strokeWidth={7} strokeLinecap="round" />
        <rect x={268} y={540} width={34} height={56} rx={5} fill={LINE} />
        <rect x={174} y={586} width={220} height={112} rx={14} fill={BLUE} />
        {[220, 284, 348].map((x) => (
          <rect key={x} x={x - 18} y={608} width={36} height={30} rx={6} fill="#fff" />
        ))}
        <path d="M245 674 H325" stroke={LINE} strokeWidth={7} strokeLinecap="round" />
        <path d="M1590 514 H1714 L1726 698 H1580Z" fill={LINE} />
        <path d="M1619 523 V479 Q1652 438 1685 479 V523" fill="none" stroke={INK} strokeWidth={8} />
        <circle cx={1615} cy={510} r={29} fill="#CB5944" />
        <path d="M1615 482 q5-24 26-15 q-4 20-26 15" fill="#588A4D" />
        <rect x={1665} y={464} width={32} height={65} rx={10} fill="#8BB36B" />
        <rect x={1672} y={451} width={18} height={18} rx={3} fill={LINE} />
        <Reader x={690} member />
        <Reader x={1250} member={false} />
        <g id="member-empty-tray">
          <rect x={1084} y={718} width={332} height={114} rx={26} fill={LINE} />
          <rect x={1100} y={732} width={300} height={84} rx={19} fill="#F1F1F4" />
        </g>
        <g id="membership-card" opacity={0}>
          <rect x={518} y={704} width={344} height={113} rx={16} fill={VIOLET} />
          <Text x={690} y={753} size={32} fill="#fff">
            会員証
          </Text>
          <rect x={800} y={729} width={34} height={29} rx={5} fill={LINE} />
          <rect x={539} y={770} width={301} height={29} rx={4} fill="#fff" />
          <Text x={580} y={791} size={17} fill={INK}>
            お名前
          </Text>
          <path d="M628 788 H816" stroke={LINE} strokeWidth={2} />
        </g>
      </g>
      <CodeCallout id="member-boolean" x={990} y={908} text="boolean" />
    </Stage>
  );
}
