/**
 * 日別学習時間の棒グラフ (Issue #73)。
 *
 * データは `GET /api/study-activity/mine` が返す実ログ (欠損日は 0 埋め済み)。
 * 固定スケールにすると学習量が少ない受講者のバーが潰れるため、 Y 軸の目盛りは
 * 実際の最大値から動的に決める。
 */

import { studyDateWeekday, type StudyActivityDay } from '@falcon/shared/study/activity';

/** チャート右端側を強調する日数 (直近 1 週間)。 */
const HIGHLIGHT_DAYS = 7;
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** Y 軸の目盛り 1 段ぶんの候補 (秒)。 最大値が 3 段に収まる最小の刻みを選ぶ。 */
const AXIS_STEPS_SEC = [
  300, 600, 900, 1800, 3600, 5400, 7200, 10_800, 14_400, 21_600, 28_800,
];

/** 目盛りラベル (刻みが 1 時間以上なら時間、 未満なら分)。 */
function formatAxisTick(sec: number): string {
  if (sec === 0) return '0';
  if (sec % 3600 === 0) return `${sec / 3600}h`;
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`;
  return `${Math.round(sec / 60)}分`;
}

/** 最大値を 3 段で収められる目盛り刻みを選ぶ。 記録が無い日ばかりでも最低 1 段は出す。 */
function pickAxisStep(maxSec: number): number {
  const step = AXIS_STEPS_SEC.find((s) => s * 3 >= maxSec);
  if (step !== undefined) return step;
  // 候補の上限 (8h/段) を超える極端な値でも軸が破綻しないようにする。
  return Math.max(Math.ceil(maxSec / 3), AXIS_STEPS_SEC[0]!);
}

/** ツールチップ用に秒数を「1時間20分」/「20分」/「40秒」表記にする。 */
function formatDuration(totalSec: number): string {
  if (totalSec <= 0) return '記録なし';
  if (totalSec < 60) return `${Math.round(totalSec)}秒`;
  const minutes = Math.round(totalSec / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

interface StudyChartProps {
  days: StudyActivityDay[];
}

export const StudyChart = ({ days }: StudyChartProps) => {
  const step = pickAxisStep(Math.max(...days.map((d) => d.watched_sec), 0));
  const top = step * 3;
  const baseY = 160;
  const plotH = 120;
  const left = 46;
  const right = 552;
  const slot = (right - left) / Math.max(days.length, 1);
  const barW = Math.min(18, slot * 0.6);

  return (
    <svg viewBox="0 0 560 200" className="w-full h-full" role="img" aria-label="日別の学習時間">
      {/* プロット幅いっぱいに引いたブランドグラデーション。 各バーはその x 位置の
          色を切り取るので、 直近 1 週間のバー全体で 1 本のグラデーションになる。 */}
      <defs>
        <linearGradient id="sf-bar" gradientUnits="userSpaceOnUse" x1={left} y1="0" x2={right} y2="0">
          <stop offset="0" stopColor="#0A33FF" />
          <stop offset="0.34" stopColor="#8330C7" />
          <stop offset="0.58" stopColor="#E62F9A" />
          <stop offset="0.78" stopColor="#FF2C61" />
          <stop offset="1" stopColor="#FF2E0D" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={left - 6}
          y1={baseY - (plotH * i) / 3}
          x2={right}
          y2={baseY - (plotH * i) / 3}
          stroke="var(--line)"
          strokeDasharray="2 4"
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <text
          key={i}
          x={left - 10}
          y={baseY - (plotH * i) / 3 + 3}
          textAnchor="end"
          className="fill-ink-3 text-[10.5px]"
        >
          {formatAxisTick(step * i)}
        </text>
      ))}
      {days.map((d, i) => {
        const h = top > 0 ? Math.max(0, (d.watched_sec / top) * plotH) : 0;
        const recent = i >= days.length - HIGHLIGHT_DAYS;
        return (
          <rect
            key={d.date}
            x={left + slot * i + (slot - barW) / 2}
            y={baseY - h}
            width={barW}
            height={h}
            rx="2"
            fill={recent ? 'url(#sf-bar)' : 'var(--line-2)'}
          >
            <title>{`${d.date} · ${formatDuration(d.watched_sec)}`}</title>
          </rect>
        );
      })}
      {days.map((d, i) => (
        <text
          key={d.date}
          x={left + slot * i + slot / 2}
          y="178"
          textAnchor="middle"
          className="fill-ink-3 text-[10.5px]"
        >
          {WEEKDAY_LABELS[studyDateWeekday(d.date)]}
        </text>
      ))}
    </svg>
  );
};
