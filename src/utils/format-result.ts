import type { PrecisionOptions } from "#lib/interpreter";
import type { NormalValue, ValueConstant } from "#lib/utils/types";

function getConstantStr(coeff: bigint, c?: ValueConstant, e?: bigint) {
  if (coeff === 0n) return "0";
  if (!c) return coeff.toString();
  const absExp = e && e < 0 ? -e : e;
  const constantStr = absExp && absExp !== 1n ? `${c}^${absExp}` : c;
  if (coeff === 1n) return constantStr;
  if (coeff === -1n) return `-${constantStr}`;
  return `${coeff}${constantStr}`;
}

function formatPrecise(v: NormalValue): string {
  const { n, d, c, e } = v;
  if (n === 0n) return "0";
  const isNegative = n < 0;
  const absN = isNegative ? -n : n;
  const numSign = isNegative ? "-" : "";
  if (c && e && e < 0) {
    return `${numSign}${absN.toString()}/${getConstantStr(d, c, e)}`;
  }
  const numeratorStr = getConstantStr(absN, c, e);
  if (d === 1n) return `${numSign}${numeratorStr}`;
  return `${numSign}${numeratorStr}/${d}`;
}

/**
 * Converts Result to a Decimal or Fraction String.
 */
function formatResult(v: NormalValue, options: PrecisionOptions = {}): string {
  const { n, d } = v;

  if (d === 0n) return "NaN";

  if (options.format === "precise") {
    return formatPrecise(v);
  }

  const { maxDecimals = 30 } = options;

  const isNegative = n < 0;
  const absN = isNegative ? -n : n;

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
