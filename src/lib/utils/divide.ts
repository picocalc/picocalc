import { DivisionByZeroError } from "../errors";
import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { OverflowValue } from "./types";
import type { Value, ValueConstant } from "./types";

export function divide(left: Value, right: Value): Value {
  const lN = left.n;
  const rN = right.n;

  if (rN === 0n) throw new DivisionByZeroError();

  if (lN === 0n) return ZERO;

  if (lN === "OVERFLOW" || rN === "OVERFLOW") {
    return OverflowValue;
  }

  const g1 = gcd(lN, rN);
  const lD = left.d;
  const rD = right.d;
  const g2 = gcd(rD, lD);

  const n = (lN / g1) * (rD / g2);
  const d = (lD / g2) * (rN / g1);

  let c: ValueConstant | undefined;
  let nExp: bigint | undefined;

  // Handle constants
  if (left.c !== undefined && right.c === undefined) {
    c = left.c;
  } else if (left.c === undefined && right.c !== undefined) {
    c = right.c;
  } else if (left.c === right.c) {
    c = left.c;
  }

  // Handle exponents (Subtract right from left during division)
  const lE = left.e?.n ?? (left.c !== undefined ? 1n : undefined);
  const rE = right.e?.n ?? (right.c !== undefined ? 1n : undefined);

  if (lE !== undefined && rE !== undefined) {
    if (left.c === right.c) {
      nExp = lE - rE;
      // If exponents cancel out completely, drop the constant
      if (nExp === 0n) {
        c = undefined;
        nExp = undefined;
      }
    }
  } else if (lE !== undefined) {
    nExp = lE;
  } else if (rE !== undefined) {
    nExp = -rE; // Moving from denominator to numerator negates the exponent
  }

  const e = nExp ? { n: nExp } : undefined;

  return { n, d, c, e };
}
