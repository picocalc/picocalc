import { MAX_DECIMALS } from "#lib/options";
import type { NormalValue, Value } from "#lib/types";

import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { toSimpleFraction } from "./simplify";

export function negate<V extends Value>(v: V): V {
  if (v.n === "OVERFLOW") return v;
  const { n, d } = v;
  return { ...v, n: d < 0 ? n : -n, d: d < 0 ? -d : d };
}

export function add<V extends Value>(
  left: V,
  right: V,
  maxDecimals: number = MAX_DECIMALS,
  subtract: boolean = false,
): V | NormalValue {
  const lN = left.n;
  const rN = right.n;

  if (lN === "OVERFLOW" || rN === 0n) return left;
  if (rN === "OVERFLOW" || lN === 0n) return subtract ? negate(right) : right;

  const { d: lD, c, e } = left;
  const { d: rD, c: rC, e: rE } = right;

  let n: bigint, d: bigint;

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

  if (n < 0n && d < 0n) {
    n = -n;
    d = -d;
  }

  if (n === 0n) return ZERO;

  if (c !== rC || e?.n !== rE?.n) {
    return add(
      toSimpleFraction(left, maxDecimals),
      toSimpleFraction(right, maxDecimals),
      maxDecimals,
      subtract,
    );
  }
  return { n, d, c, e };
}
