export function queuePriority(pendingCount) {
  if (pendingCount >= 5) {
    return "soon";
  } else if (pendingCount >= 15) {
    return "urgent";
  } else {
    return "normal";
  }
}
