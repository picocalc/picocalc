import type { NormalValue } from "#lib/types";

import { simplify } from "./simplify";

/**
 * Returns the largest integer less than or equal to the value.
 */
export function floor(v: NormalValue): bigint {
  const { n, d } = simplify(v);
  if (d === 1n) return n;

  const isNegative = n < 0;
  const result = n / d;
  const hasRemainder = n % d !== 0n;

  return isNegative && hasRemainder ? result - 1n : result;
}
