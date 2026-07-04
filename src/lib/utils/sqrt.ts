import { NotImplementedError } from "#lib/errors";
import type { PrecisionOptions, Value } from "#lib/types";

import { ZERO } from "./constants";
import { simplify } from "./simplify";

/**
 * Calculates the integer square root of a BigInt.
 */
function isqrt(value: bigint): bigint {
  if (value < 0) {
    throw new NotImplementedError(
      "Square root of negative numbers is not implemented yet.",
    );
  }
  if (value < 2n) return value;

  let res = 0n;
  let bit = 1n << (BigInt.bitLength(value) & ~1n);

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
  if (val < 0) return [false, 0n];
  const root = isqrt(val);
  return [root * root === val, root];
}

export function sqrt(v: Value, precision: PrecisionOptions): Value {
  if (v.n === "OVERFLOW") return v;

  if (v.n < 0) {
    throw new NotImplementedError(
      "Square root of negative numbers is not implemented yet.",
    );
  }

  if (v.n === 0n) return ZERO;

  if (precision.format === "precise") {
    const [nIsSquare, n] = isPerfectSquare(v.n);
    const [dIsSquare, d] = isPerfectSquare(v.d);

    if (nIsSquare && dIsSquare) {
      const e = simplify({ n: v.e?.n ?? 1n, d: (v.e?.d ?? 1n) * 2n });
      return simplify({ n, d, c: v.c, e });
    }
  }

  const precisionDigits = Math.max(10, (precision.maxDecimals ?? 30) * 3);

  // To get 'p' digits of precision in a fraction, we multiply the
  // numerator by 10^(2*p) before taking the integer sqrt.
  const scaleFactor = 10n ** BigInt(precisionDigits * 2);
  const scaledNumerator = (v.n * scaleFactor) / v.d;

  const n = isqrt(scaledNumerator);
  const d = 10n ** BigInt(precisionDigits);

  return simplify({ n, d });
}
