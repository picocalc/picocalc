import type { NormalValue, Value } from "#lib/types";

import { add } from "./add";
import { ZERO } from "./constants";
import { gcd } from "./gcd";
import { simplify, toSimpleFraction } from "./simplify";

export function multiply<V extends Value>(a: V, b: V): V | NormalValue {
  const aN = a.n;
  const bN = b.n;

  if (aN === 0n || bN === 0n) return ZERO;
  if (aN === "OVERFLOW") return a;
  if (bN === "OVERFLOW") return b;

  const { d: aD, c: aC, e: aE } = a;
  const { d: bD, c: bC, e: bE } = b;

  const g1 = gcd(aN, bD);
  const g2 = gcd(bN, aD);
  const n = (aN / g1) * (bN / g2);
  const d = (aD / g2) * (bD / g1);

  if (aC === undefined && bC === undefined) return { n, d };

  if (aC === bC) {
    const e = simplify(
      add(
        { n: aE?.n ?? 1n, d: aE?.d ?? 1n },
        { n: bE?.n ?? 1n, d: bE?.d ?? 1n },
      ),
    );
    return { n, d, c: aC, e };
  }

  if (aC !== undefined && bC !== undefined) {
    return multiply(toSimpleFraction(a), toSimpleFraction(b));
  }

  const c = aC ?? bC;
  const e = aE ?? bE;

  return { n, d, c, e };
}
