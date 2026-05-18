import type { Assignment } from "../../types.js";

import { s1Ch02Add } from "./s1/01-add.js";
import { s1Ch02Subtract } from "./s1/02-subtract.js";
import { s1Ch02Multiply } from "./s1/03-multiply.js";
import { s1Ch02Divide } from "./s1/04-divide.js";
import { s1Ch02Modulo } from "./s1/05-modulo.js";
import { s1Ch02Exponent } from "./s1/06-exponent.js";
import { s1Ch02Precedence } from "./s1/07-precedence.js";
import { s1Ch02MathFloor } from "./s1/08-math-floor.js";
import { s1Ch02MathRound } from "./s1/09-math-round.js";
import { s1Ch02MathAbs } from "./s1/10-math-abs.js";
import { s1Ch02MathMax } from "./s1/11-math-max.js";
import { s1Ch02CompoundAssign } from "./s1/12-compound-assign.js";
import { s1Ch02BmiCapstone } from "./s1/13-bmi-capstone.js";
import { s2Ch02NumberFromString } from "./s2/01-number-from-string.js";
import { s2Ch02ParseIntBasic } from "./s2/02-parseInt-basic.js";
import { s2Ch02ParseIntRadix } from "./s2/03-parseInt-radix.js";
import { s2Ch02ParseFloat } from "./s2/04-parseFloat.js";
import { s2Ch02MathPow } from "./s2/05-math-pow.js";
import { s2Ch02MathSqrt } from "./s2/06-math-sqrt.js";
import { s2Ch02MathMinMulti } from "./s2/07-math-min-multi.js";
import { s2Ch02MathFloorDivide } from "./s2/08-math-floor-divide.js";
import { s2Ch02NumberIsNaN } from "./s2/09-number-isnan.js";
import { s2Ch02ToFixed } from "./s2/10-tofixed.js";
import { s2Ch02NumberIsInteger } from "./s2/11-number-isinteger.js";
import { s2Ch02PercentOnesPlace } from "./s2/12-percent-ones-place.js";
import { s3Ch02IsEven } from "./s3/01-is-even.js";
import { s3Ch02Abs } from "./s3/02-abs.js";
import { s3Ch02Factorial } from "./s3/03-factorial.js";
import { s3Ch02IsPrime } from "./s3/04-is-prime.js";
import { s3Ch02SumToN } from "./s3/05-sum-to-n.js";
import { s3Ch02CountDigits } from "./s3/06-count-digits.js";
import { s3Ch02FizzBuzzValue } from "./s3/07-fizzbuzz-value.js";
import { s3Ch02Gcd } from "./s3/08-gcd.js";
import { s4Ch02ToBinary } from "./s4/01-to-binary.js";
import { s4Ch02IsArithmetic } from "./s4/02-is-arithmetic.js";
import { s4Ch02PrimeFactors } from "./s4/03-prime-factors.js";
import { s4Ch02ToBaseCapstone } from "./s4/04-to-base-capstone.js";

export const ch02Numbers: Assignment[] = [
  s1Ch02Add,
  s1Ch02Subtract,
  s1Ch02Multiply,
  s1Ch02Divide,
  s1Ch02Modulo,
  s1Ch02Exponent,
  s1Ch02Precedence,
  s1Ch02MathFloor,
  s1Ch02MathRound,
  s1Ch02MathAbs,
  s1Ch02MathMax,
  s1Ch02CompoundAssign,
  s1Ch02BmiCapstone,
  s2Ch02NumberFromString,
  s2Ch02ParseIntBasic,
  s2Ch02ParseIntRadix,
  s2Ch02ParseFloat,
  s2Ch02MathPow,
  s2Ch02MathSqrt,
  s2Ch02MathMinMulti,
  s2Ch02MathFloorDivide,
  s2Ch02NumberIsNaN,
  s2Ch02ToFixed,
  s2Ch02NumberIsInteger,
  s2Ch02PercentOnesPlace,
  s3Ch02IsEven,
  s3Ch02Abs,
  s3Ch02Factorial,
  s3Ch02IsPrime,
  s3Ch02SumToN,
  s3Ch02CountDigits,
  s3Ch02FizzBuzzValue,
  s3Ch02Gcd,
  s4Ch02ToBinary,
  s4Ch02IsArithmetic,
  s4Ch02PrimeFactors,
  s4Ch02ToBaseCapstone,
];
