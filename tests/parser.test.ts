import { describe, it, expect } from "bun:test";

import {
  IncompleteExpressionError,
  ParserError,
  UnexpectedOperatorError,
} from "#lib/parser";
import { calculate } from "#src";

describe("parse", () => {
  describe("UnexpectedOperatorError", () => {
    it("should throw UnexpectedOperatorError for consecutive binary operators", () => {
      expect(() => calculate("5 * * 3")).toThrow(ParserError);
      expect(() => calculate("5 * * 3")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("5 * * 3")).toThrow(/Unexpected operator '\*'/);
    });

    it("should throw UnexpectedOperatorError for invalid operator after opening parenthesis", () => {
      expect(() => calculate("(*)")).toThrow(ParserError);
      expect(() => calculate("(*)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("( * 2)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("( * 2)")).toThrow(/Unexpected operator '\*'/);
    });

    it("should throw UnexpectedOperatorError for invalid closing parenthesis after an operator", () => {
      expect(() => calculate("(5 * )")).toThrow(ParserError);
      expect(() => calculate("(5 * )")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("(5 + )")).toThrow(ParserError);
      expect(() => calculate("(5 + )")).toThrow(UnexpectedOperatorError);
    });

    it("should throw UnexpectedOperatorError for invalid closing parenthesis after a unary operator", () => {
      expect(() => calculate("(-)")).toThrow(ParserError);
      expect(() => calculate("(-)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("(+)")).toThrow(ParserError);
      expect(() => calculate("(+)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("-)")).toThrow(ParserError);
      expect(() => calculate("-)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("+)")).toThrow(ParserError);
      expect(() => calculate("+)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("sqrt)")).toThrow(ParserError);
      expect(() => calculate("sqrt)")).toThrow(UnexpectedOperatorError);
      expect(() => calculate("(sqrt)")).toThrow(ParserError);
      expect(() => calculate("(sqrt)")).toThrow(UnexpectedOperatorError);
    });

    it("should throw UnexpectedOperatorError for empty parentheses", () => {
      expect(() => calculate("()")).toThrow(ParserError);
      expect(() => calculate("()")).toThrow(UnexpectedOperatorError);
    });

    it("should throw UnexpectedOperatorError for an invalid closing parenthesis at the beginning of an expression", () => {
      expect(() => calculate(")2")).toThrow(ParserError);
      expect(() => calculate(")2")).toThrow(UnexpectedOperatorError);
      expect(() => calculate(")2(")).toThrow(ParserError);
      expect(() => calculate(")2(")).toThrow(UnexpectedOperatorError);
    });

    it("should throw UnexpectedOperatorError for leading multiplication", () => {
      expect(() => calculate("* 5")).toThrow(ParserError);
      expect(() => calculate("* 5")).toThrow(UnexpectedOperatorError);
    });

    it("should throw UnexpectedOperatorError for invalid unary combinations", () => {
      expect(() => calculate("5 + * 3")).toThrow(ParserError);
      expect(() => calculate("5 + * 3")).toThrow(UnexpectedOperatorError);
    });

    it("should throw UnexpectedOperatorError for an unexpected factorial operator", () => {
      expect(() => calculate("!")).toThrow(ParserError);
      expect(() => calculate("!")).toThrow(UnexpectedOperatorError);
    });
  });

  describe("UnexpectedOperatorError", () => {
    it("should throw IncompleteExpressionError for trailing operators", () => {
      expect(() => calculate("5 +")).toThrow(ParserError);
      expect(() => calculate("5 +")).toThrow(IncompleteExpressionError);
      expect(() => calculate("5 +")).toThrow(/trailing operator '\+'/);
    });

    it("should throw IncompleteExpressionError for operation-only expression", () => {
      expect(() => calculate("+")).toThrow(ParserError);
      expect(() => calculate("+")).toThrow(IncompleteExpressionError);
      expect(() => calculate("-")).toThrow(ParserError);
      expect(() => calculate("-")).toThrow(IncompleteExpressionError);
    });

    it("should throw IncompleteExpressionError for bracket-only expression", () => {
      expect(() => calculate("(")).toThrow(ParserError);
      expect(() => calculate("(")).toThrow(IncompleteExpressionError);
    });
  });

  it("should throw ParserError for an unclosed pipe operator", () => {
    expect(() => calculate("|")).toThrow(ParserError);
  });

  it("should throw ParserError for two space separated numbers", () => {
    expect(() => calculate("1 2")).toThrow(ParserError);
  });

  it("should throw ParserError for constant followed by a number", () => {
    expect(() => calculate("pi2")).toThrow(ParserError);
    expect(() => calculate("e1")).toThrow(ParserError);
    expect(() => calculate("1e2e3")).toThrow(ParserError);
  });
});
