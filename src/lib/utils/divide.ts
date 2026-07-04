import { DivisionByZeroError } from "#lib/errors";
import { OverflowValue } from "#lib/types";
import type { Value, ValueExponent } from "#lib/types";

import { add } from "./add";
import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { simplify } from "./simplify";

export function divide(left: Value, right: Value): Value {
  const lN = left.n;
  const rN = right.n;

  if (rN === 0n) throw new DivisionByZeroError();
  if (lN === 0n) return ZERO;
  if (lN === "OVERFLOW" || rN === "OVERFLOW") return OverflowValue;

  const { d: lD, c: lC, e: lE } = left;
  const { d: rD, c: rC, e: rE } = right;

  const g1 = gcd(lN, rN);
  const g2 = gcd(rD, lD);
  const n = (lN / g1) * (rD / g2);
  const d = (lD / g2) * (rN / g1);

  if (lC !== undefined && lC === rC) {
    const e = simplify(
      add(
        { n: lE?.n ?? 1n, d: lE?.d ?? 1n },
        { n: rE?.n ?? 1n, d: rE?.d ?? 1n },
        true,
      ),
    );
    return { n, d, c: lC, e };
  }

  const c = lC ?? rC;

  let e: ValueExponent | undefined;
  if (lC !== undefined) {
    e = lE ? { n: lE.n, d: lE.d ?? 1n } : { n: 1n, d: 1n };
  } else if (rC !== undefined) {
    e = { n: -(rE?.n ?? 1n), d: rE?.d ?? 1n };
  }

  return { n, d, c, e };
}
