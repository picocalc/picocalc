import { gcd } from "./gcd";
import { OverflowValue } from "./types";
import type { Value } from "./types";

export function multiply(a: Value, b: Value): Value {
  const aN = a.n;
  const bN = b.n;

  if (aN === 0n || bN === 0n) {
    return { n: 0n, d: 1n };
  }

  if (aN === "OVERFLOW" || bN === "OVERFLOW") {
    return OverflowValue;
  }

  let n;
  let d;
  let c;

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
  }

  return { n, d, c };
}
