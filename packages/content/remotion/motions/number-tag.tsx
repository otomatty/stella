import { useCallback, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { beatClock } from "../lib/beat-clock";
import { CodeCallout, BLUE, INK, LINE, Stage, stageMotion, Tag, Text } from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

export const numberTagText = '受付整理券次は名札数文字78"String(7)';

/** ペン先を原点にして、書く位置に合わせて動かす。 */
function Pen() {
  return (
    <g transform="rotate(34)">
      <path d="M0 0 L-11-36 H11Z" fill={LINE} />
      <path d="M0 0 L-4-13 H4Z" fill={INK} />
      <rect x={-13} y={-196} width={26} height={162} rx={8} fill={BLUE} />
      <rect x={-10} y={-216} width={20} height={26} rx={5} fill={LINE} />
    </g>
  );
}

export function NumberTag({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["number-tag"].seconds), [beats]);
  const time = useCurrentFrame() / useVideoConfig().fps;
  // 発券後の表示はフレームから決め、途中へシークしても 8 に戻る。
  const next = time >= at(1, 1.25) ? 8 : 7;
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, emphasize } = stageMotion(t);
      rise("#reception", at(0));
      show("#number-display", at(1), { duration: at(1, 0.3) - at(1) });
      t.to("#ticket-button", { y: 5, duration: at(1, 0.3) - at(1, 0.15) }, at(1, 0.15));
      t.to("#ticket-button", { y: 0, duration: at(1, 0.5) - at(1, 0.3) }, at(1, 0.3));
      show("#ticket-paper", at(1, 0.35), { duration: at(1, 0.6) - at(1, 0.35) });
      t.fromTo(
        "#ticket-feed",
        { y: -240 },
        { y: 0, immediateRender: false, duration: at(1, 1.2) - at(1, 0.35), ease: "power1.inOut" },
        at(1, 0.35),
      );

      // ペン先が上辺、斜線の順に通る。文字自体は Text をマスクで出す。
      t.to(
        "#number-pen",
        { x: -360, y: -215, duration: at(2, 0.5) - at(2), ease: "power2.inOut" },
        at(2),
      );
      t.to("#number-pen", { x: -267, duration: at(2, 0.9) - at(2, 0.5), ease: "none" }, at(2, 0.5));
      t.to(
        "#ink-top",
        { attr: { width: 125 }, duration: at(2, 0.9) - at(2, 0.5), ease: "none" },
        at(2, 0.5),
      );
      t.to(
        "#number-pen",
        { x: -330, y: -80, duration: at(2, 1.75) - at(2, 0.9), ease: "none" },
        at(2, 0.9),
      );
      t.to(
        "#ink-down",
        { attr: { height: 160 }, duration: at(2, 1.75) - at(2, 0.9), ease: "none" },
        at(2, 0.9),
      );
      t.to(
        "#number-pen",
        { x: 0, y: 0, duration: at(2, 2.35) - at(2, 1.8), ease: "power2.inOut" },
        at(2, 1.8),
      );
      show("#number-quotes", at(2, 2.1), { duration: at(2, 2.45) - at(2, 2.1) });
      show("#number-kind-number, #number-kind-string", at(3));
      show("#number-string", at(3, 0.6));
      emphasize("number-string", at(3, 1.1));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <defs>
        <clipPath id="ticket-outlet">
          <rect x={400} y={572} width={245} height={258} />
        </clipPath>
        <mask id="written-seven">
          <rect id="ink-top" x={1285} y={500} width={0} height={57} fill="#fff" />
          <rect id="ink-down" x={1285} y={556} width={145} height={0} fill="#fff" />
        </mask>
      </defs>
      <g id="reception">
        <rect x={140} y={837} width={1640} height={28} rx={14} fill={LINE} />
        <rect x={272} y={180} width={490} height={600} rx={40} fill={BLUE} />
        <rect x={348} y={240} width={333} height={83} rx={14} fill="#fff" />
        <Text x={515} y={297} size={48} fill={BLUE}>
          受付
        </Text>
        <rect x={347} y={349} width={334} height={99} rx={15} fill={INK} />
        <g id="number-display" opacity={0}>
          <Text x={444} y={413} size={34} fill="#fff">
            次は
          </Text>
          <Text x={581} y={421} size={62} fill="#fff">
            {next}
          </Text>
        </g>
        <g id="ticket-button">
          <ellipse cx={517} cy={486} rx={44} ry={24} fill="#fff" />
        </g>
        <rect x={380} y={548} width={277} height={47} rx={13} fill={INK} />
        <g clipPath="url(#ticket-outlet)">
          <g id="ticket-feed">
            <g id="ticket-paper" opacity={0}>
              <rect
                x={416}
                y={574}
                width={210}
                height={237}
                rx={8}
                fill="#fff"
                stroke={LINE}
                strokeWidth={3}
              />
              <path d="M428 595 H614" stroke={LINE} strokeWidth={2} strokeDasharray="8 7" />
              <Text x={521} y={641} size={30} fill={INK}>
                整理券
              </Text>
              <Text x={521} y={764} size={132} fill={INK}>
                7
              </Text>
            </g>
          </g>
        </g>
        <path
          d="M1288 379 C1180 272 1131 145 1213 137 C1331 126 1435 226 1328 379"
          fill="none"
          stroke="#8330C7"
          strokeWidth={23}
        />
        <rect
          x={1080}
          y={389}
          width={450}
          height={374}
          rx={22}
          fill="#fff"
          stroke={LINE}
          strokeWidth={3}
        />
        <rect x={1100} y={411} width={410} height={71} rx={12} fill="#8330C7" />
        <Text x={1305} y={462} size={35} fill="#fff">
          名札
        </Text>
        <rect x={1277} y={353} width={58} height={71} rx={10} fill={LINE} />
        <g mask="url(#written-seven)">
          <Text x={1350} y={681} size={210} fill={BLUE}>
            7
          </Text>
        </g>
        <g id="number-quotes" opacity={0}>
          <Text x={1240} y={612} size={78} fill={BLUE}>
            &quot;
          </Text>
          <Text x={1450} y={612} size={78} fill={BLUE}>
            &quot;
          </Text>
        </g>
        <g id="number-pen">
          <g transform="translate(1660 760)">
            <Pen />
          </g>
        </g>
        <g id="number-types">
          <Tag id="number-kind-number" x={521} y={920} text="数" color={BLUE} />
          <Tag id="number-kind-string" x={1305} y={920} text="文字" />
        </g>
      </g>
      <CodeCallout id="number-string" x={930} y={310} text="String(7)" />
    </Stage>
  );
}
