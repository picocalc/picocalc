import { getBitPrecision } from "#lib/options";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { ONE, ZERO } from "./constants";
import { computePi } from "./pi";

function rawSinSeries(rScaled: bigint, bitPrecision: bigint): bigint {
  const rSqScaled = (rScaled * rScaled) >> bitPrecision;

  let termValue = rScaled;
  let totalSum = rScaled;
  let k = 1n;

  while (true) {
    const nextTermScaled = (termValue * rSqScaled) >> bitPrecision;
    const denom = 2n * k * (2n * k + 1n);
    termValue = nextTermScaled / denom;

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

  return totalSum;
}

function rawCosSeries(rScaled: bigint, bitPrecision: bigint): bigint {
  const rSqScaled = (rScaled * rScaled) >> bitPrecision;

  const scale = 1n << bitPrecision;
  let termValue = scale;
  let totalSum = scale;
  let k = 1n;

  while (true) {
    const nextTermScaled = (termValue * rSqScaled) >> bitPrecision;
    const denom = (2n * k - 1n) * (2n * k);
    termValue = nextTermScaled / denom;

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

  return totalSum;
}

function getHalfPi(precision: PrecisionOptions): NormalValue {
  const { d, n, c } = computePi(precision);
  return { c, n, d: d * 2n };
}

function sin(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ZERO;

  const bitPrecision = BigInt(getBitPrecision(precision.maxDecimals));
  const scale = 1n << bitPrecision;

  const halfPi = getHalfPi(precision);

  const divNum = n * halfPi.d;
  const divDen = d * halfPi.n;

  const k = (divNum + divDen / 2n) / divDen;

  const rN = n * halfPi.d - k * halfPi.n * d;
  const rD = d * halfPi.d;

  const rScaled = (rN * scale) / rD;

  const quadrant = ((k % 4n) + 4n) % 4n;

  let resultScaled: bigint;
  let negate = false;

  if (quadrant === 0n) {
    // sin(r)
    resultScaled = rawSinSeries(rScaled, bitPrecision);
  } else if (quadrant === 1n) {
    // cos(r)
    resultScaled = rawCosSeries(rScaled, bitPrecision);
  } else if (quadrant === 2n) {
    // -sin(r)
    resultScaled = rawSinSeries(rScaled, bitPrecision);
    negate = true;
  } else {
    // -cos(r)
    resultScaled = rawCosSeries(rScaled, bitPrecision);
    negate = true;
  }

  const finalN = negate ? -resultScaled : resultScaled;
  return { n: finalN, d: scale };
}

function cos(v: NormalValue, precision: PrecisionOptions): NormalValue {
  const { n, d } = v;
  if (n === 0n) return ONE;

  const bitPrecision = BigInt(getBitPrecision(precision.maxDecimals));
  const scale = 1n << bitPrecision;

  const halfPi = getHalfPi(precision);

  const divNum = n * halfPi.d;
  const divDen = d * halfPi.n;
  const k = (divNum + divDen / 2n) / divDen;

  const rN = n * halfPi.d - k * halfPi.n * d;
  const rD = d * halfPi.d;

  const rScaled = (rN * scale) / rD;

  const quadrant = ((k % 4n) + 4n) % 4n;

  let resultScaled: bigint;
  let negate = false;

  if (quadrant === 0n) {
    // cos(r)
    resultScaled = rawCosSeries(rScaled, bitPrecision);
  } else if (quadrant === 1n) {
    // -sin(r)
    resultScaled = rawSinSeries(rScaled, bitPrecision);
    negate = true;
  } else if (quadrant === 2n) {
    // -cos(r)
    resultScaled = rawCosSeries(rScaled, bitPrecision);
    negate = true;
  } else {
    // sin(r)
    resultScaled = rawSinSeries(rScaled, bitPrecision);
  }

  const finalN = negate ? -resultScaled : resultScaled;
  return { n: finalN, d: scale };
}

export { sin, cos };
