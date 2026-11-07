import { InterpreterRangeError } from "#lib/errors";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { arctanh } from "./arctanh";
import { ONE } from "./constants";
import { simplify, toSimpleFraction } from "./simplify";
import { sqrt } from "./sqrt";

function ln(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d, c, e } = v;

  if (n <= 0n || d <= 0n) {
    throw new InterpreterRangeError("Logarithm of non-positive number");
  }

  if (c === "e" && n === d) {
    return e ? { n: e.n, d: e.d ?? 1n } : ONE;
  }

  let { n: sN, d: sD } = toSimpleFraction(v);

  // Handle values < 1 using ln(x) = -ln(1/x)
  const isReciprocal = sN < sD;
  if (isReciprocal) {
    [sN, sD] = [sD, sN];
  }

  let m = 0;

  // Argument reduction: bring value close to 1 via sqrt
  // While x >= 2, x = sqrt(x), accumulating factor 2^m
  while (sN >= 2n * sD) {
    const val = sqrt({ n: sN, d: sD }, precision);
    sN = val.n;
    sD = val.d;
    m++;
  }

  const at = arctanh({ n: sN - sD, d: sN + sD }, precision);

  let rN = at.n * 2n;

  // Account for square root reductions: multiply by 2^m
  if (m > 0) {
    rN <<= BigInt(m);
  }

  // Account for reciprocal inversion: ln(1/x) = -ln(x)
  if (isReciprocal) {
    rN = -rN;
  }

  return simplify({ n: rN, d: at.d });
}

export { ln };
