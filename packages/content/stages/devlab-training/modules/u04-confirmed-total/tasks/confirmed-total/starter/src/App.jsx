import { useState } from "react";
import { RecordList } from "./RecordList.jsx";
import { records } from "./records.js";
import { sumWeek } from "./sum-week.js";

export function App({ initialRecords = records }) {
  const [workRecords, setWorkRecords] = useState(initialRecords);
  const weeks = [...new Set(workRecords.map((record) => record.week))].sort();
  const [week, setWeek] = useState(weeks[0] ?? "");
  const weekRecords = workRecords.filter((record) => record.week === week);

  function confirmRecord(id) {
    setWorkRecords((current) =>
      current.map((record) =>
        record.id === id ? { ...record, status: "confirmed" } : record,
      ),
    );
  }

  return (
    <main>
      <h1>週報</h1>
      <label htmlFor="week">対象週</label>
      <select
        id="week"
        value={week}
        onChange={(event) => setWeek(event.target.value)}
      >
        {weeks.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      <p>合計：{sumWeek(workRecords, week)}分</p>
      <RecordList records={weekRecords} onConfirm={confirmRecord} />
    </main>
  );
}
