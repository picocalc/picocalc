import { DivisionByZeroError } from "#lib/errors";
import type { NormalValue } from "#lib/types";

import { gcd } from "./gcd";

/**
 * Calculates remainder of division.
 */
export function mod(a: NormalValue, b: NormalValue): NormalValue {
  if (b.n === 0n) {
    throw new DivisionByZeroError();
  }

  const d = (a.d * b.d) / gcd(a.d, b.d);

  const n1 = a.n * (d / a.d);
  const n2 = b.n * (d / b.d);

  const n = ((n1 % n2) + n2) % n2;

  return { n, d };
}
