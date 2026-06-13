function binaryProduct(arr: bigint[], low: number, high: number): bigint {
  if (low > high) return 1n;
  if (low === high) return arr[low]!;
  const mid = Math.floor((low + high) / 2);
  return binaryProduct(arr, low, mid) * binaryProduct(arr, mid + 1, high);
}

function getPrimes(limit: number): number[] {
  const sieve = new Uint8Array(limit + 1).fill(1);
  sieve[0] = sieve[1] = 0;

  for (let i = 2; i * i <= limit; i++) {
    if (sieve[i]) {
      for (let j = i * i; j <= limit; j += i) sieve[j] = 0;
    }
  }

  const result: number[] = [];
  for (let i = 2; i <= limit; i++) {
    if (sieve[i]) result.push(i);
  }
  return result;
}

/**
 * Calculates factorial.
 */
export function factorial(n: bigint): bigint | null {
  if (n < 0) return null;
  if (n === 0n || n === 1n) return 1n;

  if (n < 1000n) {
    let result = 1n;
    for (let i = 2n; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  const limit = Number(n);
  const primes = getPrimes(limit);
  const primePowers: bigint[] = [];

  for (const p of primes) {
    let exponent = 0n;
    let currentN = n;
    const pBig = BigInt(p);

    while (currentN >= pBig) {
      currentN /= pBig;
      exponent += currentN;
    }

    primePowers.push(pBig ** exponent);
  }

  return binaryProduct(primePowers, 0, primePowers.length - 1);
}
