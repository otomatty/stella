import { formatRecord } from "./format-record.js";

export function RecordList({ records, onConfirm }) {
  return (
    <ul aria-label="作業記録">
      {records.map((record) => (
        <li key={record.id}>
          <span>{formatRecord(record)}</span>
          <span>{record.status === "draft" ? "下書き" : "確定"}</span>
          {record.status === "draft" && (
            <button type="button" onClick={() => onConfirm(record.id)}>
              確定する
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
