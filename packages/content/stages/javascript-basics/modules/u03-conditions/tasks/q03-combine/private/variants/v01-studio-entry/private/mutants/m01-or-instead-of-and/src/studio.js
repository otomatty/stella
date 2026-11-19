export function canEnterStudio(isClosed, hasReservation, sessionMinutes) {
  if (isClosed) {
    return false;
  }
  return hasReservation || sessionMinutes <= 45;
}
