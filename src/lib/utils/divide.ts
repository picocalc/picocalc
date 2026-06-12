import { DivisionByZeroError } from "#lib/errors";

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
  const lC = left.c;
  const rD = right.d;
  const g2 = gcd(rD, lD);

  const resN = (lN / g1) * (rD / g2);
  const resD = (lD / g2) * (rN / g1);

  let resC: ValueConstant | undefined;
  if (lC !== undefined && right.c === undefined) {
    resC = lC;
  }

  return { n: resN, d: resD, c: resC };
}
