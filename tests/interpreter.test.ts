import { describe, it, expect } from "bun:test";

import {
  DivisionByZeroError,
  EmptyExpressionError,
  MaximumPrecisionError,
  MismatchedParenthesisError,
  OverflowError,
} from "#lib/errors";
import { E, PI } from "#lib/utils/constants";
import { calculate } from "#src";

const win32 = process.platform === "win32";

describe("evaluate", () => {
  it("should handle a number", () => {
    expect(calculate("1")).toBe("1");
  });

  it("should handle a simple addition", () => {
    expect(calculate("1 + 1")).toBe("2");
  });

  it("should handle a simple positive number", () => {
    expect(calculate("+1")).toBe("1");
  });

  it("should handle a simple negative number", () => {
    expect(calculate("-1")).toBe("-1");
  });

  it("should handle double unary operator", () => {
    expect(calculate("--1")).toBe("1");
    expect(calculate("-+1")).toBe("-1");
    expect(calculate("+-1")).toBe("-1");
    expect(calculate("++1")).toBe("1");
  });

  it("should handle a simple subtraction", () => {
    expect(calculate("1 - 1")).toBe("0");
  });

  it("should handle addition and subtraction", () => {
    expect(calculate("2 + 2 - 1")).toBe("3");
    expect(calculate("2 - 1 + 2")).toBe("3");
    expect(calculate("5 - 1 - 2")).toBe("2");
  });

  it("should handle a simple multiplication", () => {
    expect(calculate("3 * 4")).toBe("12");
  });

  it("should respect operator precedence (PEMDAS/BODMAS)", () => {
    expect(calculate("1 + 2 * 3")).toBe("7");
    expect(calculate("2 * 3 + 1")).toBe("7");
    expect(calculate("10 - 2 * 4")).toBe("2");
    expect(calculate("10 * 2 - 4")).toBe("16");
  });

  it("should handle unary operators with multiplication", () => {
    expect(calculate("-2 * 3")).toBe("-6");
    expect(calculate("2 * -3")).toBe("-6");
    expect(calculate("-2 * -3")).toBe("6");
  });

  it("should handle parentheses", () => {
    expect(calculate("(1 + 2) * 3")).toBe("9");
    expect(calculate("2 * (3 + 4)")).toBe("14");
  });

  it("should handle nested parentheses", () => {
    expect(calculate("((1 + 1) * 2) + 1")).toBe("5");
  });

  it("should handle unary operators with parentheses", () => {
    expect(calculate("-(1 + 1)")).toBe("-2");
  });

  it("should handle implicit multiplication", () => {
    expect(calculate("2(2)")).toBe("4");
    expect(calculate("2(3+4)")).toBe("14");
    expect(calculate("(1+2)(3+4)")).toBe("21");
  });

  it("should allow missing closing parenthesis", () => {
    expect(calculate("(1 + 2")).toBe("3");
  });

  it("should correctly handle order of implicit multiplication", () => {
    expect(calculate("2 + 2(1 + 1)")).toBe("6");
    expect(calculate("2 * 2(1 + 2)")).toBe("12");
    expect(calculate("8 - 2(1 + 2)")).toBe("2");
  });

  it("should have have higher precedence for implicit multiplication than division", () => {
    expect(calculate("6 / 2(1 + 2)")).toBe("1");
  });

  it("should throw DivisionByZeroError for division by 0", () => {
    expect(() => calculate("1/0")).toThrow(DivisionByZeroError);
    expect(() => calculate("0/0")).toThrow(DivisionByZeroError);
    expect(() => calculate("0 * 1/0")).toThrow(DivisionByZeroError);
    expect(() => calculate("1/0 * 0")).toThrow(DivisionByZeroError);
    expect(() => calculate("(1/0)^-1")).toThrow(DivisionByZeroError);
  });

  it("should not throw DivisionByZeroError when not dividing by 0", () => {
    expect(() => calculate("1/2")).not.toThrow(DivisionByZeroError);
    expect(() => calculate("0/1")).not.toThrow(DivisionByZeroError);
    expect(() => calculate("0/2")).not.toThrow(DivisionByZeroError);

    expect(calculate("0/1")).toBe("0");
  });

  it("should have have higher precedence for implicit multiplication than exponentiation", () => {
    expect(calculate("2 ^ 3(1+2)")).toBe("512");
    expect(calculate("2 ^ 2(2)")).toBe("16");
  });

  it("should have have higher precedence for exponentiation than implicit multiplication", () => {
    expect(calculate("2(1+2)^3")).toBe("54");
    expect(calculate("2(2)^2")).toBe("8");
  });

  it("should correctly handle a decimal", () => {
    expect(calculate("0.1")).toBe("0.1");
    expect(calculate("0.01")).toBe("0.01");
  });

  it("should correctly handle a decimal with implicit whole part", () => {
    expect(calculate(".1")).toBe("0.1");
    expect(calculate(".01")).toBe("0.01");
  });

  it("should correctly handle a decimal with precise representation", () => {
    expect(calculate("0.1", { format: "precise" })).toBe("1/10");
    expect(calculate("0.01", { format: "precise" })).toBe("1/100");
  });

  it("should correctly handle a fraction with precise representation", () => {
    expect(calculate("1/2", { format: "precise" })).toBe("1/2");
    expect(calculate("1/3", { format: "precise" })).toBe("1/3");
    expect(calculate("1/2 + 1/3", { format: "precise" })).toBe("5/6");
  });

  it("should correctly handle a decimal with implicit decimal part", () => {
    expect(calculate("1.")).toBe("1");
    expect(calculate("0.")).toBe("0");
    expect(calculate("10.")).toBe("10");
  });

  it("should correctly add 2 decimals", () => {
    expect(calculate("0.1 + 0.1")).toBe("0.2");
    expect(calculate("0.1 + 0.2")).toBe("0.3");
    expect(calculate("0.1 + 0.01")).toBe("0.11");
  });

  it("should correctly add a whole number with a decimal", () => {
    expect(calculate("1 + 0.2")).toBe("1.2");
    expect(calculate("0.3 + 2")).toBe("2.3");
  });

  it("should correctly multiply 2 decimals", () => {
    expect(calculate("0.5 * 0.5")).toBe("0.25");
    expect(calculate("0.1 * 0.2")).toBe("0.02");
  });

  function expectToPreserveCorrectness(expression: string) {
    expect(calculate(calculate(expression, { format: "precise" }))).toBe(
      calculate(expression),
    );
  }

  it("should correctly add 2 constants in precise mode", () => {
    expectToPreserveCorrectness("e + pi");
    expectToPreserveCorrectness("e + 1");
    expectToPreserveCorrectness("1 + pi");
    expectToPreserveCorrectness("e^2 + pi");
    expectToPreserveCorrectness("e + pi^2");
    expectToPreserveCorrectness("e^2 + pi^2");
    expectToPreserveCorrectness("e + e^2");
    expectToPreserveCorrectness("pi^2 + pi");
  });

  it("should correctly multiply 2 constants in precise mode", () => {
    expectToPreserveCorrectness("e * pi");
  });

  it("should correctly exponentiate 2 constants in precise mode", () => {
    expectToPreserveCorrectness("e ^ pi");
  });

  it("should correctly multiply a whole number with a decimal", () => {
    expect(calculate("2 * 0.5")).toBe("1");
    expect(calculate("0.3 * 7")).toBe("2.1");
  });

  it("should not throw MaximumPrecisionError for big scale", () => {
    // oxlint-disable-next-line prefer-template
    const bigDecimal = "0." + "0".repeat(20_000) + "1";
    expect(() => calculate(bigDecimal)).not.toThrow(MaximumPrecisionError);
  });

  it("should handle a simple exponentiation", () => {
    expect(calculate("2^5")).toBe("32");
    expect(calculate("3^3")).toBe("27");
  });

  it("should follow right-associativity for exponentiation", () => {
    expect(calculate("2^3^2")).toBe("512");
    expect(calculate("2^2^3")).toBe("256");
  });

  it("should have higher precedence for exponentiation", () => {
    expect(calculate("-2^2")).toBe("-4");
    expect(calculate("-2^2^3")).toBe("-256");
  });

  it("should handle negative exponentiation", () => {
    expect(calculate("2^-1")).toBe("0.5");
    expect(calculate("2^-2")).toBe("0.25");
    expect(calculate("-1^-1^-1")).toBe("-1");
  });

  it("should handle exponentiation with parantheses", () => {
    expect(calculate("(1)^1")).toBe("1");
    expect(calculate("1^(1)")).toBe("1");
    expect(calculate("(1)^(1)")).toBe("1");
    expect(calculate("(-1)^1")).toBe("-1");
    expect(calculate("1^(-1)")).toBe("1");
    expect(calculate("(-1)^(-1)")).toBe("-1");
    expect(calculate("(-1)^(-1)^(-1)")).toBe("-1");
    expect(calculate("(-1)^-1^(-1)")).toBe("-1");
    expect(calculate("(-1)^(-1)^-1")).toBe("-1");
  });

  it("should throw DivisionByZeroError for exponentiation of 0 to negative power", () => {
    expect(() => calculate("0 ^ -1")).toThrow(DivisionByZeroError);
  });

  it("should handle exponentiation of 0", () => {
    expect(calculate("0^0")).toBe("1");
    expect(calculate("0^1")).toBe("0");
    expect(calculate("0^0.5")).toBe("0");
    expect(calculate("0^(1/3)")).toBe("0");
    expect(calculate("0^(2/3)")).toBe("0");
    expect(calculate("0 ^ 1e100")).toBe("0");
  });

  it("should handle exponentiation of 1", () => {
    expect(calculate("1^0")).toBe("1");
    expect(calculate("1^1")).toBe("1");
    expect(calculate("1^0.5")).toBe("1");
    expect(calculate("1^(1/3)")).toBe("1");
    expect(calculate("1^(2/3)")).toBe("1");
    expect(calculate("1 ^ 1e100")).toBe("1");
  });

  it("should handle exponentiating to 0", () => {
    expect(calculate("0.5^0")).toBe("1");
    expect(calculate("(1/3)^0")).toBe("1");
    expect(calculate("(2/3)^0")).toBe("1");
    expect(calculate("1e100^0")).toBe("1");
  });

  it("should handle exponentiating to 1", () => {
    expect(calculate("0.5^1")).toBe("0.5");
    expect(calculate("2^1")).toBe("2");
  });

  it("should handle exponentiation of decimals in decimal mode", () => {
    const decimals = (maxDecimals: number) => ({
      format: "decimal" as const,
      maxDecimals,
    });
    expect(calculate("(1/3)^pi", decimals(12))).toBe("0.031701467835");
    expect(calculate("e^pi", decimals(12))).toBe("23.140692632779");
    expect(calculate("pi^(1/3)", decimals(15))).toBe("1.464591887561523");
    expect(calculate("sqrt(pi)", decimals(10))).toBe("1.7724538509");
  });

  it("should handle a simple remainder division", () => {
    expect(calculate("5 % 3")).toBe("2");
    expect(calculate("10 % 3")).toBe("1");
    expect(calculate("-25 % 7")).toBe("3");
    expect(calculate("-25 % -7")).toBe("-4");
  });

  it("should handle a remainder division with decimals", () => {
    expect(calculate("2.5 % 2")).toBe("0.5");
  });

  it("should throw DivisionByZeroError for remainder division by 0", () => {
    expect(() => calculate("1 % 0")).toThrow(DivisionByZeroError);
  });

  it("should handle scientific notation", () => {
    expect(calculate("1e2")).toBe("100");
    expect(calculate("1e-2")).toBe("0.01");
  });

  it("should handle scientific notation with decimal", () => {
    expect(calculate("1.2e3")).toBe("1200");
    expect(calculate("1.2e-3")).toBe("0.0012");
  });

  it("should handle scientific notation in precise mode", () => {
    expect(calculate("2e-2", { format: "precise" })).toBe("1/50");
    expect(calculate("1.2e-3", { format: "precise" })).toBe("3/2500");
  });

  it("should handle factorial", () => {
    expect(calculate("1!")).toBe("1");
    expect(calculate("5!")).toBe("120");
    expect(calculate("0!")).toBe("1");
  });

  it("should handle factorial of a big number", () => {
    const result = calculate("2000!");
    expect(result).toHaveLength(5736);
    expect(result).toStartWith("331627509245");
  });

  it("should handle factorial with implicit multiplication", () => {
    expect(calculate("(3!)(2)")).toBe("12");
    expect(calculate("3!(2)")).toBe("12");
    expect(calculate("3!2")).toBe("12");
    expect(calculate("3!2!")).toBe("12");
    expect(calculate("(3)!2")).toBe("12");
    expect(calculate("(3)!(2)")).toBe("12");
  });

  it("should handle absolute values using pipe operator", () => {
    expect(calculate("|2|")).toBe("2");
    expect(calculate("|-2|")).toBe("2");
  });

  it("should handle absolute values using abs function", () => {
    expect(calculate("abs(2)")).toBe("2");
    expect(calculate("abs(-2)")).toBe("2");
    expect(calculate("abs 2")).toBe("2");
    expect(calculate("abs -2")).toBe("2");
  });

  it("should handle floor function", () => {
    expect(calculate("floor(1)")).toBe("1");
    expect(calculate("floor(1.5)")).toBe("1");
    expect(calculate("floor(-1.5)")).toBe("-2");
    expect(calculate("floor(pi)")).toBe("3");
    expect(calculate("floor(e)")).toBe("2");
  });

  it("should handle ceil function", () => {
    expect(calculate("ceil(1)")).toBe("1");
    expect(calculate("ceil(1.5)")).toBe("2");
    expect(calculate("ceil(-1.5)")).toBe("-1");
    expect(calculate("ceil(pi)")).toBe("4");
    expect(calculate("ceil(e)")).toBe("3");
  });

  it("should handle floor function in precise mode", () => {
    expect(calculate("floor(pi)", { format: "precise" })).toBe("3");
    expect(calculate("floor(e)", { format: "precise" })).toBe("2");
    expect(calculate("floor(2pi)", { format: "precise" })).toBe("6");
    expect(calculate("floor(2e)", { format: "precise" })).toBe("5");
    expect(calculate("floor(pi^2)", { format: "precise" })).toBe("9");
    expect(calculate("floor(e^2)", { format: "precise" })).toBe("7");
    expect(calculate("floor(1/pi)", { format: "precise" })).toBe("0");
    expect(calculate("floor(1/e)", { format: "precise" })).toBe("0");
    expect(calculate("floor(sqrt(pi))", { format: "precise" })).toBe("1");
    expect(calculate("floor(sqrt(e))", { format: "precise" })).toBe("1");
  });

  it("should handle ceil function in precise mode", () => {
    expect(calculate("ceil(pi)", { format: "precise" })).toBe("4");
    expect(calculate("ceil(e)", { format: "precise" })).toBe("3");
    expect(calculate("ceil(2pi)", { format: "precise" })).toBe("7");
    expect(calculate("ceil(2e)", { format: "precise" })).toBe("6");
    expect(calculate("ceil(pi^2)", { format: "precise" })).toBe("10");
    expect(calculate("ceil(e^2)", { format: "precise" })).toBe("8");
    expect(calculate("ceil(1/pi)", { format: "precise" })).toBe("1");
    expect(calculate("ceil(1/e)", { format: "precise" })).toBe("1");
    expect(calculate("ceil(sqrt(pi))", { format: "precise" })).toBe("2");
    expect(calculate("ceil(sqrt(e))", { format: "precise" })).toBe("2");
  });

  it("should handle sqrt function", () => {
    expect(calculate("sqrt(0)")).toBe("0");
    expect(calculate("sqrt(1)")).toBe("1");
    expect(calculate("sqrt(16)")).toBe("4");
    expect(calculate("sqrt 16")).toBe("4");
  });

  it("should handle square root when using exponentiation", () => {
    expect(calculate("0 ^ (1/2)")).toBe("0");
    expect(calculate("1 ^ 0.5")).toBe("1");
    expect(calculate("16 ^ (1/2)")).toBe("4");
  });

  it("should handle square root of a fraction", () => {
    expect(calculate("sqrt(4/9)", { format: "precise" })).toBe("2/3");
    expect(calculate("sqrt(9/4)", { format: "precise" })).toBe("3/2");
    expect(calculate("(4/9) ^ (1/2)", { format: "precise" })).toBe("2/3");
    expect(calculate("(9/4) ^ (1/2)", { format: "precise" })).toBe("3/2");
  });

  it("should handle fractional exponentiation", () => {
    expect(calculate("8 ^ (1/3)")).toBe("2");
    expect(calculate("8 ^ (2/3)")).toBe("4");
    expect(calculate("32 ^ 0.2")).toBe("2");
    expect(calculate("343 ^ (1/3)")).toBe("7");
    expect(calculate("216 ^ (4/3)")).toBe("1296");
  });

  it("should handle negative fractional exponentiation", () => {
    expect(calculate("8 ^ (-1/3)")).toBe("0.5");
    expect(calculate("8 ^ (-2/3)")).toBe("0.25");
    expect(calculate("32 ^ -0.2")).toBe("0.5");
  });

  it("should handle fractional exponentiation of a negative number", () => {
    expect(calculate("(-8) ^ (1/3)")).toBe("-2");
    expect(calculate("(-8) ^ (2/3)")).toBe("4");
    expect(calculate("(-32) ^ 0.2")).toBe("-2");
    expect(calculate("(-343) ^ (1/3)")).toBe("-7");
    expect(calculate("(-216) ^ (4/3)")).toBe("1296");
  });

  it("should handle implicit multiplication with pipe operator", () => {
    expect(calculate("2|2|")).toBe("4");
    expect(calculate("2|-2|")).toBe("4");
    expect(calculate("-2|2|")).toBe("-4");
    expect(calculate("-2|-2|")).toBe("-4");
  });

  it("should handle nested pipe operators", () => {
    expect(calculate("| -5 + |-3| |")).toBe("2");
  });

  it("should handle a constant", () => {
    expect(calculate("pi", { format: "precise" })).toBe("pi");
    expect(calculate("e", { format: "precise" })).toBe("e");
    expect(calculate("3pi", { format: "precise" })).toBe("3pi");
    expect(calculate("3e", { format: "precise" })).toBe("3e");
    expect(calculate("+pi", { format: "precise" })).toBe("pi");
    expect(calculate("+e", { format: "precise" })).toBe("e");
    expect(calculate("-pi", { format: "precise" })).toBe("-pi");
    expect(calculate("-e", { format: "precise" })).toBe("-e");
    expect(calculate("0pi", { format: "precise" })).toBe("0");
    expect(calculate("0e", { format: "precise" })).toBe("0");
  });

  it("should handle a constant in decimal mode", () => {
    expect(calculate("pi")).toBe(PI);
    expect(calculate("e")).toBe(E);
  });

  it("should handle exponentiation of a constant in decimal mode", () => {
    expect(calculate("pi^2", { maxDecimals: 4 })).toBe("9.8696");
    expect(calculate("2pi^2", { maxDecimals: 4 })).toBe("19.7392");
    expect(calculate("pi^-1", { maxDecimals: 4 })).toBe("0.3183");
  });

  it("should handle exponentiation of a constant in precise mode", () => {
    expect(calculate("pi^1", { format: "precise" })).toBe("pi");
    expect(calculate("pi^2", { format: "precise" })).toBe("pi^2");
    expect(calculate("2pi^2", { format: "precise" })).toBe("2pi^2");
    expect(calculate("pi^-1", { format: "precise" })).toBe("1/pi");
    expect(calculate("-pi^2", { format: "precise" })).toBe("-pi^2");
    expect(calculate("abs(pi^2)", { format: "precise" })).toBe("pi^2");
  });

  it("should handle exponentiation of a constant to a fraction in precise mode", () => {
    expect(calculate("pi^(1/3)", { format: "precise" })).toBe("pi^(1/3)");
    expect(calculate("pi^(2/3)", { format: "precise" })).toBe("pi^(2/3)");
    expect(calculate("pi^(3/5)", { format: "precise" })).toBe("pi^(3/5)");
    expect(calculate("pi^(5/3)", { format: "precise" })).toBe("pi^(5/3)");
    expect(calculate("pi^(5/2)", { format: "precise" })).toBe("pi^(5/2)");
    expect(calculate("pi^(3/2)", { format: "precise" })).toBe("pi^(3/2)");
    expect(calculate("pi^(3/4)", { format: "precise" })).toBe("pi^(3/4)");
    expect(calculate("sqrt(pi)", { format: "precise" })).toBe("sqrt(pi)");
    expect(calculate("sqrt(pi) * sqrt(pi)", { format: "precise" })).toBe("pi");
    expect(calculate("sqrt(pi) * pi", { format: "precise" })).toBe("pi^(3/2)");
    expect(calculate("sqrt(pi) ^ 2", { format: "precise" })).toBe("pi");
    expect(calculate("sqrt(pi) ^ -1", { format: "precise" })).toBe(
      "1/sqrt(pi)",
    );
  });

  it("should handle multiplying constants in decimal mode", () => {
    expect(calculate("pi * pi", { maxDecimals: 4 })).toBe("9.8696");
    expect(calculate("2 * pi * pi", { maxDecimals: 4 })).toBe("19.7392");
  });

  it("should handle multiplying constants in precise mode", () => {
    expect(calculate("pi * pi", { format: "precise" })).toBe("pi^2");
    expect(calculate("2 * pi * pi", { format: "precise" })).toBe("2pi^2");
  });

  it("should handle division of a constant in precise mode", () => {
    expect(calculate("2pi^2 / 2", { format: "precise" })).toBe("pi^2");
    expect(calculate("pi^2 / pi", { format: "precise" })).toBe("pi");
    expect(calculate("pi^3 / pi", { format: "precise" })).toBe("pi^2");
    expect(calculate("pi / pi^2", { format: "precise" })).toBe("1/pi");
    expect(calculate("1/pi", { format: "precise" })).toBe("1/pi");
    expect(calculate("1/sqrt(pi)", { format: "precise" })).toBe("1/sqrt(pi)");
    expect(calculate("pi / sqrt(pi)", { format: "precise" })).toBe("sqrt(pi)");
    expect(calculate("sqrt(pi) / pi", { format: "precise" })).toBe(
      "1/sqrt(pi)",
    );
    expect(calculate("sqrt(pi) / 1", { format: "precise" })).toBe("sqrt(pi)");
    expect(calculate("sqrt(pi) / 2", { format: "precise" })).toBe("sqrt(pi)/2");
    expect(calculate("pi / 1", { format: "precise" })).toBe("pi");
    expect(calculate("pi / 2", { format: "precise" })).toBe("pi/2");
  });

  it("should handle exponentiation + addition of a constant in precise mode", () => {
    expect(calculate("0 + pi^2", { format: "precise" })).toBe("pi^2");
    expect(calculate("pi^2 + 0", { format: "precise" })).toBe("pi^2");
    expect(calculate("pi^2 + pi^2", { format: "precise" })).toBe("2pi^2");
  });

  it("should handle nth root of a constant in precise mode", () => {
    expect(calculate("(pi^3)^(1/3)", { format: "precise" })).toBe("pi");
    expect(calculate("(pi^6)^(1/3)", { format: "precise" })).toBe("pi^2");
  });

  it("should handle square root of a constant in precise mode", () => {
    expect(calculate("(pi^2)^0.5", { format: "precise" })).toBe("pi");
    expect(calculate("(pi^2)^(1/2)", { format: "precise" })).toBe("pi");
    expect(calculate("sqrt(pi^2)", { format: "precise" })).toBe("pi");
  });

  it("should handle simple division of constants", () => {
    expect(calculate("pi/pi")).toBe("1");
    expect(calculate("e/e")).toBe("1");
    expect(calculate("2pi/2pi")).toBe("1");
    expect(calculate("2e/2e")).toBe("1");
    expect(calculate("2pi/pi")).toBe("2");
    expect(calculate("2e/e")).toBe("2");
    expect(calculate("pi/2pi")).toBe("0.5");
    expect(calculate("e/2e")).toBe("0.5");
  });

  it("should handle division of constants", () => {
    expect(calculate("pi / 1", { format: "precise" })).toBe("pi");
    expect(calculate("e / 1", { format: "precise" })).toBe("e");
    expect(calculate("2pi / 1", { format: "precise" })).toBe("2pi");
    expect(calculate("2e / 1", { format: "precise" })).toBe("2e");
    expect(calculate("2pi / 2", { format: "precise" })).toBe("pi");
    expect(calculate("2e / 2", { format: "precise" })).toBe("e");
    expect(calculate("6pi / 2", { format: "precise" })).toBe("3pi");
    expect(calculate("6e / 2", { format: "precise" })).toBe("3e");
    expect(calculate("pi / 2", { format: "precise" })).toBe("pi/2");
    expect(calculate("e / 2", { format: "precise" })).toBe("e/2");
    expect(calculate("6pi / 9", { format: "precise" })).toBe("2pi/3");
    expect(calculate("6e / 9", { format: "precise" })).toBe("2e/3");
  });

  it("should handle addition of constants", () => {
    expect(calculate("pi + pi", { format: "precise" })).toBe("2pi");
    expect(calculate("e + e", { format: "precise" })).toBe("2e");
    expect(calculate("2pi + 3pi", { format: "precise" })).toBe("5pi");
    expect(calculate("2e + 3e", { format: "precise" })).toBe("5e");
    expect(calculate("pi + 0", { format: "precise" })).toBe("pi");
    expect(calculate("0 + pi", { format: "precise" })).toBe("pi");
    expect(calculate("e + 0", { format: "precise" })).toBe("e");
    expect(calculate("0 + e", { format: "precise" })).toBe("e");
  });

  it("should handle subtraction of constants", () => {
    expect(calculate("2pi - pi", { format: "precise" })).toBe("pi");
    expect(calculate("5e - 3e", { format: "precise" })).toBe("2e");
    expect(calculate("pi - pi", { format: "precise" })).toBe("0");
    expect(calculate("e - e", { format: "precise" })).toBe("0");
    expect(calculate("pi - 0", { format: "precise" })).toBe("pi");
    expect(calculate("0 - pi", { format: "precise" })).toBe("-pi");
    expect(calculate("e - 0", { format: "precise" })).toBe("e");
    expect(calculate("0 - e", { format: "precise" })).toBe("-e");
  });

  it("should handle subtraction and addition of constants", () => {
    expect(calculate("pi - pi + e", { format: "precise" })).toBe("e");
    expect(calculate("e - e + pi", { format: "precise" })).toBe("pi");
  });

  it("should handle multiplication and addition of constants", () => {
    expect(calculate("0pi + e", { format: "precise" })).toBe("e");
    expect(calculate("0e + pi", { format: "precise" })).toBe("pi");
  });

  it("should handle division and addition of constants", () => {
    expect(calculate("0/pi + e", { format: "precise" })).toBe("e");
    expect(calculate("0/e + pi", { format: "precise" })).toBe("pi");
  });

  it("should handle multiplication of constants", () => {
    expect(calculate("2 * pi", { format: "precise" })).toBe("2pi");
    expect(calculate("2 * e", { format: "precise" })).toBe("2e");
    expect(calculate("pi * 2", { format: "precise" })).toBe("2pi");
    expect(calculate("e * 2", { format: "precise" })).toBe("2e");
    expect(calculate("0 * pi", { format: "precise" })).toBe("0");
    expect(calculate("0 * e", { format: "precise" })).toBe("0");
    expect(calculate("pi * 0", { format: "precise" })).toBe("0");
    expect(calculate("e * 0", { format: "precise" })).toBe("0");
  });

  it("should handle exponentiation of constants", () => {
    expect(calculate("pi ^ 0", { format: "precise" })).toBe("1");
    expect(calculate("e ^ 0", { format: "precise" })).toBe("1");
    expect(calculate("pi ^ 1", { format: "precise" })).toBe("pi");
    expect(calculate("e ^ 1", { format: "precise" })).toBe("e");
  });

  it("should handle a constant with pipe operator", () => {
    expect(calculate("|pi|", { format: "precise" })).toBe("pi");
    expect(calculate("|e|", { format: "precise" })).toBe("e");
    expect(calculate("|-pi|", { format: "precise" })).toBe("pi");
    expect(calculate("|-e|", { format: "precise" })).toBe("e");
  });

  it("should handle adding big fractions", () => {
    const expr = `1/1e200000 + 1/1e200001 + 1/1e200002`;
    expect(calculate(expr, { maxDecimals: 500 })).toBe("0");
  }, 200);

  describe("OverflowError", () => {
    it("should not throw for not large factorial", () => {
      expect(() => calculate("10000!")).not.toThrow(RangeError);
      expect(() => calculate("10000!")).not.toThrow(OverflowError);
    }, 200);

    describe("should not throw OverflowError for not large exponentiation", () => {
      expect(() => calculate("(10^2e5)^10")).not.toThrow(OverflowError);
    });

    it("should not throw OverflowError for exponentiating decimal", () => {
      expect(() => calculate("e^2")).not.toThrow(OverflowError);
    });

    it("should not throw OverflowError for calculatable results", () => {
      const overflowing = "(10^1e10)";

      expect(() => calculate(`0 * ${overflowing}`)).not.toThrow(OverflowError);
      expect(calculate(`0 * ${overflowing}`)).toBe("0");

      expect(() => calculate(`1 ^ ${overflowing}`)).not.toThrow(OverflowError);
      expect(calculate(`1 ^ ${overflowing}`)).toBe("1");

      expect(() => calculate(`${overflowing} ^ 0`)).not.toThrow(OverflowError);
      expect(calculate(`${overflowing} ^ 0`)).toBe("1");
    });
  });
});

describe("evaluate - error handling", () => {
  it("should throw MismatchedParenthesisError for extra closing parenthesis", () => {
    expect(() => calculate("1 + 2)")).toThrow(MismatchedParenthesisError);
  });

  it("should throw EmptyExpressionError for empty expression", () => {
    expect(() => calculate("")).toThrow(EmptyExpressionError);
  });

  it("should throw MaximumPrecisionError for very large scale", () => {
    // oxlint-disable-next-line prefer-template
    const hugeDecimal = "0." + "0".repeat(100_000) + "1";
    expect(() => calculate(hugeDecimal)).toThrow(MaximumPrecisionError);
    // oxlint-disable-next-line prefer-template
    const bigNumber = "1" + "0".repeat(100_000);
    expect(() => calculate(`1e${bigNumber}`)).toThrow(MaximumPrecisionError);
  }, 200);

  describe("OverflowError", () => {
    it("should throw OverflowError for large factorial", () => {
      expect(() => calculate("(1e9)!")).toThrow(OverflowError);
      expect(() => calculate("(10^6)!")).toThrow(OverflowError);
      expect(() => calculate("1e5!")).toThrow(OverflowError);
      expect(() => calculate("50000!")).toThrow(OverflowError);
      expect(() => calculate("25000!")).toThrow(OverflowError);
    }, 200);

    it("should throw OverflowError for very large exponentiation", () => {
      expect(() => calculate("3e5!^5")).toThrow(OverflowError);
      expect(() => calculate("(10^2000)^100")).toThrow(OverflowError);
      expect(() => calculate("(10^2e5)^1000")).toThrow(OverflowError);
      expect(() => calculate("1e10000000")).toThrow(OverflowError);
      expect(() => calculate("10^10^10")).toThrow(OverflowError);
    }, 200);

    it("should throw OverflowError when further handling overflowing numbers", () => {
      expect(() => calculate("-10^10^10")).toThrow(OverflowError);
      expect(() => calculate("abs(10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("ceil(10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("floor(10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("sqrt(10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("(10^10^10)!")).toThrow(OverflowError);
      expect(() => calculate("(10^10^10) + 1")).toThrow(OverflowError);
      expect(() => calculate("(10^10^10) ^ 10")).toThrow(OverflowError);
      expect(() => calculate("10 ^ (10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("|(10^10^10)|")).toThrow(OverflowError);
    }, 200);
  });
});

describe.skipIf(win32)("evaluate - large operations", () => {
  describe("adding a lot of numbers", () => {
    const getTest = (numbers: number) => {
      // oxlint-disable-next-line prefer-template
      const expression = "1 + ".repeat(numbers) + "0";
      it(`should handle adding ${numbers} numbers`, () => {
        expect(calculate(expression)).toBe(`${numbers}`);
      }, 2000);
    };
    getTest(100);
    getTest(1000);
    getTest(10_000);
    getTest(100_000);
    getTest(1000_000);
  });

  describe("multiplying a lot of numbers", () => {
    const getTest = (numbers: number) => {
      // oxlint-disable-next-line prefer-template
      const expression = "1 * ".repeat(numbers) + "1";
      it(`should handle multiplying ${numbers} numbers`, () => {
        expect(calculate(expression)).toBe("1");
      }, 2000);
    };
    getTest(100);
    getTest(1000);
    getTest(10_000);
    getTest(100_000);
    getTest(1000_000);
  });

  describe("exponentiating a lot of numbers", () => {
    const getTest = (numbers: number) => {
      // oxlint-disable-next-line prefer-template
      const expression = "1 ^ ".repeat(numbers) + "1";
      it(`should handle exponentiating ${numbers} numbers`, () => {
        expect(calculate(expression)).toBe("1");
      }, 2000);
    };
    getTest(100);
    getTest(1000);
    getTest(10_000);
    getTest(100_000);
    getTest(1000_000);
  });

  describe("adding and multiplying a lot of numbers", () => {
    const getTest = (numbers: number) => {
      // oxlint-disable-next-line prefer-template
      const expression = "1 * 1 + ".repeat(numbers) + "0";
      it(`should handle adding and multiplying ${numbers} numbers`, () => {
        expect(calculate(expression)).toBe(`${numbers}`);
      }, 2000);
    };
    getTest(100);
    getTest(1000);
    getTest(10_000);
    getTest(100_000);
    getTest(1000_000);
  });

  describe("a lot of parentheses", () => {
    const getTest = (n: number) => {
      // oxlint-disable-next-line prefer-template
      const expression = "(".repeat(n) + "0" + ")".repeat(n);
      it(`should handle ${n} parentheses`, () => {
        expect(() => calculate(expression)).not.toThrow();
        expect(calculate(expression)).toBe("0");
      }, 2000);
    };
    getTest(100);
    getTest(1000);
    getTest(10_000);
    getTest(100_000);
    getTest(1000_000);
  });

  it("should not throw MaximumPrecisionError for adding big scales", () => {
    // oxlint-disable-next-line prefer-template
    const hugeDecimal1 = "0." + "0".repeat(5_000) + "1";
    // oxlint-disable-next-line prefer-template
    const hugeDecimal2 = "0." + "0".repeat(10_000) + "1";
    expect(() => calculate(`${hugeDecimal1} + ${hugeDecimal2}`)).not.toThrow(
      MaximumPrecisionError,
    );
  }, 2000);

  describe("adding many big fractions", () => {
    const BASE = 200_000;
    const FRACTIONS = 25;

    let expr = `1/1e${BASE}`;
    for (let i = 1; i < FRACTIONS; i++) {
      expr += ` + 1/1e${BASE + i}`;
    }

    it(`should handle adding ${FRACTIONS} big fractions`, () => {
      expect(calculate(expr, { maxDecimals: 500 })).toBe("0");
    }, 2000);
  });
});
