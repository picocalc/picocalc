import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { toSimpleFraction } from "./simplify";
import type { NormalValue, Value, ValueConstant } from "./types";

export function multiply<V extends Value>(a: V, b: V): V | NormalValue {
  const aN = a.n;
  const bN = b.n;

  if (aN === 0n || bN === 0n) return ZERO;

  if (aN === "OVERFLOW") return a;
  if (bN === "OVERFLOW") return b;

  let n: bigint;
  let d: bigint;
  let c: ValueConstant | undefined;
  let expN: bigint | undefined;

  if (a.d === 1n && b.d === 1n) {
    n = aN * bN;
    d = 1n;
  } else {
    const g1 = gcd(aN, b.d);
    const g2 = gcd(bN, a.d);
    n = (aN / g1) * (bN / g2);
    d = (a.d / g2) * (b.d / g1);
  }

  if (a.c === undefined && b.c !== undefined) {
    c = b.c;
  } else if (a.c !== undefined && b.c === undefined) {
    c = a.c;
  } else if (a.c === b.c) {
    c = a.c;
  } else {
    return multiply(toSimpleFraction(a), toSimpleFraction(b));
  }

  const aExpN = a.e?.n;
  const bExpN = b.e?.n;

  if (aExpN !== undefined && bExpN !== undefined) {
    expN = aExpN + bExpN;
  } else if (aExpN !== undefined && bExpN === undefined) {
    expN = aExpN;
  } else if (bExpN !== undefined && aExpN === undefined) {
    expN = bExpN;
  } else if (a.c === b.c) {
    expN = (aExpN ?? 1n) + (bExpN ?? 1n);
  }

  const e = expN ? { n: expN } : undefined;
  return { n, d, c, e };
}
