import { MAX_DECIMALS, ROUNDING_MODE } from "./options";
import type { PrecisionOptions, SimpleFraction } from "./types";

function toDecimal(
  { n, d }: SimpleFraction,
  {
    maxDecimals = MAX_DECIMALS,
    roundingMode = ROUNDING_MODE,
  }: PrecisionOptions,
): string {
  if (d === 0n) throw new Error("Division by zero");
  if (n === 0n) return "0";

  const isNegative = n < 0n;
  const absN = isNegative ? -n : n;

  const factor = 10n ** BigInt(maxDecimals);
  const numerator = absN * factor;

  const roundOffset = roundingMode === "round" ? d / 2n : 0n;
  const shiftedResult = (numerator + roundOffset) / d;

  let resultStr = shiftedResult.toString();

  if (resultStr.length <= maxDecimals) {
    resultStr = resultStr.padStart(maxDecimals + 1, "0");
  }

  const splitIdx = resultStr.length - maxDecimals;
  const integerPart = resultStr.slice(0, splitIdx);
  const fractionalPart = resultStr.slice(splitIdx).replace(/0+$/, "");

  const finalResult = fractionalPart
    ? `${integerPart}.${fractionalPart}`
    : integerPart;

  return (isNegative && finalResult !== "0" ? "-" : "") + finalResult;
}

export { toDecimal };
