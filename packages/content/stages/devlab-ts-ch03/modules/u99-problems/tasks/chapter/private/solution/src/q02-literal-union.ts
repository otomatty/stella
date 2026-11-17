export type Size = "S" | "M" | "L";

export function priceOf(size: Size): number {
  if (size === "S") {
    return 300;
  }
  if (size === "M") {
    return 400;
  }
  return 500;
}

export function parseSize(text: string): Size | undefined {
  const upper = text.trim().toUpperCase();
  if (upper === "S" || upper === "M" || upper === "L") {
    return upper;
  }
  return undefined;
}

export function upsize(size: Size): Size {
  if (size === "S") {
    return "M";
  }
  return "L";
}
