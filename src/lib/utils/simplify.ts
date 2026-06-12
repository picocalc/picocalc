import { DivisionByZeroError } from "../errors";
import { gcd } from "./gcd";
import type { NormalValue } from "./types";

/**
 * Reduces a fraction to its simplest form.
 */
export function simplify(v: NormalValue): NormalValue {
  if (v.d === 0n) throw new DivisionByZeroError();
  if (v.n === 0n) return { n: 0n, d: 1n, c: v.c };
  if (v.d === 1n) return v;
  const common = gcd(v.n, v.d);
  const sign = v.d < 0n ? -1n : 1n;
  return { n: (v.n / common) * sign, d: (v.d / common) * sign, c: v.c };
}
