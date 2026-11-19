export function parkingRate(minutes, hasShopStamp, hasTicket) {
  if (!hasTicket) {
    return "lost-ticket";
  }
  if (minutes <= 30 && hasShopStamp) {
    return "free";
  }
  if (minutes >= 180) {
    return "daily";
  }
  return "standard";
}
