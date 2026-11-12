import { powBitLength } from "bigint.bitlength";

import { DivisionByZeroError, NotImplementedError } from "#lib/errors";
import { getBitPrecision } from "#lib/options";
import { MAX_EXPONENT_RESULT_BITS } from "#lib/options";
import type { NormalValue, Value } from "#lib/types";
import { OverflowValue } from "#lib/types";

import { negate } from "./add";
import { ONE, ZERO } from "./constants";
import { ln } from "./ln";
import { nthRoot } from "./nthroot";
import { simplify, toSimpleFraction } from "./simplify";
import { sqrt } from "./sqrt";

function rawExp(v: NormalValue, maxDecimals?: number): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ONE;

  const scale = 1n << getBitPrecision(maxDecimals);

  const xScaled = (n * scale) / d;

  const ln2Val = ln({ n: 2n, d: 1n }, maxDecimals);
  const ln2Scaled = (ln2Val.n * scale) / ln2Val.d;

  let k: bigint;
  if (xScaled >= 0n) {
    k = (xScaled + ln2Scaled / 2n) / ln2Scaled;
  } else {
    k = (xScaled - ln2Scaled / 2n) / ln2Scaled;
  }

  const rScaled = xScaled - k * ln2Scaled;

  const isNegativeR = rScaled < 0n;
  const absRScaled = isNegativeR ? -rScaled : rScaled;

  let sum = scale; // term 0: r^0 / 0! = 1
  let currentTerm = scale; // represents r^i * SCALE
  let factorial = 1n; // i!
  let i = 1n;

  while (true) {
    currentTerm = (currentTerm * absRScaled) / scale;
    if (currentTerm === 0n) break;

    factorial *= i;
    const termVal = currentTerm / factorial;
    if (termVal === 0n) break;

    if (isNegativeR && i % 2n === 1n) {
      sum -= termVal;
    } else {
      sum += termVal;
    }

    i += 1n;
  }

  let finalNum = sum;
  let finalDen = scale;

  if (k > 0n) {
    finalNum <<= k;
  } else if (k < 0n) {
    finalDen <<= -k;
  }

  return { n: finalNum, d: finalDen };
}

function exp(v: NormalValue, maxDecimals?: number): NormalValue {
  const { n, d, c } = v;
  if (n === 0n) return ONE;

  if (!c) {
    return simplify({ n: 1n, d: 1n, c: "e", e: { n, d } });
  }

  return rawExp(toSimpleFraction(v, maxDecimals), maxDecimals);
}

function exponentiate(left: Value, right: Value, maxDecimals?: number): Value {
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

  const normalizedExp = toSimpleFraction(rS, maxDecimals);
  const dExp = normalizedExp.d;
  let exponent = normalizedExp.n;

  if (lN === 0n) {
    if (exponent < 0) throw new DivisionByZeroError();
    return ZERO;
  }

  if ((dExp >= 100 || lD > 1000) && (lN !== 1n || rS.c)) {
    const isNegativeBase = lN < 0;

    if (isNegativeBase && dExp % 2n === 0n) {
      throw new NotImplementedError(
        `Even (${dExp}th) root of negative numbers is not implemented yet.`,
      );
    }

    const lAbs = isNegativeBase ? negate(left) : left;
    const l = toSimpleFraction(lAbs, maxDecimals);
    const r = toSimpleFraction(rS, maxDecimals);

    const lnBase = ln(l, maxDecimals);
    const scale = 1n << getBitPrecision(maxDecimals);
    const lnBaseScaled = (lnBase.n * scale) / lnBase.d;
    const rightScaled = (r.n * scale) / r.d;
    const p = (lnBaseScaled * rightScaled) / scale;
    const pAbs = p < 0 ? -p : p;
    if (
      scale > pAbs * MAX_EXPONENT_RESULT_BITS ||
      pAbs > scale * MAX_EXPONENT_RESULT_BITS
    ) {
      return OverflowValue;
    }
    const productVal = { n: p, d: scale };
    const result = rawExp(productVal, maxDecimals);

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

  if (
    powBitLength(baseN, exponent) > MAX_EXPONENT_RESULT_BITS ||
    powBitLength(baseD, exponent) > MAX_EXPONENT_RESULT_BITS
  ) {
    return OverflowValue;
  }

  const e = c ? simplify({ n: eN, d: left.e?.d ?? 1n }) : undefined;

  if (dExp === exponent) return { n: baseN, d: baseD, c, e };

  const n = baseN ** exponent;
  const d = baseD ** exponent;

  const v = { n, d, c, e };

  if (dExp === 1n) return v;
  if (dExp === 2n) return sqrt(v, maxDecimals);
  return nthRoot(v, dExp, maxDecimals);
}

export { exp, exponentiate };
