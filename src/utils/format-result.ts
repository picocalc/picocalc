import type { PrecisionOptions } from "#lib/interpreter";
import type { NormalValue, ValueConstant } from "#lib/utils/types";

const getConstantStr = (coeff: string, c?: ValueConstant) => {
  if (!c) return coeff;
  if (coeff === "0") return "0";
  if (coeff === "1") return c;
  if (coeff === "-1") return `-${c}`;
  return `${coeff}${c}`;
};

/**
 * Converts Result to a Decimal or Fraction String.
 */
function formatResult(v: NormalValue, options: PrecisionOptions = {}): string {
  const { n, d, c } = v;

  if (d === 0n) return "NaN";

  if (options.format === "precise") {
    if (d === 1n) return getConstantStr(n.toString(), c);
    return `${getConstantStr(n.toString(), c)}/${d}`;
  }

  const maxDecimals = options.maxDecimals ?? 30;

  const isNegative = n < 0n;
  const absN = n < 0n ? -n : n;

  const integerPart = (absN / d).toString();
  let remainder = absN % d;

  if (remainder === 0n) {
    const res = (isNegative ? "-" : "") + integerPart;
    return res === "-0" ? "0" : res;
  }

  let fractionalPart = "";
  let count = 0;

  while (remainder !== 0n && count < maxDecimals) {
    remainder *= 10n;
    fractionalPart += (remainder / d).toString();
    remainder %= d;
    count++;
  }

  let lastNonZero = -1;
  for (let i = fractionalPart.length - 1; i >= 0; i--) {
    if (fractionalPart[i] !== "0") {
      lastNonZero = i;
      break;
    }
  }

  const finalFraction =
    lastNonZero === -1 ? "" : fractionalPart.slice(0, lastNonZero + 1);
  const result =
    finalFraction === "" ? integerPart : `${integerPart}.${finalFraction}`;
  const sign = isNegative && result !== "0" ? "-" : "";

  return sign + result;
}

export { formatResult };
