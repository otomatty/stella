import { useCallback, useMemo, useRef } from "react";
import { beatClock } from "../lib/beat-clock";
import {
  CodeCallout,
  BLUE,
  GREEN,
  Head,
  INK,
  LINE,
  Line,
  PINK,
  Stage,
  stageMotion,
  Text,
} from "../lib/kit";
import { useTimeline } from "../lib/use-timeline";
import type { MotionProps } from "./index";
import { MOTIONS } from "./manifest";

const VIOLET = "#8330C7";

const TOTAL = "1,200";
const TYPE = ": number";
export const receiptPrinterText = `まちのマルシェ牛乳パンりんご合計ありがとう${TOTAL}${TYPE}0123456789`;

export function ReceiptPrinter({ beats }: MotionProps) {
  const at = useMemo(() => beatClock(beats, MOTIONS["receipt-printer"].seconds), [beats]);
  const root = useRef<SVGSVGElement>(null);
  const build = useCallback(
    (t: gsap.core.Timeline) => {
      const { rise, show, draw, emphasize } = stageMotion(t);
      rise("#printer-shop", at(0));
      // 排出口の下を隠し、紙を上へ送り出す。
      t.to("#printer-pay", { y: 6, duration: at(1, 0.2) - at(1) }, at(1));
      t.to("#printer-pay", { y: 0, duration: at(1, 0.4) - at(1, 0.2) }, at(1, 0.2));
      show("#printer-paid", at(1, 0.3));
      show("#printer-paper", at(1, 0.5));
      t.fromTo(
        "#printer-feed",
        { y: 410 },
        { y: 0, duration: at(1, 2.3) - at(1, 0.5), ease: "power1.inOut" },
        at(1, 0.5),
      );
      show("#printer-loupe", at(2));
      t.fromTo(
        "#printer-loupe-move",
        { x: 230, y: -100 },
        { x: 0, y: 0, duration: at(2, 1.1) - at(2), ease: "power2.inOut" },
        at(2),
      );
      show("#printer-magnified", at(2, 1.1));
      draw("#printer-return .line", at(3), at(3, 0.7) - at(3));
      show("#printer-tip, #printer-type", at(3, 0.7));
      emphasize("printer-type", at(3, 1.4));
    },
    [at],
  );
  useTimeline(root, build);
  return (
    <Stage root={root}>
      <defs>
        <clipPath id="printer-slot-clip">
          <rect x={770} y={80} width={390} height={455} />
        </clipPath>
      </defs>
      <g id="printer-shop">
        <rect x={180} y={854} width={1560} height={28} rx={12} fill={LINE} />
        {/* 商品は自然な色、かごは青の単純な形。 */}
        <g>
          <path
            d="M1270 645 Q1270 499 1447 499 Q1625 499 1638 646"
            fill="none"
            stroke={BLUE}
            strokeWidth={16}
          />
          <path
            d="M1300 655 V550 L1345 520 L1390 550 V655Z"
            fill="#fff"
            stroke={LINE}
            strokeWidth={3}
          />
          <path d="M1300 550 H1390 V574 H1300Z" fill={BLUE} />
          <rect x={1315} y={590} width={58} height={40} rx={6} fill={BLUE} />
          <path d="M1430 681 Q1390 530 1443 486 Q1480 472 1493 520 L1526 680Z" fill="#D79B51" />
          {[535, 570, 605].map((y) => (
            <path
              key={y}
              d={`M1432 ${y} l40 -18`}
              stroke="#F8D9A0"
              strokeWidth={14}
              strokeLinecap="round"
            />
          ))}
          <path
            d="M1542 650 C1480 583 1538 558 1561 584 C1599 549 1651 600 1600 659Z"
            fill="#C95841"
          />
          <path d="M1560 587 q-5 -32 13 -44" fill="none" stroke="#775335" strokeWidth={7} />
          <path d="M1568 563 q22 -34 48 -10 q-24 24 -48 10" fill="#69904A" />
          <path
            d="M1258 644 H1650 Q1666 644 1662 662 L1623 827 Q1620 840 1606 840 H1304 Q1290 840 1287 827 L1246 662 Q1242 644 1258 644Z"
            fill={BLUE}
          />
          {[1310, 1375, 1440, 1505, 1570].map((x) => (
            <rect key={x} x={x} y={687} width={22} height={108} rx={11} fill="#fff" />
          ))}
        </g>
        {/* レジは青の本体、白い表示部、単色のキー。 */}
        <rect x={500} y={460} width={94} height={125} rx={12} fill={LINE} />
        <rect x={355} y={310} width={375} height={179} rx={25} fill={BLUE} />
        <rect x={377} y={333} width={329} height={128} rx={12} fill="#fff" />
        <Text x={540} y={423} size={67} fill={INK}>
          {TOTAL}
        </Text>
        <path
          d="M410 530 H1008 Q1025 530 1030 548 L1080 733 H330 L379 548 Q384 530 410 530Z"
          fill={BLUE}
        />
        <rect x={330} y={715} width={750} height={139} rx={20} fill={BLUE} />
        <rect x={353} y={753} width={704} height={78} rx={12} fill={LINE} />
        <rect x={603} y={770} width={205} height={24} rx={9} fill={INK} />
        <circle cx={968} cy={794} r={13} fill={INK} />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={422 + col * 81}
              y={575 + row * 44}
              width={65}
              height={28}
              rx={7}
              fill={col === 3 ? VIOLET : "#fff"}
            />
          )),
        )}
        <g id="printer-pay">
          <rect x={778} y={630} width={200} height={55} rx={10} fill={VIOLET} />
          <path
            d="M842 656 l18 16 l36 -31"
            fill="none"
            stroke="#fff"
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <g id="printer-paid" opacity={0}>
          <circle cx={997} cy={582} r={16} fill={GREEN} />
          <path d="M990 581 l5 5 l9 -11" fill="none" stroke="#fff" strokeWidth={3} />
        </g>
        <rect x={778} y={522} width={356} height={22} rx={11} fill={INK} />
        <g clipPath="url(#printer-slot-clip)">
          <g id="printer-feed">
            <g id="printer-paper" opacity={0}>
              <path
                d="M801 127 L819 139 L838 127 L857 139 L876 127 L895 139 L914 127 L933 139 L952 127 L971 139 L990 127 L1009 139 L1028 127 L1047 139 L1066 127 L1085 139 L1104 127 V544 H801Z"
                fill="#fff"
                stroke={LINE}
                strokeWidth={3}
              />
              <Text x={949} y={197} size={31} fill={INK}>
                まちのマルシェ
              </Text>
              <path
                d="M827 218 H1074 M827 354 H1074"
                stroke={LINE}
                strokeWidth={3}
                strokeDasharray="7 5"
              />
              {[
                { y: 259, name: "牛乳", price: "300" },
                { y: 299, name: "パン", price: "400" },
                { y: 339, name: "りんご", price: "500" },
              ].map((item) => (
                <g key={item.name}>
                  <Text x={830} y={item.y} size={27} anchor="start" fill={INK}>
                    {item.name}
                  </Text>
                  <Text x={1068} y={item.y} size={27} anchor="end" fill={INK}>
                    {item.price}
                  </Text>
                </g>
              ))}
              <Text x={950} y={390} size={25} fill={INK}>
                合計
              </Text>
              <Text x={950} y={445} size={56} fill={INK}>
                {TOTAL}
              </Text>
              <Text x={950} y={490} size={24} fill={INK}>
                ありがとう
              </Text>
            </g>
          </g>
        </g>
        {/* スキャナーのケーブルは線、本体は紫の面。 */}
        <path
          d="M1095 819 Q1198 891 1207 791 Q1214 748 1160 742"
          fill="none"
          stroke={INK}
          strokeWidth={10}
        />
        <rect x={1115} y={813} width={103} height={26} rx={12} fill={LINE} />
        <path d="M1151 811 L1124 694 L1173 681 L1200 812Z" fill={VIOLET} />
        <path
          d="M1098 627 Q1094 612 1110 609 L1205 596 Q1220 596 1223 613 L1232 665 L1110 690Z"
          fill={VIOLET}
        />
        <path d="M1117 625 L1207 612 L1211 649 L1123 666Z" fill={INK} />
        <path d="M1131 643 L1198 632" stroke={PINK} strokeWidth={5} />
      </g>
      <g id="printer-loupe-move">
        <g id="printer-loupe" opacity={0}>
          <rect
            x={1020}
            y={480}
            width={157}
            height={36}
            rx={18}
            transform="rotate(40 1020 498)"
            fill={VIOLET}
          />
          {/* 輪の形を一枚の面で描き、レンズの光沢は付けない。 */}
          <path
            d="M1073 422 A123 123 0 1 1 827 422 A123 123 0 1 1 1073 422 M1055 422 A105 105 0 1 0 845 422 A105 105 0 1 0 1055 422"
            fill={VIOLET}
            fillRule="evenodd"
          />
          <g id="printer-magnified" opacity={0}>
            <circle cx={950} cy={422} r={105} fill="#fff" />
            <Text x={950} y={389} size={27} fill={INK}>
              合計
            </Text>
            <Text x={950} y={449} size={68} fill={INK}>
              {TOTAL}
            </Text>
          </g>
        </g>
      </g>
      <Line id="printer-return" d="M1081 420 Q1210 420 1240 332 H1330" />
      <Head id="printer-tip" x={1330} y={332} angle={0} />
      <CodeCallout id="printer-type" x={1505} y={332} text={TYPE} />
    </Stage>
  );
}
