import {
  MismatchedParenthesisError,
  EmptyExpressionError,
  MaximumPrecisionError,
  OverflowError,
  NotImplementedError,
} from "./errors";
import {
  MAX_FACTORIAL,
  MAX_PRECISION,
  MAX_SCIENTIFIC_NUMBER_EXPONENT,
} from "./options";
import type { ParsedToken } from "./parser";
import type { NormalValue, PrecisionOptions, Value } from "./types";
import { OverflowValue } from "./types";
import { add } from "./utils/add";
import { arctan } from "./utils/arctan";
import { arctanh } from "./utils/arctanh";
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
  FN_CALL: 8,
  FACTORIAL: 10,
} as const;

type OperatorType =
  | "LPAREN"
  | "ABS_OPEN"
  | "ADD"
  | "SUBTRACT"
  | "MULTIPLY"
  | "DIVIDE"
  | "MOD"
  | "UNARY_PLUS"
  | "UNARY_MINUS"
  | "EXP"
  | "IMPLICIT_MUL"
  | "FACTORIAL";

type FunctionOp = { type: "FN_CALL"; name: string };

type StackOp = OperatorType | FunctionOp;

function isFunctionOp(op: StackOp) {
  return typeof op === "object";
}

function isUnaryOperation(op: StackOp) {
  return op === "UNARY_PLUS" || op === "UNARY_MINUS" || isFunctionOp(op);
}

function getOpPrecedence(op: StackOp): number {
  if (typeof op === "object") {
    return precedence.FN_CALL;
  }
  return precedence[op];
}

export function evaluate(
  tokens: ParsedToken[],
  options: PrecisionOptions = {},
): NormalValue {
  if (tokens.length === 0) throw new EmptyExpressionError();
  const { maxDecimals } = options;

  const values: Value[] = [];
  const ops: StackOp[] = [];

  const applyOp = (pos?: number): void => {
    const op = ops.pop();
    if (!op || op === "LPAREN" || op === "ABS_OPEN") return;

    const right = values.pop()!;

    if (isUnaryOperation(op)) {
      const rN = right.n;

      switch (op) {
        case "UNARY_PLUS": {
          values.push(right);
          return;
        }
        case "UNARY_MINUS": {
          if (rN === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ ...right, n: -rN });
          return;
        }
      }

      if (op.name === "sqrt") {
        values.push(sqrt(right, options));
        return;
      }

      if (rN === "OVERFLOW") {
        values.push(OverflowValue);
        return;
      }

      switch (op.name) {
        case "abs": {
          const n = rN < 0 ? -rN : rN;
          values.push({ ...right, n });
          return;
        }
        case "ceil": {
          values.push({ n: ceil(toSimpleFraction(right, maxDecimals)), d: 1n });
          return;
        }
        case "floor": {
          values.push({
            n: floor(toSimpleFraction(right, maxDecimals)),
            d: 1n,
          });
          return;
        }
        case "arctan": {
          values.push(arctan(toSimpleFraction(right, maxDecimals), options));
          return;
        }
        case "arctanh": {
          values.push(arctanh(toSimpleFraction(right, maxDecimals), options));
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

    switch (op) {
      case "ADD":
      case "SUBTRACT": {
        values.push(add(left, right, maxDecimals, op === "SUBTRACT"));
        return;
      }
      case "MULTIPLY":
      case "IMPLICIT_MUL": {
        values.push(multiply(left, right, maxDecimals));
        return;
      }
      case "DIVIDE": {
        values.push(divide(left, right, maxDecimals));
        return;
      }
      case "MOD": {
        if (left.n === "OVERFLOW" || right.n === "OVERFLOW") {
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
        ? getOpPrecedence(ops.at(-1)!) > getOpPrecedence(currentOp)
        : getOpPrecedence(ops.at(-1)!) >= getOpPrecedence(currentOp))
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
        values.push(getConst(token.id, options));
        break;
      }
      case "LPAREN":
      case "ABS_OPEN": {
        ops.push(token.type);
        break;
      }
      case "RPAREN": {
        let foundMatch = false;
        while (ops.length > 0) {
          if (ops.at(-1) === "LPAREN") {
            foundMatch = true;
            break;
          }
          applyOp(token.pos);
        }
        if (!foundMatch) throw new MismatchedParenthesisError(token.pos);
        ops.pop();
        const nextOp = ops.at(-1);
        if (!nextOp) break;
        if (isFunctionOp(nextOp)) applyOp(token.pos);
        break;
      }
      case "ABS_CLOSE": {
        while (ops.length > 0) {
          if (ops.at(-1) === "ABS_OPEN") {
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
      case "UNARY_PLUS":
      case "UNARY_MINUS":
      case "IMPLICIT_MUL":
      case "FACTORIAL":
      case "MOD": {
        pushOpWithPrecedence(token.type, token.pos);
        break;
      }
      case "FUNC": {
        pushOpWithPrecedence({ type: "FN_CALL", name: token.id }, token.pos);
        break;
      }
    }
  }

  while (ops.length > 0) {
    const top = ops.at(-1);
    const lastPos = tokens.at(-1)?.pos ?? 0;
    if (top === "LPAREN") {
      ops.pop();
      continue;
    }
    applyOp(lastPos);
  }

  const finalValue = values.pop()!;

  if (finalValue.n === "OVERFLOW") throw new OverflowError();

  return simplify(finalValue);
}
