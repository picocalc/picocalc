import { getBitPrecision } from "#lib/options";
import type { NormalValue, PrecisionOptions } from "#lib/types";

import { ONE, ZERO } from "./constants";
import { computePi } from "./pi";
import { toSimpleFraction } from "./simplify";

function roundDiv(numerator: bigint, denominator: bigint): bigint {
  const twice = numerator * 2n;
  const absTwice = twice < 0n ? -twice : twice;
  const absDenom = denominator < 0n ? -denominator : denominator;
  const quotient = (absTwice + absDenom) / (2n * absDenom);
  return twice < 0n !== denominator < 0n ? -quotient : quotient;
}

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
  const { n, d, c, e } = v;
  if (n === 0n) return ZERO;

  const bitPrecision = BigInt(getBitPrecision(precision.maxDecimals));
  const scale = 1n << bitPrecision;

  const isPiLinear = c === "pi" && (e === undefined || e.n === 1n);

  let rScaled: bigint;
  let k: bigint;

  if (isPiLinear) {
    k = roundDiv(2n * n, d);
    const rN = 2n * n - k * d;
    if (rN === 0n) {
      const quadrant = ((k % 4n) + 4n) % 4n;
      if (quadrant === 0n || quadrant === 2n) return ZERO;
      if (quadrant === 1n) return ONE;
      return { n: -1n, d: 1n };
    }
    const piVal = computePi(precision);
    rScaled = (rN * piVal.n * scale) / (2n * d * piVal.d);
  } else {
    const simple = toSimpleFraction(v);
    const halfPi = getHalfPi(precision);

    const divNum = simple.n * halfPi.d;
    const divDen = simple.d * halfPi.n;
    k = roundDiv(divNum, divDen);

    const rN = simple.n * halfPi.d - k * halfPi.n * simple.d;
    const rD = simple.d * halfPi.d;
    rScaled = (rN * scale) / rD;
  }

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
  const { n, d, c, e } = v;
  if (n === 0n) return ONE;

  const bitPrecision = BigInt(getBitPrecision(precision.maxDecimals));
  const scale = 1n << bitPrecision;

  const isPiLinear = c === "pi" && (e === undefined || e.n === 1n);

  let rScaled: bigint;
  let k: bigint;

  if (isPiLinear) {
    k = roundDiv(2n * n, d);
    const rN = 2n * n - k * d;
    if (rN === 0n) {
      const quadrant = ((k % 4n) + 4n) % 4n;
      if (quadrant === 0n || quadrant === 2n) {
        return quadrant === 0n ? ONE : { n: -1n, d: 1n };
      }
      return ZERO;
    }
    const piVal = computePi(precision);
    rScaled = (rN * piVal.n * scale) / (2n * d * piVal.d);
  } else {
    const simple = toSimpleFraction(v);
    const halfPi = getHalfPi(precision);

    const divNum = simple.n * halfPi.d;
    const divDen = simple.d * halfPi.n;
    k = roundDiv(divNum, divDen);

    const rN = simple.n * halfPi.d - k * halfPi.n * simple.d;
    const rD = simple.d * halfPi.d;
    rScaled = (rN * scale) / rD;
  }

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
