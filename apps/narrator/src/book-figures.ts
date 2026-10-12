import type { FigureSpec } from "@stella/book-core/ocr";
import { MAX_LIBRARY_BOOK_PDFS } from "@stella/shared/library/types";
export interface FigureTask {
  pageNo: number;
  figures: FigureSpec[];
  complete: boolean;
}
export const MAX_BOOK_PDFS = MAX_LIBRARY_BOOK_PDFS;
// Workflow step budget (limit 1024): 6 fixed + 6 per PDF x 50 + OCR ranges <= 97
// (1000 pages / 20 + one partial range per PDF) + chapter saves <= 50 + cleanup 1
// = 454, leaving 570 steps; 500 figure batches keep the worst case at 954.
export const MAX_FIGURE_BATCHES = 500;
/** One guard plus four statements per figure/completed page stays below 50. */
export function figureBatches(pages: { page_no: number; ocr_figures: string }[]): FigureTask[][] {
  const batches: FigureTask[][] = [];
  let current: FigureTask[] = [],
    cost = 0;
  for (const page of pages) {
    const figures = JSON.parse(page.ocr_figures) as FigureSpec[];
    for (let start = 0; start < figures.length; start += 11) {
      const part = figures.slice(start, start + 11);
      const taskCost = part.length + 1;
      if (cost + taskCost > 12) {
        batches.push(current);
        current = [];
        cost = 0;
      }
      current.push({
        pageNo: page.page_no,
        figures: part,
        complete: start + part.length === figures.length,
      });
      cost += taskCost;
    }
  }
  if (current.length) batches.push(current);
  return batches;
}
