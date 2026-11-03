import { describe, it, expect } from "bun:test";

import { simplify, toSimpleFraction } from "#lib/utils/simplify";

describe("simplify", () => {
  it("should correctly simplify a value with exponent without a constant", () => {
    expect(simplify({ n: 2n, d: 1n, e: { n: 1n, d: 2n } })).toEqual({
      n: 2n,
      d: 1n,
    });
  });
});

describe("toSimpleFraction", () => {
  it("should correctly simplify a value with exponent without a constant", () => {
    expect(toSimpleFraction({ n: 2n, d: 1n, e: { n: 1n, d: 2n } })).toEqual({
      n: 2n,
      d: 1n,
    });
  });
});
