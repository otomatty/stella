import { formatRecord } from "./format-record";
import type { WorkRecord } from "./types";

interface RecordListProps {
  records: readonly WorkRecord[];
  onConfirm: (id: string) => void;
}

export function RecordList({ records }: RecordListProps) {
  return (
    <ul aria-label="作業記録">
      {records.map((record) => (
        <li key={record.id}>
          <span>{formatRecord(record)}</span>
          {/* TODO: 状態を表示し、下書きなら確定ボタンから onConfirm に ID を渡す。 */}
        </li>
      ))}
    </ul>
  );
}
