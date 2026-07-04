import { DivisionByZeroError } from "#lib/errors";
import type { PrecisionOptions, Value } from "#lib/types";
import { OverflowValue } from "#lib/types";

import { ZERO, ONE, constants } from "./constants";
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

  const lD = left.d;
  const c = left.c;

  if (lN === lD && c === undefined) return ONE;
  if (rN === "OVERFLOW") return right;

  if (lN === -lD && c === undefined) {
    if (rN % 2n) return { n: -1n, d: 1n };
    return ONE;
  }

  const normalizedExp = toSimpleFraction(simplify(right));
  let exponent = normalizedExp.n;

  if (lN === 0n) {
    if (exponent < 0) throw new DivisionByZeroError();
    return ZERO;
  }

  const dExp = normalizedExp.d;

  if (dExp >= 100) {
    let baseFloat = Number(lN) / Number(lD);
    if (c) baseFloat *= Number(constants[c]);
    const expFloat = Number(exponent) / Number(dExp);
    const resultFloat = baseFloat ** expFloat;
    if (!Number.isFinite(resultFloat)) return OverflowValue;
    const [integerPart, fractionalPart] = resultFloat.toString().split(".");
    if (!fractionalPart) return simplify({ n: BigInt(integerPart!), d: 1n });
    const denominator = 10n ** BigInt(fractionalPart.length);
    const numerator = BigInt(integerPart + fractionalPart);
    return simplify({ n: numerator, d: denominator });
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
