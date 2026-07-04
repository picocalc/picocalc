import type {
  NormalValue,
  ValueConstant,
  ValueExponent,
  PrecisionOptions,
} from "#lib/types";

function getConstantStr(coeff: bigint, c?: ValueConstant, e?: ValueExponent) {
  if (coeff === 0n) return "0";
  if (!c) return `${coeff}`;
  const isOne = e && e.n === 1n && (e.d === undefined || e.d === 1n);
  if (!e || isOne) {
    if (coeff === 1n) return c;
    if (coeff === -1n) return `-${c}`;
    return `${coeff}${c}`;
  }
  const num = e.n;
  const den = e.d ?? 1n;
  const expStr = den === 1n ? `${num}` : `(${num}/${den})`;
  const constantStr = den === 2n * num ? `sqrt(${c})` : `${c}^${expStr}`;
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
  if (c && e && e.n < 0n) {
    const positiveExp = { n: -e.n, d: e.d };
    const denominatorStr = getConstantStr(d, c, positiveExp);
    return `${numSign}${absN}/${denominatorStr}`;
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

  const { maxDecimals = 30, roundingMode = "round" } = options;

  const isNegative = n < 0;
  const absN = isNegative ? -n : n;

  let integerPart = (absN / d).toString();
  let remainder = absN % d;

  if (remainder === 0n) {
    const res = (isNegative ? "-" : "") + integerPart;
    return res === "-0" ? "0" : res;
  }

  let fractionalPart = "";
  let count = 0;

  const targetLength = maxDecimals + 1;

  while (remainder !== 0n && count < targetLength) {
    remainder *= 10n;
    fractionalPart += (remainder / d).toString();
    remainder %= d;
    count++;
  }

  const nexDigitStr = fractionalPart[maxDecimals];
  if (nexDigitStr) {
    const nextDigit = parseInt(nexDigitStr, 10);
    // Slice off the lookahead digit so we are at maxDecimals length
    fractionalPart = fractionalPart.slice(0, maxDecimals);

    if (roundingMode === "round" && nextDigit >= 5) {
      // We need to increment the fractional part like a number string
      // BigInt helps us cleanly avoid overflow issues if fractionalPart is all 9s
      const incremented = (BigInt(fractionalPart) + 1n).toString();

      if (incremented.length > fractionalPart.length) {
        // If it overflowed (e.g., 999 + 1 = 1000), the carry goes into the integer part
        integerPart = (BigInt(integerPart) + 1n).toString();
        fractionalPart = incremented.slice(1);
      } else {
        // Pads leading zeros if necessary (e.g., "049" + 1 -> "050")
        fractionalPart = incremented.padStart(fractionalPart.length, "0");
      }
    }
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
