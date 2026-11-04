import { InterpreterRangeError } from "#lib/errors";
import { getPrecisionDigits } from "#lib/options";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { ZERO } from "./constants";
import { simplify } from "./simplify";
import { sqrt } from "./sqrt";

function rawArctanhSeries(xScaled: bigint, SCALE: bigint): bigint {
  let currentTerm = xScaled;
  let totalSum = xScaled;
  const xSqScaled = (xScaled * xScaled) / SCALE;
  let k = 1n;

  while (true) {
    currentTerm = (currentTerm * xSqScaled) / SCALE;
    const denominatorFactor = 2n * k + 1n;
    const termValue = currentTerm / denominatorFactor;

    if (termValue === 0n) {
      break;
    }

    totalSum += termValue;
    k++;
  }

  return totalSum;
}

function arctanh(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ZERO;

  const precisionDigits = getPrecisionDigits(precision.maxDecimals);
  const SCALE = 10n ** BigInt(precisionDigits);

  let currentN = n;
  let currentD = d;

  const isNegative = currentN < 0n !== currentD < 0n;
  currentN = currentN < 0n ? -currentN : currentN;
  currentD = currentD < 0n ? -currentD : currentD;

  if (currentN >= currentD) {
    throw new InterpreterRangeError(
      "arctanh argument must be strictly between -1 and 1",
    );
  }

  // Argument reduction: shrink x using arctanh(x) = 2 * arctanh(x / (1 + sqrt(1 - x^2)))
  // until x is safely below 0.5 for fast series convergence.
  let reductions = 0n;
  const threshold = SCALE / 2n; // 0.5

  let xScaled = (currentN * SCALE) / currentD;

  while (xScaled > threshold) {
    // 1 - x^2
    const xSq = (xScaled * xScaled) / SCALE;
    const oneMinusXsq = SCALE - xSq;

    // sqrt(1 - x^2)
    const sqrtVal = sqrt({ n: oneMinusXsq, d: SCALE }, precision);
    const sqrtScaled = (sqrtVal.n * SCALE) / sqrtVal.d;

    // new_x = x / (1 + sqrt)
    const denom = SCALE + sqrtScaled;
    xScaled = (xScaled * SCALE) / denom;
    reductions++;
  }

  // Compute series on the reduced small argument
  let sumScaled = rawArctanhSeries(xScaled, SCALE);

  // Scale back up by multiplying by 2^reductions
  sumScaled <<= reductions;

  return simplify({ n: isNegative ? -sumScaled : sumScaled, d: SCALE });
}

export { arctanh };
