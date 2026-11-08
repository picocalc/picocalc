import type { NormalValue, ValueConstant } from "#lib/types";

import { computeE } from "./e";
import { computePi } from "./pi";

const ZERO = { n: 0n, d: 1n } as const;
const ONE = { n: 1n, d: 1n } as const;

function getConst(id: ValueConstant, maxDecimals?: number): NormalValue {
  if (id === "pi") return computePi(maxDecimals);
  return computeE(maxDecimals);
}

export { getConst, ZERO, ONE };
