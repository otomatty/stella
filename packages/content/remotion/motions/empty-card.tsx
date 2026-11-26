import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const TYPE = "string | undefined";
export const emptyCardText = `Taro${TYPE}`;

/** 単色のクリップと、色帯のある白い名札。 */
function Badge({ blank = false }: { blank?: boolean }) {
  const color = blank ? VIOLET : BLUE;
  return (
    <g>
      <rect width={570} height={257} rx={21} fill="#fff" stroke={LINE} strokeWidth={3} />
      <path d="M21 0 H549 Q570 0 570 21 V64 H0 V21 Q0 0 21 0" fill={color} />
      <rect x={249} y={-82} width={72} height={104} rx={14} fill={LINE} />
      <rect x={263} y={-65} width={44} height={37} rx={7} fill="#fff" />
      {!blank && (
        <g transform="rotate(-4 285 151)">
          <Text x={147} y={185} size={113} fill={VIOLET}>
            T
          </Text>
          <Text x={290} y={185} size={108} fill={VIOLET}>
            aro
          </Text>
        </g>
      )}
    </g>
  );
}

function Paper({ blank = false }: { blank?: boolean }) {
  return (
    <rect x={-167} y={-148} width={334} height={296} rx={18} fill={blank ? LINE : "#F1F1F4"} />
  );
}
export function EmptyCard({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["empty-card"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#name-desk", at(0));
      show("#name-written", at(0, 0.15));
      show("#name-paper", at(1));
      show("#name-copy", at(1, 0.35));
      // 元の名前は残し、最初の T だけを持ち上げて色紙へ写す。
      t.fromTo(
        "#name-flight",
        { x: 486, y: 409, scale: 1, rotation: -4 },
        {
          x: 900,
          y: 260,
          scale: 1.35,
          rotation: 0,
          duration: at(1, 1.2) - at(1, 0.35),
          ease: "power2.out",
        },
        at(1, 0.35),
      );
      t.to(
        "#name-flight",
        { x: 1320, y: 411, scale: 1.55, duration: at(1, 2.05) - at(1, 1.2), ease: "power2.inOut" },
        at(1, 1.2),
      );
      show("#name-blank, #name-empty-paper", at(2, 0.15));
      // 白紙の同じ位置から何も取り出せないことを、空の欄のまま見せる。
      show("#name-empty-focus", at(2, 0.65));
      show("#name-type", at(3, 0.25));
      emphasize("name-type", at(3, 0.95));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <g transform="translate(-77 -55) scale(1.08)">
        <g id="name-desk">
          <g transform="translate(1594 585) rotate(9)">
            <rect x={-18} y={-135} width={36} height={224} rx={12} fill={BLUE} />
            <rect x={-18} y={-145} width={36} height={67} rx={10} fill={VIOLET} />
            <path d="M-15 89 H15 L0 127Z" fill={LINE} />
            <path d="M-5 114 H5 L0 128Z" fill={INK} />
          </g>
        </g>
        <g id="name-written" opacity={0}>
          <g transform="translate(335 230)">
            <Badge />
          </g>
        </g>
        <g id="name-paper" opacity={0}>
          <g transform="translate(1320 360)">
            <Paper />
          </g>
        </g>
        <g id="name-copy" opacity={0}>
          <g id="name-flight">
            <Text x={0} y={0} size={113} fill={VIOLET}>
              T
            </Text>
          </g>
        </g>
        <g id="name-blank" opacity={0}>
          <g transform="translate(335 575)">
            <Badge blank />
          </g>
        </g>
        <g id="name-empty-paper" opacity={0}>
          <g transform="translate(1320 705)">
            <Paper blank />
          </g>
        </g>
        <g id="name-empty-focus" opacity={0}>
          <rect x={432} y={668} width={94} height={119} rx={8} fill="#F1F1F4" />
        </g>
        <CodeCallout id="name-type" x={860} y={892} text={TYPE} />
      </g>
    </Stage>
  );
}
