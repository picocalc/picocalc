import { DivisionByZeroError, InterpreterError } from "../errors";
import { simplify } from "./simplify";
import type { NormalValue } from "./types";

/**
 * Calculates the integer nth root of a BigInt.
 */
function iNthRoot(value: bigint, n: bigint): bigint {
  if (value < 0n && n % 2n === 0n) {
    throw new InterpreterError(
      "Even root of negative number is not supported yet.",
    );
  }
  if (value < 0n) return -iNthRoot(-value, n); // Handle odd roots of negatives
  if (value < 2n) return value;
  if (n === 1n) return value;

  // Initial guess: 2^(bits/n) is a good starting point to save iterations
  let x = 1n << (BigInt(value.toString(2).length) / n + 1n);

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
  root: bigint,
  precise: boolean = false,
  precisionDigits: number = 100,
): NormalValue {
  if (root === 0n) {
    throw new DivisionByZeroError();
  }
  if (root === 1n) return v;

  // Handle negatives: Error if root is even, recurse if root is odd
  if (v.n < 0n) {
    if (root % 2n === 0n) {
      throw new InterpreterError(`${root}-th root of negative not supported.`);
    }
    // For odd roots: nthRoot(-x) = -nthRoot(x)
    const positiveResult = nthRoot(
      { n: -v.n, d: v.d },
      root,
      precise,
      precisionDigits,
    );
    return { n: -positiveResult.n, d: positiveResult.d };
  }

  if (v.n === 0n) return { n: 0n, d: 1n };

  // 1. Try for an exact integer root if 'precise' is requested
  if (precise) {
    const rootN = iNthRoot(v.n, root);
    const rootD = iNthRoot(v.d, root);

    if (rootN ** root === v.n && rootD ** root === v.d) {
      return simplify({ n: rootN, d: rootD });
    }
  }

  // 2. Fallback to high-precision approximation
  // To get 'p' digits of precision, we multiply the numerator by 10^(root * p)
  const scalePower = BigInt(precisionDigits) * root;
  const scaleFactor = 10n ** scalePower;

  // Bring the fraction into a single BigInt space: (n/d) * 10^(root * p)
  const scaledValue = (v.n * scaleFactor) / v.d;

  const resultN = iNthRoot(scaledValue, root);
  const resultD = 10n ** BigInt(precisionDigits);

  return simplify({ n: resultN, d: resultD });
}
