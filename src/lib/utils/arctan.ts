import { getPrecisionDigits } from "#lib/options";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { getConst, ZERO } from "./constants";
import { computePi } from "./pi";
import { simplify } from "./simplify";

function rawArctanSeries(
  absN: bigint,
  absD: bigint,
  precision: PrecisionOptions,
): { n: bigint; d: bigint } {
  // Pad decimals tightly to safely absorb accumulated final rounding artifacts
  const precisionDigits = getPrecisionDigits(precision.maxDecimals);
  const SCALE = 10n ** BigInt(precisionDigits);

  const xScaled = (absN * SCALE) / absD;
  if (xScaled === 0n) return { n: 0n, d: SCALE };

  const xSqScaled = (xScaled * xScaled) / SCALE;

  let currentTerm = xScaled;
  let totalSum = xScaled; // k = 0 term
  let k = 1n;

  while (true) {
    currentTerm = (currentTerm * xSqScaled) / SCALE;
    const denominatorFactor = 2n * k + 1n;
    const termValue = currentTerm / denominatorFactor;

    if (termValue === 0n) {
      break;
    }

    if (k % 2n === 1n) {
      totalSum -= termValue;
    } else {
      totalSum += termValue;
    }

    k++;
  }

  return { n: totalSum, d: SCALE };
}

function arctan(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ZERO;

  const isNegative = n < 0n !== d < 0n;
  const absN = n < 0n ? -n : n;
  const absD = d < 0n ? -d : d;

  if (absN === absD) {
    const pi = getConst("pi", precision);
    const n = isNegative ? -pi.n : pi.n;
    return simplify({ ...pi, n, d: pi.d * 4n });
  }

  // --- IDENTITY 1: Handle Values Bigger Than 1 (Reflection) ---
  // arctan(x) = pi/2 - arctan(1/x)
  if (absN > absD) {
    const pi = computePi(precision);
    // Reciprocal input is 1/x -> invert numerator and denominator
    const subArctan = arctan({ n: absD, d: absN }, precision);

    // Compute: (pi.n * subArctan.d * 2) - (subArctan.n * pi.d * 2) / (2 * pi.d * subArctan.d)
    const resultNum = pi.n * subArctan.d - 2n * subArctan.n * pi.d;
    const resultDen = 2n * pi.d * subArctan.d;

    const finalNum = isNegative ? -resultNum : resultNum;
    return simplify({ n: finalNum, d: resultDen });
  }

  // --- IDENTITY 2: Handle Values Close to 1 (Argument Reduction Split) ---
  // If x > 0.5, the raw Taylor series slows down drastically. We split it using:
  // arctan(x) = arctan(1/2) + arctan((2x - 1) / (2 + x))
  if (absN * 2n > absD) {
    const halfArctan = arctan({ n: 1n, d: 2n }, precision);

    // For x = absN/absD, the remaining argument formula simplifies cleanly to:
    // (2*absN - absD) / (2*absD + absN)
    const remN = 2n * absN - absD;
    const remD = 2n * absD + absN;
    const remainderArctan = arctan({ n: remN, d: remD }, precision);

    // Combine values: halfArctan + remainderArctan
    const resultNum =
      halfArctan.n * remainderArctan.d + remainderArctan.n * halfArctan.d;
    const resultDen = halfArctan.d * remainderArctan.d;

    const finalNum = isNegative ? -resultNum : resultNum;
    return simplify({ n: finalNum, d: resultDen });
  }

  // --- BASE CASE: Values safely between 0 and 0.5 ---
  const r = rawArctanSeries(absN, absD, precision);

  return simplify({ n: isNegative ? -r.n : r.n, d: r.d });
}

export { arctan };
