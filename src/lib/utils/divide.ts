import { DivisionByZeroError } from "#lib/errors";

import { add } from "./add";
import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { simplify } from "./simplify";
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
  const lExpN = left.e?.n ?? (left.c !== undefined ? 1n : undefined);
  const rExpN = right.e?.n ?? (right.c !== undefined ? 1n : undefined);

  const lExpD = left.e?.d ?? 1n;
  const rExpD = right.e?.d ?? 1n;

  if (lExpN !== undefined && rExpN !== undefined && left.c === right.c) {
    const e = simplify(
      add({ n: lExpN, d: lExpD }, { n: rExpN, d: rExpD }, true),
    );
    return { n, d, c, e };
  }

  let dExp;

  if (lExpN !== undefined) {
    nExp = lExpN;
    dExp = lExpD;
  } else if (rExpN !== undefined) {
    nExp = -rExpN; // Moving from denominator to numerator negates the exponent
    dExp = rExpD;
  }

  const e = nExp ? { n: nExp, d: dExp } : undefined;

  return { n, d, c, e };
}
