import {
  MismatchedParenthesisError,
  EmptyExpressionError,
  MaximumPrecisionError,
  OverflowError,
  NotImplementedError,
} from "./errors";
import type { ParsedToken } from "./parser";
import type { PrecisionOptions } from "./types";
import { OverflowValue } from "./types";
import type { NormalValue, Value } from "./types";
import { add } from "./utils/add";
import { ceil } from "./utils/ceil";
import { getConst } from "./utils/constants";
import { divide } from "./utils/divide";
import { exponentiate } from "./utils/exponentiate";
import { factorial } from "./utils/factorial";
import { floor } from "./utils/floor";
import { mod } from "./utils/mod";
import { multiply } from "./utils/multiply";
import { simplify, toSimpleFraction } from "./utils/simplify";
import { sqrt } from "./utils/sqrt";

const precedence = {
  LPAREN: 0,
  ABS_OPEN: 0,
  ADD: 1,
  SUBTRACT: 1,
  MULTIPLY: 2,
  DIVIDE: 2,
  MOD: 2,
  UNARY_PLUS: 4,
  UNARY_MINUS: 4,
  EXP: 6,
  IMPLICIT_MUL: 6,
  ABS_FN: 8,
  CEIL_FN: 8,
  FLOOR_FN: 8,
  SQRT_FN: 8,
  FACTORIAL: 10,
} as const;

type StackOp = keyof typeof precedence;

function isUnaryOperation(op: StackOp) {
  return (
    op === "UNARY_PLUS" ||
    op === "UNARY_MINUS" ||
    op === "ABS_FN" ||
    op === "CEIL_FN" ||
    op === "FLOOR_FN" ||
    op === "SQRT_FN"
  );
}

/**
 * Maximum allowed precision
 */
const MAX_PRECISION = 50_000;

/**
 * Maximum allowed factorial
 */
const MAX_FACTORIAL = 20_000;

/**
 * Maximum allowed exponent for scientific number notation
 */
const MAX_SCIENTIFIC_NUMBER_EXPONENT = 3e5;

export function evaluate(
  tokens: ParsedToken[],
  options: PrecisionOptions = {},
): NormalValue {
  if (tokens.length === 0) throw new EmptyExpressionError();

  const values: Value[] = [];
  const ops: StackOp[] = [];

  const applyOp = (pos?: number): void => {
    const op = ops.pop();
    if (!op || op === "LPAREN" || op === "ABS_OPEN") return;

    const right = values.pop()!;

    if (isUnaryOperation(op)) {
      switch (op) {
        case "UNARY_PLUS": {
          values.push(right);
          return;
        }
        case "UNARY_MINUS": {
          const rN = right.n;
          if (rN === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ ...right, n: -rN });
          return;
        }
        case "ABS_FN": {
          const rN = right.n;
          if (rN === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          const n = rN < 0 ? -rN : rN;
          values.push({ ...right, n });
          return;
        }
        case "CEIL_FN": {
          if (right.n === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ n: ceil(toSimpleFraction(right)), d: 1n });
          return;
        }
        case "FLOOR_FN": {
          if (right.n === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ n: floor(toSimpleFraction(right)), d: 1n });
          return;
        }
        case "SQRT_FN": {
          values.push(sqrt(right, options));
          return;
        }
      }
    }

    if (op === "FACTORIAL") {
      if (right.n === "OVERFLOW") {
        values.push(OverflowValue);
        return;
      }
      const reduced = simplify(right);
      if (reduced.d !== 1n || reduced.n < 0) {
        throw new NotImplementedError(
          "Factorial is only implemented for non-negative integers.",
          pos,
        );
      }
      if (reduced.n >= MAX_FACTORIAL) {
        values.push(OverflowValue);
        return;
      }
      values.push({ n: factorial(reduced.n)!, d: 1n });
      return;
    }

    const left = values.pop()!;

    const lN = left.n;
    const rN = right.n;

    switch (op) {
      case "ADD":
      case "SUBTRACT": {
        values.push(add(left, right, op === "SUBTRACT"));
        return;
      }
      case "MULTIPLY":
      case "IMPLICIT_MUL": {
        values.push(multiply(left, right));
        return;
      }
      case "DIVIDE": {
        values.push(divide(left, right));
        return;
      }
      case "MOD": {
        if (lN === "OVERFLOW" || rN === "OVERFLOW") {
          values.push(OverflowValue);
          return;
        }
        values.push(mod(left, right));
        return;
      }
      case "EXP": {
        values.push(exponentiate(left, right, options));
        return;
      }
    }
  };

  const pushOpWithPrecedence = (currentOp: StackOp, pos: number): void => {
    const isUnary = isUnaryOperation(currentOp);

    const isRightAssociative =
      currentOp === "EXP" || currentOp === "IMPLICIT_MUL";

    while (
      ops.length > 0 &&
      !isUnary &&
      (isRightAssociative
        ? precedence[ops[ops.length - 1]!] > precedence[currentOp]
        : precedence[ops[ops.length - 1]!] >= precedence[currentOp])
    ) {
      applyOp(pos);
    }
    ops.push(currentOp);
  };

  for (const token of tokens) {
    switch (token.type) {
      case "NUMBER": {
        const frac = token.fraction || "";
        const fl = frac.length;
        if (fl > MAX_PRECISION) {
          throw new MaximumPrecisionError(fl, MAX_PRECISION);
        }

        let n = BigInt(token.whole + frac);
        let d = fl === 0 ? 1n : 10n ** BigInt(fl);

        if (token.exponent) {
          if (token.exponent.length > MAX_PRECISION) {
            throw new MaximumPrecisionError(
              token.exponent.length,
              MAX_PRECISION,
            );
          }
          const expValue = BigInt(token.exponent);
          if (expValue > MAX_SCIENTIFIC_NUMBER_EXPONENT) {
            values.push(OverflowValue);
            break;
          }
          if (expValue >= 0) {
            n *= 10n ** expValue;
          } else {
            d *= 10n ** -expValue;
          }
        }
        if (d === 1n) {
          values.push({ n, d: 1n });
        } else {
          values.push({ n, d });
        }
        break;
      }
      case "CONST": {
        if (options.format === "precise") {
          values.push({ n: 1n, d: 1n, c: token.id });
        } else {
          values.push(getConst(token.id));
        }
        break;
      }
      case "LPAREN": {
        ops.push("LPAREN");
        break;
      }
      case "RPAREN": {
        let foundMatch = false;
        while (ops.length > 0) {
          if (ops[ops.length - 1] === "LPAREN") {
            foundMatch = true;
            break;
          }
          applyOp(token.pos);
        }
        if (!foundMatch) throw new MismatchedParenthesisError(token.pos);
        ops.pop();
        break;
      }
      case "ABS_OPEN": {
        ops.push("ABS_OPEN");
        break;
      }
      case "ABS_CLOSE": {
        while (ops.length > 0) {
          if (ops[ops.length - 1] === "ABS_OPEN") {
            break;
          }
          applyOp(token.pos);
        }
        ops.pop();
        const val = values.pop()!;
        if (val.n === "OVERFLOW") {
          values.push(OverflowValue);
          break;
        }

        values.push({ n: val.n < 0 ? -val.n : val.n, d: val.d, c: val.c });
        break;
      }
      case "PLUS": {
        pushOpWithPrecedence("ADD", token.pos);
        break;
      }
      case "MINUS": {
        pushOpWithPrecedence("SUBTRACT", token.pos);
        break;
      }
      case "MUL": {
        pushOpWithPrecedence("MULTIPLY", token.pos);
        break;
      }
      case "DIV": {
        pushOpWithPrecedence("DIVIDE", token.pos);
        break;
      }
      case "POW": {
        pushOpWithPrecedence("EXP", token.pos);
        break;
      }
      case "UNARY_PLUS": {
        pushOpWithPrecedence("UNARY_PLUS", token.pos);
        break;
      }
      case "UNARY_MINUS": {
        pushOpWithPrecedence("UNARY_MINUS", token.pos);
        break;
      }
      case "IMPLICIT_MUL": {
        pushOpWithPrecedence("IMPLICIT_MUL", token.pos);
        break;
      }
      case "FACTORIAL": {
        pushOpWithPrecedence("FACTORIAL", token.pos);
        break;
      }
      case "MOD": {
        pushOpWithPrecedence("MOD", token.pos);
        break;
      }
      case "FUNC": {
        switch (token.id) {
          case "abs": {
            pushOpWithPrecedence("ABS_FN", token.pos);
            break;
          }
          case "ceil": {
            pushOpWithPrecedence("CEIL_FN", token.pos);
            break;
          }
          case "floor": {
            pushOpWithPrecedence("FLOOR_FN", token.pos);
            break;
          }
          case "sqrt": {
            pushOpWithPrecedence("SQRT_FN", token.pos);
            break;
          }
        }
        break;
      }
    }
  }

  while (ops.length > 0) {
    const top = ops[ops.length - 1];
    const lastPos = tokens[tokens.length - 1]?.pos ?? 0;
    if (top === "LPAREN") {
      ops.pop();
      continue;
    }
    applyOp(lastPos);
  }

  const finalValue = values.pop()!;

  if (finalValue.n === "OVERFLOW") {
    throw new OverflowError();
  }

  return simplify(finalValue);
}
