import { describe, it, expect } from "bun:test";

import {
  DivisionByZeroError,
  EmptyExpressionError,
  InterpreterRangeError,
  MaximumPrecisionError,
  OverflowError,
} from "#lib/errors";
import { calculate } from "#src";

const win32 = process.platform === "win32";

function safe<T>(fn: () => T) {
  try {
    return fn();
  } catch (e) {
    return e;
  }
}

const PI_TO_72_DECIMALS =
  "3.141592653589793238462643383279502884197169399375105820974944592307816406";
const E_TO_72_DECIMALS =
  "2.71828182845904523536028747135266249775724709369995957496696762772407663";
const LN_2_TO_100_DECIMALS =
  "0.6931471805599453094172321214581765680755001343602552541206800094933936219696947156058633269964186875";
const EXP_PI_TO_110_DECIMALS =
  "23.1406926327792690057290863679485473802661062426002119934450464095243423506904527835169719970675492196759527048";
const PI_SQUARED_TO_50_DECIMALS =
  "9.86960440108935861883449099987615113531369940724079";
const DOUBLE_OF_PI_SQUARED_TO_50_DECIMALS =
  "19.73920880217871723766898199975230227062739881448158";

describe("evaluate", () => {
  it("should handle a number", () => {
    expect(calculate("1")).toBe("1");
  });

  it("should handle a simple addition", () => {
    expect(calculate("1 + 1")).toBe("2");
  });

  it("should handle a simple positive number", () => {
    expect(calculate("+1")).toBe("1");
    expect(calculate("+0")).toBe("0");
  });

  it("should handle a simple negation", () => {
    expect(calculate("-1")).toBe("-1");
    expect(calculate("-0")).toBe("0");
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

  describe("operation precedence order", () => {
    it("should respect operator precedence (PEMDAS/BODMAS)", () => {
      expect(calculate("1 + 2 * 3")).toBe("7");
      expect(calculate("2 * 3 + 1")).toBe("7");
      expect(calculate("10 - 2 * 4")).toBe("2");
      expect(calculate("10 * 2 - 4")).toBe("16");
      expect(calculate("1 + 5 % 3")).toBe("3");
    });

    it("should handle order of implicit multiplication", () => {
      expect(calculate("2 + 2(1 + 1)")).toBe("6");
      expect(calculate("8 - 2(1 + 2)")).toBe("2");
      expect(calculate("2 * 2(1 + 2)")).toBe("12");
      expect(calculate("6 / 2(1 + 2)")).toBe("1");
    });

    it("should handle order of exponentiation", () => {
      expect(calculate("-2^2")).toBe("-4");
      expect(calculate("-2^2^3")).toBe("-256");
    });

    it("should handle order of functions", () => {
      expect(calculate("sqrt 4 + 5")).toBe("7");
      expect(calculate("sqrt 4 * 4")).toBe("8");
      expect(calculate("sqrt(4 + 5)")).toBe("3");
      expect(calculate("sqrt(4 * 4)")).toBe("4");

      expect(calculate("abs -2")).toBe("2");
      expect(calculate("abs(-2)")).toBe("2");
      expect(calculate("-abs 2")).toBe("-2");
      expect(calculate("-abs(2)")).toBe("-2");
    });

    it("should handle order of implicit multiplication with exponentiation", () => {
      expect(calculate("2 ^ 3(1+2)")).toBe("512");
      expect(calculate("2 ^ 2(2)")).toBe("16");
      expect(calculate("2(1+2)^3")).toBe("54");
      expect(calculate("2(2)^2")).toBe("8");
    });

    it("should handle order of exponentiation with factorial", () => {
      expect(calculate("3!^3")).toBe("216");
      expect(calculate("3^3!")).toBe("729");
    });

    it("should handle order of functions with factorial", () => {
      expect(calculate("( sqrt(4) )!")).toBe("2");
      expect(calculate("sqrt(4) !")).toBe("2");
      expect(calculate("sqrt(4!)", { maxDecimals: 12 })).toBe("4.898979485566");
      expect(calculate("sqrt 4!", { maxDecimals: 12 })).toBe("4.898979485566");
    });

    it("should handle order of functions with implicit multiplication", () => {
      expect(calculate("sqrt(4)2")).toBe("4");
      expect(calculate("sqrt 2(2)")).toBe("2");
      expect(calculate("sqrt(2(2))")).toBe("2");
    });

    it("should handle order of functions with exponentiation", () => {
      expect(calculate("ln e^2")).toBe("2");
      expect(calculate("ln(e^2)")).toBe("2");
      expect(calculate("ln(e)^2")).toBe("1");
      expect(calculate("(ln e)^2")).toBe("1");
    });
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

  it("should handle double negatives", () => {
    expect(calculate("-(1/-1)")).toBe("1");
    expect(calculate("0 - (1/-1)")).toBe("1");
    expect(calculate("-1 - (2/-1)")).toBe("1");
  });

  it("should handle implicit multiplication", () => {
    expect(calculate("2(2)")).toBe("4");
    expect(calculate("2(3+4)")).toBe("14");
    expect(calculate("(1+2)(3+4)")).toBe("21");
  });

  it("should allow missing open and closing parenthesis", () => {
    expect(calculate("(1 + 2")).toBe("3");
    expect(calculate("1 + 2)")).toBe("3");
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

  it("should correctly handle rounding modes", () => {
    expect(calculate("2/3", { maxDecimals: 3 })).toBe("0.667");
    expect(calculate("2/3", { roundingMode: "round", maxDecimals: 3 })).toBe(
      "0.667",
    );
    expect(calculate("2/3", { roundingMode: "truncate", maxDecimals: 3 })).toBe(
      "0.666",
    );

    expect(
      calculate("999/1000", { roundingMode: "round", maxDecimals: 2 }),
    ).toBe("1");
    expect(
      calculate("999/1000", { roundingMode: "truncate", maxDecimals: 2 }),
    ).toBe("0.99");

    expect(calculate("-2/3", { roundingMode: "round", maxDecimals: 3 })).toBe(
      "-0.667",
    );
    expect(
      calculate("-2/3", { roundingMode: "truncate", maxDecimals: 3 }),
    ).toBe("-0.666");

    expect(calculate("sqrt(2) * sqrt(2)")).toBe("2");
  });

  function expectWithRoundtrip(expression: string, expected: string) {
    expect(
      calculate(expression),
      `Failed to evaluate '${expression}' correctly`,
    ).toBe(expected);

    expect(
      calculate(calculate(expression, { format: "precise" })),
      `Failed to roundtrip via precise mode for '${expression}' correctly`,
    ).toBe(expected);
  }

  it("should correctly handle operations with 2 different constants", () => {
    expectWithRoundtrip("e + 1", "3.718281828459045235360287471353");
    expectWithRoundtrip("1 + pi", "4.14159265358979323846264338328");

    expectWithRoundtrip("e + e^2", "10.107337927389695462590714931928");
    expectWithRoundtrip("pi^2 +pi", "13.011197054679151857297134383156");

    expectWithRoundtrip("e + pi", "5.859874482048838473822930854632");
    expectWithRoundtrip("pi + e", "5.859874482048838473822930854632");

    expectWithRoundtrip("e - pi", "-0.423310825130748003102355911927");
    expectWithRoundtrip("pi - e", "0.423310825130748003102355911927");

    expectWithRoundtrip("e^2 + pi", "10.530648752520443465693070843855");
    expectWithRoundtrip("e + pi^2", "12.587886229548403854194778471229");

    expectWithRoundtrip("e^2 + pi^2", "17.258660500020008846064918460451");

    expectWithRoundtrip("e * pi", "8.539734222673567065463550869547");
    expectWithRoundtrip("pi * e", "8.539734222673567065463550869547");

    expectWithRoundtrip("e / pi", "0.865255979432265087217774789646");
    expectWithRoundtrip("pi / e", "1.155727349790921717910093183313");

    expectWithRoundtrip("e ^ pi", "23.140692632779269005729086367949");
    expectWithRoundtrip("pi ^ e", "22.459157718361045473427152204544");

    expectWithRoundtrip("e % pi", "2.718281828459045235360287471353");
    expectWithRoundtrip("pi % e", "0.423310825130748003102355911927");
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
    expect(calculate("(1/3)^pi", { maxDecimals: 40 })).toBe(
      "0.0317014678351419047094871568993193259637",
    );
    expect(calculate("e^pi", { maxDecimals: 110 })).toBe(
      EXP_PI_TO_110_DECIMALS,
    );
    expect(calculate("pi^(1/3)", { maxDecimals: 15 })).toBe(
      "1.464591887561523",
    );
    expect(calculate("sqrt(pi)", { maxDecimals: 10 })).toBe("1.7724538509");
  });

  it("should handle a simple remainder division", () => {
    expect(calculate("5 % 3")).toBe("2");
    expect(calculate("10 % 3")).toBe("1");
    expect(calculate("-25 % 7")).toBe("3");
    expect(calculate("-25 % -7")).toBe("-4");
  });

  it("should handle a remainder division with decimals", () => {
    expect(calculate("2.5 % 2")).toBe("0.5");
    expect(safe(() => calculate("pi % 2"))).not.toBeOneOf(["0", "1"]);
    expect(safe(() => calculate("e % 2"))).not.toBeOneOf(["0", "1"]);
    expect(
      safe(() => calculate("pi % 2", { format: "precise" })),
    ).not.toBeOneOf(["0", "1"]);
    expect(safe(() => calculate("e % 2", { format: "precise" }))).not.toBeOneOf(
      ["0", "1"],
    );
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
    expect(safe(() => calculate("(-1)!"))).not.toBe("-1");
    expect(safe(() => calculate("(pi)!"))).not.toBe("1");
    expect(safe(() => calculate("(e)!"))).not.toBe("1");
    expect(safe(() => calculate("(pi)!", { format: "precise" }))).not.toBe("1");
    expect(safe(() => calculate("(e)!", { format: "precise" }))).not.toBe("1");
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
    expect(calculate("(2)3!")).toBe("12");
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

  it("should handle arctan function", () => {
    expect(calculate("arctan(0)")).toBe("0");
    expect(calculate("arctan(1/5)", { maxDecimals: 50 })).toBe(
      "0.19739555984988075837004976519479029344758510378785",
    );
    expect(calculate("arctan(1/239)", { maxDecimals: 50 })).toBe(
      "0.00418407600207472386453821495928545274104806530763",
    );
    expect(calculate("4arctan(1)", { maxDecimals: 72 })).toBe(
      PI_TO_72_DECIMALS,
    );
    expect(calculate("arctan(2)", { maxDecimals: 64 })).toBe(
      "1.1071487177940905030170654601785370400700476454014326466765392074",
    );
    expect(calculate("arctan(-2)", { maxDecimals: 64 })).toBe(
      "-1.1071487177940905030170654601785370400700476454014326466765392074",
    );
    expect(calculate("arctan(4/5)", { maxDecimals: 50 })).toBe(
      "0.67474094222355266305652097360981361507400625484071",
    );
    expect(calculate("arctan(-4/5)", { maxDecimals: 50 })).toBe(
      "-0.67474094222355266305652097360981361507400625484071",
    );
  }, 200);

  it("should handle arctanh function", () => {
    expect(calculate("arctanh(0)")).toBe("0");
    expect(calculate("arctanh(0.5)", { maxDecimals: 100 })).toBe(
      "0.5493061443340548456976226184612628523237452789113747258673471668187471466093044834368078774068660444",
    );
    expect(calculate("arctanh(-1/2)", { maxDecimals: 100 })).toBe(
      "-0.5493061443340548456976226184612628523237452789113747258673471668187471466093044834368078774068660444",
    );
    expect(calculate("2arctanh(1/3)", { maxDecimals: 100 })).toBe(
      LN_2_TO_100_DECIMALS,
    );
    expect(calculate("arctanh(-0.9)", { maxDecimals: 100 })).toBe(
      "-1.4722194895832202300045137159439267686186896306495644092689801182046463510320986443570791919078699479",
    );
  }, 200);

  it("should handle ln function", () => {
    expect(calculate("ln(1)")).toBe("0");
    expect(calculate("ln(e)")).toBe("1");
    expect(calculate("ln(2)", { maxDecimals: 100 })).toBe(LN_2_TO_100_DECIMALS);

    expectWithRoundtrip("1e50 (1-ln(e))", "0");
    expectWithRoundtrip("1e50 (0.5-ln(e^0.5))", "0");
    expectWithRoundtrip("1e50 (0.25-ln(e^0.25))", "0");

    expect(calculate("ln(1e100)", { maxDecimals: 200 })).toBe(
      "230.25850929940456840179914546843642076011014886287729760333279009675726096773524802359972050895982983419677840422862486334095254650828067566662873690987816894829072083255546808437998948262331985283935053",
    );

    expect(calculate("ln(pi)", { maxDecimals: 15 })).toBe("1.1447298858494");
    expect(calculate("ln(2pi)", { maxDecimals: 10 })).toBe("1.8378770664");
    expect(calculate("ln(2e)", { maxDecimals: 15 })).toBe("1.693147180559945");

    expect(calculate("ln(-(1/-1))")).toBe("0");
  }, 200);

  it("should handle exp function", () => {
    expect(calculate("exp(0)")).toBe("1");
    expect(calculate("exp(1)", { maxDecimals: 72 })).toBe(E_TO_72_DECIMALS);
    expect(calculate("exp(1)", { format: "precise" })).toBe("e");
    expect(calculate("exp(2)", { format: "precise" })).toBe("e^2");
    expect(calculate("exp(pi)", { maxDecimals: 110 })).toBe(
      EXP_PI_TO_110_DECIMALS,
    );
  }, 200);

  describe("sin and cos", () => {
    it("should handle sin function", () => {
      expect(calculate("sin(1)", { maxDecimals: 50 })).toBe(
        "0.84147098480789650665250232163029899962256306079837",
      );
      expect(calculate("sin(1/2)", { maxDecimals: 40 })).toBe(
        "0.4794255386042030002732879352155713880818",
      );
      expect(calculate("sin(-1)", { maxDecimals: 50 })).toBe(
        "-0.84147098480789650665250232163029899962256306079837",
      );

      expect(calculate("sin(-pi)")).toBe("0");
      expect(calculate("sin(-pi/2)")).toBe("-1");
      expect(calculate("sin(0)")).toBe("0");
      expect(calculate("sin(pi/2)")).toBe("1");
      expect(calculate("sin(pi)")).toBe("0");
      expect(calculate("sin(3pi/2)")).toBe("-1");
      expect(calculate("sin(2pi)")).toBe("0");
      expect(calculate("sin(1e100pi)")).toBe("0");

      expect(calculate("sin(e)", { maxDecimals: 40 })).toBe(
        "0.4107812905029086954760094920183605918883",
      );
      expect(calculate("sin(.1pi)")).toBe("0.309016994374947424102293417183");
    }, 200);

    it("should handle cos function", () => {
      expect(calculate("cos(1)", { maxDecimals: 40 })).toBe(
        "0.5403023058681397174009366074429766037323",
      );
      expect(calculate("cos(1/2)", { maxDecimals: 50 })).toBe(
        "0.87758256189037271611628158260382965199164519710974",
      );
      expect(calculate("cos(-1)", { maxDecimals: 40 })).toBe(
        "0.5403023058681397174009366074429766037323",
      );

      expect(calculate("cos(-pi)")).toBe("-1");
      expect(calculate("cos(-pi/2)")).toBe("0");
      expect(calculate("cos(0)")).toBe("1");
      expect(calculate("cos(pi/2)")).toBe("0");
      expect(calculate("cos(pi)")).toBe("-1");
      expect(calculate("cos(3pi/2)")).toBe("0");
      expect(calculate("cos(2pi)")).toBe("1");
      expect(calculate("cos(1e100pi)")).toBe("1");

      expect(calculate("cos(e)", { maxDecimals: 40 })).toBe(
        "-0.9117339147869650978937173178054318452504",
      );
      expect(calculate("cos(.1pi)")).toBe("0.951056516295153572116439333379");
    }, 200);
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

  it("should handle arctan function in precise mode", () => {
    expect(calculate("arctan(1)", { format: "precise" })).toBe("pi/4");
    expect(calculate("4arctan(1)", { format: "precise" })).toBe("pi");
    expect(calculate("-2arctan(1)", { format: "precise" })).toBe("-pi/2");
    expect(calculate("2arctan(-1)", { format: "precise" })).toBe("-pi/2");
  }, 200);

  it("should handle sqrt function", () => {
    expect(calculate("sqrt(0)")).toBe("0");
    expect(calculate("sqrt(1)")).toBe("1");
    expect(calculate("sqrt(16)")).toBe("4");
    expect(calculate("sqrt 16")).toBe("4");

    expect(safe(() => calculate("sqrt(-1)"))).not.toBe("-1");
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

  it("should handle multiplication of constants with fractional exponent", () => {
    expect(calculate("2pi^1.5", { format: "precise" })).toBe("2pi^(3/2)");
    expect(calculate("2sqrt(pi)", { format: "precise" })).toBe("2sqrt(pi)");
    expect(calculate("2pi^-0.5", { format: "precise" })).toBe("2/sqrt(pi)");
  });

  it("should handle division of constants with fractional exponent", () => {
    expect(calculate("2/pi^1.5", { format: "precise" })).toBe("2/pi^(3/2)");
    expect(calculate("2/sqrt(pi)", { format: "precise" })).toBe("2/sqrt(pi)");
    expect(calculate("2/pi^0.5", { format: "precise" })).toBe("2/sqrt(pi)");
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
    expect(calculate("(-1e-101) ^ (1/101)")).toBe("-0.1");
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
    expect(calculate("pi", { maxDecimals: 72 })).toBe(PI_TO_72_DECIMALS);
    expect(calculate("e", { maxDecimals: 72 })).toBe(E_TO_72_DECIMALS);
    expect(calculate("1pi", { maxDecimals: 72 })).toBe(PI_TO_72_DECIMALS);
    expect(calculate("1e", { maxDecimals: 72 })).toBe(E_TO_72_DECIMALS);
  });

  it("should handle a constant in precise mode", () => {
    expect(calculate("pi", { format: "precise" })).toBe("pi");
    expect(calculate("e", { format: "precise" })).toBe("e");
    expect(calculate("1pi", { format: "precise" })).toBe("pi");
    expect(calculate("1e", { format: "precise" })).toBe("e");
  });

  it("should handle exponentiation of a constant in decimal mode", () => {
    expect(calculate("pi^2", { maxDecimals: 50 })).toBe(
      PI_SQUARED_TO_50_DECIMALS,
    );
    expect(calculate("2pi^2", { maxDecimals: 50 })).toBe(
      DOUBLE_OF_PI_SQUARED_TO_50_DECIMALS,
    );
    expect(calculate("pi^-1", { maxDecimals: 80 })).toBe(
      "0.31830988618379067153776752674502872406891929148091289749533468811779359526845307",
    );
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
    expect(calculate("pi^(1/1000)", { format: "precise" })).toBe("pi^(1/1000)");
    expect(calculate("exp(1/1000)", { format: "precise" })).toBe("e^(1/1000)");
    expect(calculate("sqrt(pi)", { format: "precise" })).toBe("sqrt(pi)");
    expect(calculate("sqrt(pi) * sqrt(pi)", { format: "precise" })).toBe("pi");
    expect(calculate("sqrt(pi) * pi", { format: "precise" })).toBe("pi^(3/2)");
    expect(calculate("sqrt(pi) ^ 2", { format: "precise" })).toBe("pi");
    expect(calculate("sqrt(pi) ^ -1", { format: "precise" })).toBe(
      "1/sqrt(pi)",
    );
  });

  it("should handle multiplying constants in decimal mode", () => {
    expect(calculate("pi * pi", { maxDecimals: 50 })).toBe(
      PI_SQUARED_TO_50_DECIMALS,
    );
    expect(calculate("2 * pi * pi", { maxDecimals: 50 })).toBe(
      DOUBLE_OF_PI_SQUARED_TO_50_DECIMALS,
    );
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
    expect(calculate("pi / 2pi", { format: "precise" })).toBe("1/2");
    expect(calculate("2pi / pi", { format: "precise" })).toBe("2");
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
    expect(calculate("pi * pi^-1", { format: "precise" })).toBe("1");
    expect(calculate("pi^-1 * pi", { format: "precise" })).toBe("1");
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

  it("should handle exponentiation of -1 to an integer exponent", () => {
    expect(calculate("(-1)^0")).toBe("1");
    expect(calculate("(-1)^1")).toBe("-1");
    expect(calculate("(-1)^2")).toBe("1");
    expect(calculate("(-1)^3")).toBe("-1");
  });

  it("should handle exponentiation of -1 to a decimal exponent", () => {
    expect(calculate("(-1)^(2/3)")).toBe("1");
    expect(calculate("(-1)^.4")).toBe("1");
    expect(calculate("(-1)^(1/3)")).toBe("-1");
    expect(calculate("(-1)^(1/101)")).toBe("-1");
    expect(calculate("(-1)^.2")).toBe("-1");

    expect(safe(() => calculate("(-1)^0.5"))).not.toBe("-1");
    expect(safe(() => calculate("(-1)^(1/2)"))).not.toBe("-1");
    expect(safe(() => calculate("(-1)^(1/100)"))).not.toBe("-1");
    expect(safe(() => calculate("(-1)^(3/4)"))).not.toBe("-1");
  });

  it("should handle exponentiation of -1 to a reasonable exponent", () => {
    expect(calculate("(-1)^(10^50)")).toBe("1");
    expect(calculate("(-1)^1e50")).toBe("1");
    expect(calculate("(-1)^(10^5000)")).toBe("1");
    expect(calculate("(-1)^1e5000")).toBe("1");
  });

  it("should handle adding big fractions", () => {
    const expr = `1/1e200000 + 1/1e200001`;
    expect(calculate(expr, { maxDecimals: 500 })).toBe("0");
  }, 200);

  describe("OverflowError", () => {
    it("should not throw for not large factorial", () => {
      expect(() => calculate("10000!")).not.toThrow(RangeError);
      expect(() => calculate("10000!")).not.toThrow(OverflowError);
    }, 200);

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
  it("should throw EmptyExpressionError for empty expression", () => {
    expect(() => calculate("")).toThrow(EmptyExpressionError);
    expect(() => calculate(" ")).toThrow(EmptyExpressionError);
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
      expect(() => calculate("arctan(10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("(10^10^10)!")).toThrow(OverflowError);
      expect(() => calculate("(10^10^10) + 1")).toThrow(OverflowError);
      expect(() => calculate("(10^10^10) ^ 10")).toThrow(OverflowError);
      expect(() => calculate("10 ^ (10^10^10)")).toThrow(OverflowError);
      expect(() => calculate("|(10^10^10)|")).toThrow(OverflowError);
      expect(() => calculate("10^10^10^10 % 9^9^9^9")).toThrow(OverflowError);
    }, 200);
  });

  it("should throw InterpreterRangeError for invalid function inputs", () => {
    expect(() => calculate("arctanh(1)")).toThrow(InterpreterRangeError);
    expect(() => calculate("arctanh(-2)")).toThrow(InterpreterRangeError);
  });
});

describe.skipIf(win32)("evaluate - large operations", () => {
  describe("large exponentiation", () => {
    it("should not throw OverflowError for not large exponentiation", () => {
      expect(() => calculate("(10^2e5)^10")).not.toThrow(OverflowError);
    });
  });

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
