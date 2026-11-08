import type { NormalValue } from "#lib/types";

import { arctan } from "./arctan";
import { simplify } from "./simplify";

export function computePi(maxDecimals?: number): NormalValue {
  const p5 = arctan({ n: 1n, d: 5n }, maxDecimals);
  const p239 = arctan({ n: 1n, d: 239n }, maxDecimals);

  const n = 16n * p5.n * p239.d - 4n * p239.n * p5.d;
  const d = p5.d * p239.d;

  return simplify({ n, d });
}
