import { InterpreterRangeError } from "#lib/errors";
import { getPrecisionDigits } from "#lib/options";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { arctanh } from "./arctanh";
import { ONE } from "./constants";
import { simplify } from "./simplify";
import { sqrt } from "./sqrt";

function ln(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d, c, e } = v;

  if (n <= 0n || d <= 0n) {
    throw new InterpreterRangeError("Logarithm of non-positive number");
  }

  if (c === "e") {
    return e ? { n: e.n, d: e.d ?? 1n } : ONE;
  }

  const precisionDigits = getPrecisionDigits(precision.maxDecimals);
  const SCALE = 10n ** BigInt(precisionDigits);

  let currentN = n;
  let currentD = d;
  let m = 0;

  // Handle values < 1 using ln(x) = -ln(1/x)
  const isReciprocal = currentN * SCALE < currentD * SCALE;
  if (currentN * SCALE < currentD * SCALE) {
    currentN = d;
    currentD = n;
  }

  // Argument reduction: use square roots to bring current value close to 1
  // While x >= 2, x = sqrt(x), and we multiply the final result by 2
  while (currentN * SCALE >= 2n * currentD * SCALE) {
    const val = sqrt({ n: currentN, d: currentD }, precision);
    currentN = val.n;
    currentD = val.d;
    m++;
  }

  // Apply identity: arctanh((u - 1) / (u + 1))
  // u - 1 = (currentN - currentD) / currentD
  // u + 1 = (currentN + currentD) / currentD
  // Ratio simplifies to (currentN - currentD) / (currentN + currentD)
  const argN = currentN - currentD;
  const argD = currentN + currentD;

  const at = arctanh({ n: argN, d: argD }, precision);

  // Multiply by 2 from the identity: ln(u) = 2 * arctanh(...)
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
