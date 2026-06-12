import { describe, it, expect } from "bun:test";

import { serialize } from "#lib/codegen";
import { tokenize } from "#lib/lexer";

describe("serialize", () => {
  it("serializes a simple number", () => {
    expect(serialize(tokenize("1"))).toEqual("1");
  });

  it("serializes a simple expression", () => {
    expect(serialize(tokenize("1 + 1"))).toEqual("1 + 1");
    expect(serialize(tokenize("1 - 1"))).toEqual("1 - 1");
    expect(serialize(tokenize("1 * 1"))).toEqual("1 * 1");
    expect(serialize(tokenize("1 / 1"))).toEqual("1 / 1");
  });

  it("should correctly format unary operators", () => {
    expect(serialize(tokenize("+1"))).toEqual("+1");
    expect(serialize(tokenize("-1"))).toEqual("-1");
  });

  it("should serialize parentheses correctly", () => {
    expect(serialize(tokenize("(1 + 1) * 2"))).toEqual("(1 + 1) * 2");
    expect(serialize(tokenize("-(1 + 1)"))).toEqual("-(1 + 1)");
  });

  it("should handle double unary operators without spaces", () => {
    expect(serialize(tokenize("--1"))).toEqual("--1");
    expect(serialize(tokenize("+-1"))).toEqual("+-1");
  });

  it("should handle unary operators inside binary expressions", () => {
    expect(serialize(tokenize("5 + -1"))).toEqual("5 + -1");
    expect(serialize(tokenize("2 * -3"))).toEqual("2 * -3");
  });

  it("should handle implicit multiplication correctly", () => {
    expect(serialize(tokenize("2(3)"))).toEqual("2(3)");
    expect(serialize(tokenize("(2)(3)"))).toEqual("(2)(3)");
  });

  it("should handle exponentiation correctly", () => {
    expect(serialize(tokenize("2^3"))).toEqual("2^3");
  });
});
