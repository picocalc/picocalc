/**
 * Fast Binary GCD (Stein's Algorithm) for BigInt.
 */
export function gcd(a: bigint, b: bigint): bigint {
  if (a === b) return a;
  if (a === 1n || b === 1n) return 1n;
  if (a === 0n) return b;
  if (b === 0n) return a;

  a = a < 0 ? -a : a;
  b = b < 0 ? -b : b;

  let shift = 0n;
  while (((a | b) & 1n) === 0n) {
    a >>= 1n;
    b >>= 1n;
    shift++;
  }
  while ((a & 1n) === 0n) a >>= 1n;
  do {
    while ((b & 1n) === 0n) b >>= 1n;
    if (a > b) [a, b] = [b, a];
    b = b - a;
  } while (b !== 0n);
  return a << shift;
}
