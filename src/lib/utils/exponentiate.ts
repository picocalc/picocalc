import { DivisionByZeroError } from "#lib/errors";

import { ZERO } from "./constants";
import { nthRoot } from "./nthroot";
import { simplify, toSimpleFraction } from "./simplify";
import { sqrt } from "./sqrt";
import { OverflowValue } from "./types";
import type { Value } from "./types";

export function exponentiate(
  left: Value,
  right: Value,
  precise: boolean,
): Value {
  const rN = right.n;
  const lN = left.n;

  if (rN === 0n) return { n: 1n, d: 1n };
  if (lN === "OVERFLOW") return left;

  const lD = left.d;
  const lC = left.c;

  if (lN === lD && lC === undefined) return { n: 1n, d: 1n };
  if (rN === "OVERFLOW") return right;

  const normalizedExponent = toSimpleFraction(simplify(right));
  let exponent = normalizedExponent.n;

  if (lN === 0n) {
    if (exponent < 0) throw new DivisionByZeroError();
    return ZERO;
  }

  const exp = (left.e ?? 1n) * exponent;

  let baseN = lN;
  let baseD = lD;

  if (exponent < 0) {
    exponent = -exponent;
    [baseN, baseD] = [baseD, baseN];
  }

  const exponentD = normalizedExponent.d;

  if (exponentD === 2n) {
    const basePowerN = baseN ** exponent;
    const basePowerD = baseD ** exponent;

    return sqrt(
      { n: basePowerN, d: basePowerD, c: lC, e: lC ? exp : undefined },
      precise,
    );
  }

  if (exponentD !== 1n) {
    const basePowerN = baseN ** exponent;
    const basePowerD = baseD ** exponent;

    return nthRoot(
      { n: basePowerN, d: basePowerD, c: lC, e: lC ? exp : undefined },
      exponentD,
      precise,
    );
  }

  if (exponent === 1n) {
    return { n: baseN, d: baseD, c: lC, e: lC ? exp : undefined };
  }

  if (exponent > 1e4 && (baseN * exponent > 6e6 || baseD * exponent > 6e6)) {
    return OverflowValue;
  }

  const n = baseN ** exponent;
  const d = baseD ** exponent;

  return { n, d, c: lC, e: lC ? exp : undefined };
}
