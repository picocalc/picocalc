import { InterpreterRangeError } from "#lib/errors";
import { getBitPrecision } from "#lib/options";
import type { NormalValue } from "#lib/types";

import { ZERO } from "./constants";

function rawArctanhSeries(xScaled: bigint, bitPrecision: bigint) {
  let currentTerm = xScaled;
  let totalSum = xScaled;

  const xSqScaled = (xScaled * xScaled) >> bitPrecision;

  let k = 1n;

  while (true) {
    currentTerm = (currentTerm * xSqScaled) >> bitPrecision;
    const denominatorFactor = 2n * k + 1n;

    if (currentTerm < denominatorFactor) break;

    totalSum += currentTerm / denominatorFactor;
    k++;
  }

  return totalSum;
}

function arctanh(v: NormalValue, maxDecimals?: number): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ZERO;

  const bitPrecision = getBitPrecision(maxDecimals);

  const isNegative = n < 0n !== d < 0n;

  const currentN = n < 0n ? -n : n;
  const currentD = d < 0n ? -d : d;

  if (currentN >= currentD) {
    throw new InterpreterRangeError(
      "arctanh argument must be strictly between -1 and 1",
    );
  }

  const xScaled = (currentN << bitPrecision) / currentD;

  const sumScaled = rawArctanhSeries(xScaled, bitPrecision);

  return { n: isNegative ? -sumScaled : sumScaled, d: 1n << bitPrecision };
}

export { arctanh };
