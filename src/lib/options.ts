import type { RoundingMode } from "./types";

const MAX_DECIMALS = 30;

const ROUNDING_MODE: RoundingMode = "round";

function getPrecisionDigits(maxDecimals: number = 30): number {
  return maxDecimals + 10;
}

function getBitPrecision(maxDecimals: number = 30): number {
  return maxDecimals * 4 + 32;
}

/**
 * Maximum allowed precision
 */
const MAX_PRECISION = 50_000;

/**
 * Maximum allowed factorial
 */
const MAX_FACTORIAL = 20_000;

/**
 * Maximum allowed exponent for scientific number notation
 */
const MAX_SCIENTIFIC_NUMBER_EXPONENT = 3e5;

/**
 * Maximum digits allowed for the result of exponentiation
 */
const MAX_EXPONENT_RESULT_DIGITS = 10_000_000n;

export {
  MAX_DECIMALS,
  ROUNDING_MODE,
  getBitPrecision,
  getPrecisionDigits,
  MAX_FACTORIAL,
  MAX_PRECISION,
  MAX_SCIENTIFIC_NUMBER_EXPONENT,
  MAX_EXPONENT_RESULT_DIGITS,
};
