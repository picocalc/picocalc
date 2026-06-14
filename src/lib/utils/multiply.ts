import { add } from "./add";
import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { simplify, toSimpleFraction } from "./simplify";
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

  if (a.c === undefined && b.c === undefined) {
    return { n, d };
  }

  const aExpN = a.e?.n;
  const bExpN = b.e?.n;

  if (a.c === b.c) {
    const aExpD = a.e?.d ?? 1n;
    const bExpD = b.e?.d ?? 1n;
    const e = simplify(
      add({ n: aExpN ?? 1n, d: aExpD }, { n: bExpN ?? 1n, d: bExpD }),
    );
    return { n, d, c: a.c, e };
  }

  if (a.c === undefined && b.c !== undefined) {
    c = b.c;
  } else if (a.c !== undefined && b.c === undefined) {
    c = a.c;
  } else {
    return multiply(toSimpleFraction(a), toSimpleFraction(b));
  }

  if (aExpN !== undefined && bExpN === undefined) {
    expN = aExpN;
  } else if (bExpN !== undefined && aExpN === undefined) {
    expN = bExpN;
  }

  const e = expN ? { n: expN } : undefined;
  return { n, d, c, e };
}
