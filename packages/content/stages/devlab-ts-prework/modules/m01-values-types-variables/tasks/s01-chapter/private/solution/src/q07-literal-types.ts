export function move(position: number, direction: "up" | "down"): number {
  if (direction === "up") {
    return position + 1;
  }
  return position - 1;
}

// let だと再代入できるので number に広がる（widening）。const は再代入できないので 0 のまま
export const START_POSITION = 0;
