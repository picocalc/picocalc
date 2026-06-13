import { DivisionByZeroError } from "../errors";
import { getConst, ZERO } from "./constants";
import { gcd } from "./gcd";
import { multiply } from "./multiply";
import type { NormalValue } from "./types";

/**
 * Reduces a fraction to its simplest form.
 */
function simplify(v: NormalValue): NormalValue {
  if (v.d === 0n) throw new DivisionByZeroError();
  if (v.n === 0n) return ZERO;
  if (v.d === 1n) return v;
  const common = gcd(v.n, v.d);
  const sign = v.d < 0 ? -1n : 1n;
  return { n: (v.n / common) * sign, d: (v.d / common) * sign, c: v.c, e: v.e };
}

/**
 * Resolves any constants and exponents to return a simple fraction.
 */
function toSimpleFraction(val: NormalValue): NormalValue {
  if (!val.c) {
    return { n: val.n, d: val.d };
  }

  const c = getConst(val.c);
  const e = val.e ?? 1n;
  const absE = e < 0 ? -e : e;

  const poweredConstant: NormalValue = {
    n: e < 0 ? c.d ** absE : c.n ** absE,
    d: e < 0 ? c.n ** absE : c.d ** absE,
  };

  return multiply(poweredConstant, { n: val.n, d: val.d });
}

export { simplify, toSimpleFraction };
