import { getPrecisionDigits } from "#lib/options";
import type { SimpleFraction } from "#lib/types";

function splitSeries(a: bigint, b: bigint): SimpleFraction {
  if (b - a === 1n) {
    return { n: 1n, d: b };
  }

  const mid = (a + b) / 2n;

  const left = splitSeries(a, mid);
  const right = splitSeries(mid, b);

  return { n: left.n * right.d + right.n, d: left.d * right.d };
}

function computeE(maxDecimals?: number): SimpleFraction {
  let b = 1n;
  let m = 1n;
  const t = 10n ** BigInt(getPrecisionDigits(maxDecimals));

  while (m < t) {
    b++;
    m *= b;
  }

  const { n, d } = splitSeries(0n, b);

  return { n: d + n, d };
}

export { computeE };
