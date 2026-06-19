import { DivisionByZeroError, NotImplementedError } from "../errors";
import { ZERO } from "./constants";
import { simplify } from "./simplify";
import type { NormalValue } from "./types";

/**
 * Calculates the integer nth root of a BigInt.
 */
function iNthRoot(value: bigint, n: bigint): bigint {
  if (value < 0 && n % 2n === 0n) {
    throw new NotImplementedError(
      `Even (${n}th) root of negative numbers is not implemented yet.`,
    );
  }
  if (value < 0) return -iNthRoot(-value, n); // Handle odd roots of negatives
  if (value < 2n) return value;
  if (n === 1n) return value;

  // Initial guess: 2^(bits/n) is a good starting point to save iterations
  let x = 1n << (BigInt.bitLength(value) / n + 1n);

  const nMinus1 = n - 1n;

  while (true) {
    // Newton's formula: x = ((n-1)*x + value / x^(n-1)) / n
    const nextX = (nMinus1 * x + value / x ** nMinus1) / n;

    // In integer math, convergence is reached when the value stops decreasing
    if (nextX >= x) break;
    x = nextX;
  }

  return x;
}

/**
 * Calculates the n-th root of a fraction.
 */
export function nthRoot(
  v: NormalValue,
  n: bigint,
  precise: boolean = false,
  precisionDigits: number = 100,
): NormalValue {
  if (n === 0n) throw new DivisionByZeroError();
  if (n === 1n) return v;

  // Handle negatives: Error if root is even, recurse if root is odd
  if (v.n < 0) {
    if (n % 2n === 0n) {
      throw new NotImplementedError(
        `Even (${n}th) root of negative numbers is not implemented yet.`,
      );
    }
    // For odd roots: nthRoot(-x) = -nthRoot(x)
    const positiveResult = nthRoot(
      { n: -v.n, d: v.d },
      n,
      precise,
      precisionDigits,
    );
    return { n: -positiveResult.n, d: positiveResult.d };
  }

  if (v.n === 0n) return ZERO;

  // 1. Try for an exact integer root if 'precise' is requested
  if (precise) {
    const rootN = iNthRoot(v.n, n);
    const rootD = iNthRoot(v.d, n);
    if (rootN ** n === v.n && rootD ** n === v.d) {
      const e = simplify({ n: v.e?.n ?? 1n, d: (v.e?.d ?? 1n) * n });
      return simplify({ n: rootN, d: rootD, c: v.c, e });
    }
  }

  // 2. Fallback to high-precision approximation
  // To get 'p' digits of precision, we multiply the numerator by 10^(root * p)
  const scalePower = BigInt(precisionDigits) * n;
  const scaleFactor = 10n ** scalePower;

  // Bring the fraction into a single BigInt space: (n/d) * 10^(root * p)
  const scaledValue = (v.n * scaleFactor) / v.d;

  const resultN = iNthRoot(scaledValue, n);
  const resultD = 10n ** BigInt(precisionDigits);

  return simplify({ n: resultN, d: resultD });
}
