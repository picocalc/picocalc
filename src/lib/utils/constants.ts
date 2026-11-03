import type { NormalValue, PrecisionOptions, ValueConstant } from "#lib/types";

import { computeE } from "./e";
import { computePi } from "./pi";

const ZERO = { n: 0n, d: 1n } as const;
const ONE = { n: 1n, d: 1n } as const;

function getConst(id: ValueConstant, options: PrecisionOptions): NormalValue {
  if (options.format === "precise") return { n: 1n, d: 1n, c: id };
  if (id === "pi") return computePi(options);
  return computeE(options.maxDecimals);
}

export { getConst, ZERO, ONE };
