import type { Assignment } from "../../types.js";

import { s0Ch00PrintHello } from "./s0/01-print-hello.js";
import { s0Ch00PrintName } from "./s0/02-print-name.js";
import { s0Ch00PrintNumber } from "./s0/03-print-number.js";
import { s0Ch00PrintCalc } from "./s0/04-print-calc.js";
import { s0Ch00PrintTwoLines } from "./s0/05-print-two-lines.js";
import { s0Ch00PrintVariable } from "./s0/06-print-variable.js";
import { s0Ch00ScoreChallenge } from "./s0/07-score-challenge.js";
import { s0Ch00MultiFileDemo } from "./s0/08-multifile-demo.js";

export const ch00Setup: Assignment[] = [
  s0Ch00PrintHello,
  s0Ch00PrintName,
  s0Ch00PrintNumber,
  s0Ch00PrintCalc,
  s0Ch00PrintTwoLines,
  s0Ch00PrintVariable,
  s0Ch00ScoreChallenge,
  s0Ch00MultiFileDemo,
];
