import type { NormalValue } from "#lib/types";

import { simplify } from "./simplify";

/**
 * Returns the smallest integer greater than or equal to the value.
 */
export function ceil(v: NormalValue): bigint {
  const { n, d } = simplify(v);
  if (d === 1n) return n;

  const isPositive = n > 0;
  const result = n / d;
  const hasRemainder = n % d !== 0n;

  return isPositive && hasRemainder ? result + 1n : result;
}
