import { formatMinutes, totalMinutes } from "./summary.js";

const records = [
  { day: "月", minutes: 90 },
  { day: "火", minutes: 45 },
  { day: "水", minutes: 60 },
];

document.querySelector("#total").textContent = formatMinutes(totalMinutes(records));
