import type { NormalValue, Value } from "#lib/types";

import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { toSimpleFraction } from "./simplify";

export function add<V extends Value>(
  left: V,
  right: V,
  subtract: boolean = false,
): V | NormalValue {
  const lN = left.n;
  const rN = right.n;

  if (lN === "OVERFLOW") return left;
  if (rN === "OVERFLOW") return right;

  const { d: lD, c, e } = left;
  const { d: rD, c: rC, e: rE } = right;

  if (lN === 0n) return { n: subtract ? -rN : rN, d: rD, c: rC, e: rE };
  if (rN === 0n) return { n: lN, d: lD, c, e };

  let n: bigint;
  let d: bigint;

  if (lD === rD) {
    n = subtract ? lN - rN : lN + rN;
    d = lD;
  } else {
    const common = gcd(lD, rD);
    const mLeft = rD / common;
    const mRight = lD / common;
    n = subtract ? lN * mLeft - rN * mRight : lN * mLeft + rN * mRight;
    d = lD * mLeft;
  }

  if (n === 0n) return ZERO;

  if (c !== rC || e?.n !== rE?.n) {
    return add(toSimpleFraction(left), toSimpleFraction(right), subtract);
  }
  return { n, d, c, e };
}
