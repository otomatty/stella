export function ticketPrice(age, isWeekday, isMember) {
  if (age < 12) {
    return 1000;
  }
  if (age >= 65) {
    return 1200;
  }
  if (isWeekday && isMember) {
    return 1400;
  }
  return 1800;
}
