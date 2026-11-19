export function queuePriority(pendingCount) {
  if (pendingCount >= 15) {
    return "urgent";
  } else if (pendingCount >= 5) {
    return "soon";
  } else {
    return "normal";
  }
}
