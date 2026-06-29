import { DivisionByZeroError } from "#lib/errors";

import { getConst, ZERO } from "./constants";
import { gcd } from "./gcd";
import { multiply } from "./multiply";
import { nthRoot } from "./nthroot";
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
  const n = (v.n / common) * sign;
  const d = (v.d / common) * sign;
  return { n, d, c: v.c, e: v.e };
}

/**
 * Resolves any constants and exponents to return a simple fraction.
 */
function toSimpleFraction(val: NormalValue): NormalValue {
  if (!val.c) return val;

  const c = getConst(val.c);
  const expN = val.e?.n ?? 1n;
  const expD = val.e?.d ?? 1n;

  const absExpN = expN < 0 ? -expN : expN;

  let poweredConstant: NormalValue = {
    n: expN < 0 ? c.d ** absExpN : c.n ** absExpN,
    d: expN < 0 ? c.n ** absExpN : c.d ** absExpN,
  };

  if (expD !== 1n) {
    poweredConstant = nthRoot(poweredConstant, expD, true);
  }

  return multiply(poweredConstant, { n: val.n, d: val.d });
}

export { simplify, toSimpleFraction };
