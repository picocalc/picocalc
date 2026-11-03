import type { NormalValue, PrecisionOptions, ValueConstant } from "#lib/types";

import { calculatePi } from "./pi";

const E: string = Math.E.toString();

const ZERO = { n: 0n, d: 1n } as const;
const ONE = { n: 1n, d: 1n } as const;

const constants: { readonly e: typeof E } = { e: E } as const;

function getConst(id: ValueConstant, options: PrecisionOptions): NormalValue {
  if (options.format === "precise") return { n: 1n, d: 1n, c: id };
  if (id === "pi") return calculatePi(options);
  const c = constants[id];
  return {
    n: BigInt(c.replace(".", "")),
    d: 10n ** BigInt(c.length - c.indexOf(".") - 1),
  };
}

export { getConst, E, ZERO, ONE };
