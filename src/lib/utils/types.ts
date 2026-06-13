const OverflowValue: OverflowValue = { n: "OVERFLOW" } as const satisfies Value;
type OverflowValue = { n: "OVERFLOW" };

type ValueConstant = "pi" | "e";

type Numerator = {
  /** Numerator */
  n: bigint;
};

type Denominator = {
  /** Numerator */
  d: bigint;
};

type SimpleFraction = Numerator & Denominator;

type ValueExponent = Numerator & Partial<Denominator>;

type NormalValue = SimpleFraction & {
  /** Constant */
  c?: ValueConstant;
  /** Constant exponent */
  e?: ValueExponent;
};

type Value = NormalValue | OverflowValue;

export type {
  NormalValue,
  Value,
  ValueConstant,
  SimpleFraction,
  ValueExponent,
};
export { OverflowValue };
