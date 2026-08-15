/**
 * pdfjs Worker のグローバル設定。
 *
 * Vite の `?url` import で worker ファイルを bundling 対象にし、
 * `pdfjs.GlobalWorkerOptions.workerSrc` に渡す。
 * `main.tsx` から side-effect import するだけで設定が完了する。
 */

import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
