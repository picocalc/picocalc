import { getPrecisionDigits } from "#lib/options";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { ONE } from "./constants";
import { ln } from "./ln";
import { simplify, toSimpleFraction } from "./simplify";

export function rawExp(
  v: NormalValue,
  precision: PrecisionOptions,
): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ONE;

  const precisionDigits = getPrecisionDigits(precision.maxDecimals);
  const SCALE = 10n ** BigInt(precisionDigits);

  const xScaled = (n * SCALE) / d;

  const ln2Val = ln({ n: 2n, d: 1n }, precision);
  const ln2Scaled = (ln2Val.n * SCALE) / ln2Val.d;

  let k: bigint;
  if (xScaled >= 0n) {
    k = (xScaled + ln2Scaled / 2n) / ln2Scaled;
  } else {
    k = (xScaled - ln2Scaled / 2n) / ln2Scaled;
  }

  const rScaled = xScaled - k * ln2Scaled;

  const isNegativeR = rScaled < 0n;
  const absRScaled = isNegativeR ? -rScaled : rScaled;

  let sum = SCALE; // term 0: r^0 / 0! = 1
  let currentTerm = SCALE; // represents r^i * SCALE
  let factorial = 1n; // i!
  let i = 1n;

  while (true) {
    currentTerm = (currentTerm * absRScaled) / SCALE;
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
  let finalDen = SCALE;

  if (k > 0n) {
    finalNum <<= k;
  } else if (k < 0n) {
    finalDen <<= -k;
  }

  return { n: finalNum, d: finalDen };
}

function exp(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d, c } = v;
  if (n === 0n) return ONE;

  if (!c) {
    return simplify({ n: 1n, d: 1n, c: "e", e: { n, d } });
  }

  return rawExp(
    toSimpleFraction(v, getPrecisionDigits(precision.maxDecimals)),
    precision,
  );
}

export { exp };
