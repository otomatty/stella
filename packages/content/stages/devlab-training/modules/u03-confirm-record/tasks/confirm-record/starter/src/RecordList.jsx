import { formatRecord } from "./format-record.js";

export function RecordList({ records, onConfirm }) {
  void onConfirm;
  return (
    <ul aria-label="作業記録">
      {records.map((record) => (
        <li key={record.id}>
          <span>{formatRecord(record)}</span>
          {/* TODO: 状態を表示し、下書きなら確定ボタンを置く。 */}
        </li>
      ))}
    </ul>
  );
}
