import { DivisionByZeroError, NotImplementedError } from "#lib/errors";
import { getPrecisionDigits } from "#lib/options";
import type { PrecisionOptions, Value } from "#lib/types";
import { OverflowValue } from "#lib/types";

import { negate } from "./add";
import { ONE, ZERO } from "./constants";
import { rawExp } from "./exp";
import { ln } from "./ln";
import { nthRoot } from "./nthroot";
import { simplify, toSimpleFraction } from "./simplify";
import { sqrt } from "./sqrt";

/**
 * Maximum digits allowed for the result of exponentiation
 */
const MAX_EXPONENT_RESULT_DIGITS = 10_000_000n;

export function exponentiate(
  left: Value,
  right: Value,
  precision: PrecisionOptions,
): Value {
  const rN = right.n;
  if (rN === 0n) return ONE;

  const lN = left.n;
  if (lN === "OVERFLOW") return left;

  const { c, d: lD } = left;

  if (lN === lD && c === undefined) return ONE;
  if (rN === "OVERFLOW") return right;

  const rS = simplify(right);

  if (lN === -lD && c === undefined && rS.d % 2n) {
    if (rS.n % 2n) return { n: -1n, d: 1n };
    return ONE;
  }

  const normalizedExp = toSimpleFraction(rS, precision.maxDecimals);
  const dExp = normalizedExp.d;
  let exponent = normalizedExp.n;

  if (lN === 0n) {
    if (exponent < 0) throw new DivisionByZeroError();
    return ZERO;
  }

  if (dExp >= 100 && (lN !== 1n || rS.c)) {
    const maxDecimals = getPrecisionDigits(precision.maxDecimals);

    const isNegativeBase = lN < 0;

    if (isNegativeBase && dExp % 2n === 0n) {
      throw new NotImplementedError(
        `Even (${dExp}th) root of negative numbers is not implemented yet.`,
      );
    }

    const lAbs = isNegativeBase ? negate(left) : left;
    const lS = toSimpleFraction(lAbs, maxDecimals);
    const r = toSimpleFraction(rS, maxDecimals);

    const lnBase = ln(lS, { maxDecimals });
    const SCALE = 10n ** BigInt(maxDecimals);
    const lnBaseScaled = (lnBase.n * SCALE) / lnBase.d;
    const rightScaled = (r.n * SCALE) / r.d;
    const productScaled = (lnBaseScaled * rightScaled) / SCALE;

    const productVal = { n: productScaled, d: SCALE };
    const result = rawExp(productVal, precision);

    if (isNegativeBase && normalizedExp.n % 2n !== 0n) {
      return negate(result);
    }

    return result;
  }

  const eN = (left.e?.n ?? 1n) * exponent;

  let baseN = lN;
  let baseD = lD;

  if (exponent < 0) {
    exponent = -exponent;
    [baseN, baseD] = [baseD, baseN];
  }

  const baseNDigits = BigInt.bitLength(baseN);
  const baseDDigits = BigInt.bitLength(baseD);

  if (
    baseNDigits * exponent > MAX_EXPONENT_RESULT_DIGITS ||
    baseDDigits * exponent > MAX_EXPONENT_RESULT_DIGITS ||
    ((baseNDigits > 5000 || baseDDigits > 5000) && exponent > 10)
  ) {
    return OverflowValue;
  }

  const e = c ? simplify({ n: eN, d: left.e?.d ?? 1n }) : undefined;

  if (dExp === exponent) return { n: baseN, d: baseD, c, e };

  const n = baseN ** exponent;
  const d = baseD ** exponent;

  const v = { n, d, c, e };

  if (dExp === 1n) return v;
  if (dExp === 2n) return sqrt(v, precision);
  return nthRoot(v, dExp, precision);
}
