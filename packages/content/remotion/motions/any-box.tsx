import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Mark, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const anyBoxText = "なんでもanystring";

function Screwdriver() {
  return (
    <g>
      <path d="M-10-10 H10 V102 L6 124 H-6 L-10 102Z" fill={LINE} />
      <rect x={-29} y={-115} width={58} height={116} rx={19} fill={BLUE} />
      <rect x={-20} y={-12} width={40} height={18} rx={4} fill={INK} />
    </g>
  );
}

function Apple() {
  return (
    <g>
      <path
        d="M0-48 C-49-77-80-31-63 17 C-49 67-21 70 0 58 C24 70 51 60 65 12 C80-38 43-74 0-48Z"
        fill="#DF5044"
      />
      <path d="M-4-48 Q-9-69 4-86 L12-82 Q1-65 4-48Z" fill="#70492F" />
      <path d="M7-67 Q25-97 52-77 Q38-53 7-67Z" fill="#76AA4D" />
    </g>
  );
}

function Sock() {
  return (
    <path
      d="M-37-88 H32 V17 L68 42 Q83 61 62 77 Q43 94 13 76 L-32 46 Q-45 36-43 14Z"
      fill="#E9B643"
    />
  );
}

/** 何でも入る段ボールと、道具の形を確かめる青い箱。 */
export function AnyBox({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["any-box"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#ab-workbench, #ab-front", at(0));
      // 前板の窓越しに中身を残し、最後にも三種類が入ったと分かるようにする。
      for (const [i, id] of ["driver", "apple", "sock"].entries()) {
        show(`#ab-left-${id}`, at(1, i * 1.1));
        t.to(
          `#ab-left-${id}`,
          { y: 365, duration: 0.65, ease: "power2.inOut" },
          at(1, i * 1.1 + 0.45),
        );
      }
      rise("#ab-right-box, #ab-right-front", at(2));
      show("#ab-right-driver", at(2));
      t.to("#ab-right-driver", { y: 350, duration: 0.8, ease: "power2.inOut" }, at(2, 0.5));
      show("#ab-fit", at(2, 1.35));
      show("#ab-right-apple", at(2, 1.6));
      t.to("#ab-right-apple", { x: -130, y: 105, duration: 0.8, ease: "power2.inOut" }, at(2, 2));
      show("#ab-reject", at(2, 2.85));
      show("#ab-any", at(3));
      emphasize("ab-any", at(3, 0.7));
      show("#ab-string", at(3, 0.5));
      emphasize("ab-string", at(3, 1.2));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g transform="translate(-80 -100) scale(1.1)">
        <g id="ab-workbench" opacity={0}>
          {/* 段ボールは二色の面と、中身を見せる白い窓だけ。 */}
          <path d="M280 490 H760 L810 580 H240Z" fill="#BF8955" />
          <path
            d="M280 490 L232 425 H720 L760 490 M240 580 L150 520 L280 490 M760 490 L855 530 L810 580"
            fill="#E0B27D"
          />
          <rect x={240} y={580} width={570} height={230} rx={14} fill="#E0B27D" />
          <rect x={275} y={611} width={500} height={172} rx={10} fill="#fff" />
        </g>
        <g id="ab-right-box" opacity={0}>
          <path d="M1120 488 H1640 L1690 575 H1060Z" fill={BLUE} />
          <rect x={1060} y={575} width={630} height={235} rx={16} fill={BLUE} />
          <path d="M1288 506 H1346 V533 H1326 V551 H1308 V533 H1288Z" fill={INK} />
          <rect x={1237} y={583} width={160} height={215} rx={10} fill="#fff" />
          <rect x={1480} y={681} width={100} height={48} rx={16} fill={INK} />
        </g>
        <g id="ab-left-driver" opacity={0}>
          <g transform="translate(355 300)">
            <Screwdriver />
          </g>
        </g>
        <g id="ab-left-apple" opacity={0}>
          <g transform="translate(520 300)">
            <Apple />
          </g>
        </g>
        <g id="ab-left-sock" opacity={0}>
          <g transform="translate(680 300)">
            <Sock />
          </g>
        </g>
        <g id="ab-right-driver" opacity={0}>
          <g transform="translate(1317 312)">
            <Screwdriver />
          </g>
        </g>
        <g id="ab-right-apple" opacity={0}>
          <g transform="translate(1447 325)">
            <Apple />
          </g>
        </g>
        <g id="ab-right-front" opacity={0}>
          <path d="M 1232 575 H 1402 V 601 H 1232 Z" fill={BLUE} />
        </g>
        <g id="ab-front" opacity={0}>
          <path
            d="M 240 580 H 810 V 624 H 240 Z M 240 624 H 276 V 810 H 240 Z M 774 624 H 810 V 810 H 774 Z M 240 782 H 810 V 810 H 240 Z"
            fill="#E0B27D"
          />
          <rect
            x={390}
            y={551}
            width={270}
            height={65}
            rx={4}
            fill="#fff"
            stroke={LINE}
            strokeWidth={3}
          />
          <Text x={525} y={597} size={44} fill={INK}>
            なんでも
          </Text>
        </g>
        <Mark id="ab-fit" x={1425} y={745} ok />
        <Mark id="ab-reject" x={1455} y={452} ok={false} />
        <CodeCallout id="ab-any" x={520} y={880} text="any" />
        <CodeCallout id="ab-string" x={1375} y={880} text="string" />
      </g>
    </Stage>
  );
}
