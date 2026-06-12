import { InterpreterError } from "../errors";
import { simplify } from "./simplify";
import { OverflowValue } from "./types";
import type { Value } from "./types";

/**
 * Calculates the integer square root of a BigInt.
 */
function isqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new InterpreterError("Square root of negative not supported yet.");
  }
  if (value < 2n) return value;

  let res = 0n;
  let bit = 1n << BigInt((value.toString(2).length - 1) & ~1);

  while (bit !== 0n) {
    if (value >= res + bit) {
      value -= res + bit;
      res = (res >> 1n) + bit;
    } else {
      res >>= 1n;
    }
    bit >>= 2n;
  }
  return res;
}

function isPerfectSquare(val: bigint): [boolean, bigint] {
  if (val < 0n) return [false, 0n];
  const root = isqrt(val);
  return [root * root === val, root];
}

export function sqrt(
  v: Value,
  precise: boolean = false,
  precisionDigits: number = 100,
): Value {
  if (v.n === "OVERFLOW") {
    return OverflowValue;
  }
  if (v.n < 0n) {
    throw new InterpreterError("Square root of negative not supported yet.");
  }

  if (v.n === 0n) return { n: 0n, d: 1n };

  if (precise) {
    const [nIsSquare, nRoot] = isPerfectSquare(v.n);
    const [dIsSquare, dRoot] = isPerfectSquare(v.d);

    if (nIsSquare && dIsSquare) {
      return simplify({ n: nRoot, d: dRoot });
    }
  }

  // To get 'p' digits of precision in a fraction, we multiply the
  // numerator by 10^(2*p) before taking the integer sqrt.
  const scaleFactor = 10n ** BigInt(precisionDigits * 2);
  const scaledNumerator = (v.n * scaleFactor) / v.d;

  const rootN = isqrt(scaledNumerator);
  const rootD = 10n ** BigInt(precisionDigits);

  return simplify({ n: rootN, d: rootD });
}
