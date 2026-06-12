const OverflowValue: OverflowValue = { n: "OVERFLOW" } as const satisfies Value;
type OverflowValue = { n: "OVERFLOW" };

type ValueConstant = "pi" | "e";

type NormalValue = {
  /** Numerator */
  n: bigint;
  /** Denominator */
  d: bigint;
  /** Constant */
  c?: ValueConstant;
  /** Constant exponent */
  e?: bigint;
};

type Value = NormalValue | OverflowValue;

export type { NormalValue, Value, ValueConstant };
export { OverflowValue };
