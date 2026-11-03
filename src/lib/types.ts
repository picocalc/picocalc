const OverflowValue: OverflowValue = { n: "OVERFLOW" } as const satisfies Value;
type OverflowValue = { n: "OVERFLOW" };

type ValueConstant = "pi" | "e";

type Numerator = {
  /** Numerator */
  readonly n: bigint;
};

type Denominator = {
  /** Denominator */
  readonly d: bigint;
};

type SimpleFraction = Numerator & Denominator;

type ValueExponent = Numerator & Partial<Denominator>;

type NormalValue = SimpleFraction & {
  /** Constant */
  readonly c?: ValueConstant;
  /** Constant exponent */
  readonly e?: ValueExponent;
};

type Value = NormalValue | OverflowValue;

type RoundingMode = "round" | "truncate";

interface PrecisionOptions {
  readonly format?: "decimal" | "precise";
  readonly maxDecimals?: number;
  readonly roundingMode?: RoundingMode;
}

export type {
  NormalValue,
  Value,
  ValueConstant,
  SimpleFraction,
  ValueExponent,
  RoundingMode,
  PrecisionOptions,
};
export { OverflowValue };
