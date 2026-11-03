import type { NormalValue, PrecisionOptions } from "#lib/types";

import { arctan } from "./arctan";
import { simplify } from "./simplify";

export function calculatePi(precision: PrecisionOptions): NormalValue {
  const p5 = arctan({ n: 1n, d: 5n }, precision);
  const p239 = arctan({ n: 1n, d: 239n }, precision);

  const n = 16n * p5.n * p239.d - 4n * p239.n * p5.d;
  const d = p5.d * p239.d;

  return simplify({ n, d });
}
