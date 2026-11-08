import { NotImplementedError } from "#lib/errors";
import { getBitPrecision } from "#lib/options";
import type { NormalValue, Value } from "#lib/types";

import { ZERO } from "./constants";
import { simplify, toSimpleFraction } from "./simplify";

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

export function sqrt<V extends Value>(
  v: V,
  maxDecimals?: number,
): V | NormalValue {
  if (v.n === "OVERFLOW") return v;

  if (v.n < 0) {
    throw new NotImplementedError(
      "Square root of negative numbers is not implemented yet.",
    );
  }

  if (v.n === 0n) return ZERO;

  const [nIsSquare, n] = isPerfectSquare(v.n);
  const [dIsSquare, d] = isPerfectSquare(v.d);

  if (nIsSquare && dIsSquare) {
    const e = simplify({ n: v.e?.n ?? 1n, d: (v.e?.d ?? 1n) * 2n });
    return simplify({ n, d, c: v.c, e });
  }

  const precisionBits = getBitPrecision(maxDecimals);

  const scaleFactor = 1n << (precisionBits * 2n);
  const s = toSimpleFraction(v);
  const scaledNumerator = (s.n * scaleFactor) / s.d;

  return { n: isqrt(scaledNumerator), d: 1n << precisionBits };
}
