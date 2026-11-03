import type { RoundingMode } from "./types";

const MAX_DECIMALS = 30;

const ROUNDING_MODE: RoundingMode = "round";

function getPrecisionDigits(maxDecimals?: number): number {
  return Math.max(10, (maxDecimals ?? 30) + 10);
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

export {
  MAX_DECIMALS,
  ROUNDING_MODE,
  getPrecisionDigits,
  MAX_FACTORIAL,
  MAX_PRECISION,
  MAX_SCIENTIFIC_NUMBER_EXPONENT,
};
