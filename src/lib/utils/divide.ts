import { DivisionByZeroError } from "../errors";

import { gcd } from "./gcd";
import { OverflowValue } from "./types";
import type { Value, ValueConstant } from "./types";

export function divide(left: Value, right: Value): Value {
  const lN = left.n;
  const rN = right.n;

  if (rN === 0n) {
    throw new DivisionByZeroError();
  }

  if (lN === 0n) {
    return { n: 0n, d: 1n };
  }

  if (lN === "OVERFLOW" || rN === "OVERFLOW") {
    return OverflowValue;
  }

  const g1 = gcd(lN, rN);
  const lD = left.d;
  const rD = right.d;
  const g2 = gcd(rD, lD);

  const resN = (lN / g1) * (rD / g2);
  const resD = (lD / g2) * (rN / g1);

  let resC: ValueConstant | undefined;
  let resE: bigint | undefined;

  // Handle constants
  if (left.c !== undefined && right.c === undefined) {
    resC = left.c;
  } else if (left.c === undefined && right.c !== undefined) {
    resC = right.c;
  } else if (left.c === right.c) {
    resC = left.c;
  }

  // Handle exponents (Subtract right from left during division)
  const lE = left.e ?? (left.c !== undefined ? 1n : undefined);
  const rE = right.e ?? (right.c !== undefined ? 1n : undefined);

  if (lE !== undefined && rE !== undefined) {
    if (left.c === right.c) {
      resE = lE - rE;
      // If exponents cancel out completely (e.g., π^1 / π^1 = π^0), drop the constant
      if (resE === 0n) {
        resC = undefined;
        resE = undefined;
      }
    }
  } else if (lE !== undefined) {
    resE = lE;
  } else if (rE !== undefined) {
    resE = -rE; // Moving from denominator to numerator negates the exponent
  }

  return { n: resN, d: resD, c: resC, e: resE };
}
