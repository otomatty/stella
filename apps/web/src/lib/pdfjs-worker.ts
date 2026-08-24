/**
 * pdfjs Worker のグローバル設定。
 *
 * react-pdf が解決する pdfjs-dist と同じ worker を bundler 経由で参照する。
 * `pdfjs.GlobalWorkerOptions.workerSrc` に渡す。
 * `SlidesViewer` から side-effect import するだけで設定が完了する。
 */

import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
