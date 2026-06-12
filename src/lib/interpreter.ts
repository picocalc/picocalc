import { constants } from "./constants";
import {
  UnexpectedEndOfExpressionError,
  MismatchedParenthesisError,
  InsufficientOperandsError,
  InterpreterError,
  EmptyExpressionError,
  MaximumPrecisionError,
  OverflowError,
  DivisionByZeroError,
} from "./errors";
import type { ParsedToken } from "./parser";
import { ceil } from "./utils/ceil";
import { divide } from "./utils/divide";
import { factorial } from "./utils/factorial";
import { floor } from "./utils/floor";
import { gcd } from "./utils/gcd";
import { mod } from "./utils/mod";
import { multiply } from "./utils/multiply";
import { nthRoot } from "./utils/nthroot";
import { simplify } from "./utils/simplify";
import { sqrt } from "./utils/sqrt";
import { OverflowValue } from "./utils/types";
import type { NormalValue, Value, ValueConstant } from "./utils/types";

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

function getConst(id: ValueConstant): NormalValue {
  const c = constants[id];
  return {
    n: BigInt(c.replace(".", "")),
    d: 10n ** BigInt(c.length - c.indexOf(".") - 1),
  };
}

/**
 * Maximum allowed precision
 */
const MAX_PRECISION = 50_000;
/**
 * Threshold to prevent denominators from growing infinitely.
 */
const SIMPLIFY_THRESHOLD = 10n ** 4000n;

export interface PrecisionOptions {
  format?: "decimal" | "precise";
  maxDecimals?: number;
}

export function evaluate(
  tokens: ParsedToken[],
  options: PrecisionOptions = {},
): NormalValue {
  if (tokens.length === 0) {
    throw new EmptyExpressionError();
  }

  const { format } = options;

  const values: Value[] = [];
  const ops: StackOp[] = [];

  const applyOp = (pos?: number) => {
    const op = ops.pop();
    if (!op || op === "LPAREN" || op === "ABS_OPEN") return;

    const right = values.pop();
    if (right === undefined) {
      throw new UnexpectedEndOfExpressionError();
    }

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
          values.push({ n: -rN, d: right.d, c: right.c });
          return;
        }
        case "ABS_FN": {
          const rN = right.n;
          if (rN === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ n: rN < 0 ? -rN : rN, d: right.d, c: right.c });
          return;
        }
        case "CEIL_FN": {
          if (right.n === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ n: ceil(right), d: 1n });
          return;
        }
        case "FLOOR_FN": {
          if (right.n === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push({ n: floor(right), d: 1n });
          return;
        }
        case "SQRT_FN": {
          if (right.n === "OVERFLOW") {
            values.push(OverflowValue);
            return;
          }
          values.push(sqrt(right, format === "precise"));
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
        throw new InterpreterError(
          "Factorial is only defined for non-negative integers",
          pos,
        );
      }
      if (reduced.n >= 4e5) {
        values.push(OverflowValue);
        return;
      }
      values.push({ n: factorial(reduced.n)!, d: 1n });
      return;
    }

    const left = values.pop();
    if (left === undefined) {
      throw new InsufficientOperandsError(pos);
    }

    let resN: bigint;
    let resD: bigint;
    let resC: ValueConstant | undefined;
    let resE: bigint | undefined;

    const lN = left.n;
    const rN = right.n;

    switch (op) {
      case "ADD":
      case "SUBTRACT": {
        if (lN === "OVERFLOW" || rN === "OVERFLOW") {
          values.push(OverflowValue);
          return;
        }
        const lD = left.d;
        const lC = left.c;
        const rD = right.d;
        const rC = right.c;
        const isSub = op === "SUBTRACT";
        if (lN === 0n) {
          resN = isSub ? -rN : rN;
          resD = rD;
          resC = rC;
          break;
        }
        if (rN === 0n) {
          resN = lN;
          resD = lD;
          resC = lC;
          break;
        }
        if (lD === rD) {
          resN = isSub ? lN - rN : lN + rN;
          resD = lD;
        } else {
          // LCM approach to keep numbers smaller
          const common = gcd(lD, rD);
          if (common === 1n) {
            resN = isSub ? lN * rD - rN * lD : lN * rD + rN * lD;
            resD = lD * rD;
          } else {
            const mLeft = rD / common;
            const mRight = lD / common;
            resN = isSub ? lN * mLeft - rN * mRight : lN * mLeft + rN * mRight;
            resD = lD * mLeft;
          }
        }
        if (lC === rC && resN !== 0n) {
          resC = lC;
        }
        break;
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
        if (rN === 0n) {
          throw new DivisionByZeroError();
        }
        if (lN === "OVERFLOW" || rN === "OVERFLOW") {
          values.push(OverflowValue);
          return;
        }
        const { n, d } = mod({ n: lN, d: left.d }, { n: rN, d: right.d });
        resN = n;
        resD = d;
        break;
      }
      case "EXP": {
        if (rN === 0n) {
          resN = 1n;
          resD = 1n;
          break;
        }

        if (lN === "OVERFLOW") {
          values.push(OverflowValue);
          return;
        }

        const lD = left.d;
        const lC = left.c;

        if (lN === lD && lC === undefined) {
          resN = 1n;
          resD = 1n;
          break;
        }

        if (rN === "OVERFLOW") {
          values.push(OverflowValue);
          return;
        }

        const normalizedExponent = simplify(right);

        let exponent = normalizedExponent.n;

        if (lN === 0n) {
          if (exponent < 0) {
            throw new DivisionByZeroError();
          }
          resN = 0n;
          resD = 1n;
          break;
        }

        const exponentD = normalizedExponent.d;

        const lE = left.e ?? 1n;
        const exp = lE * exponent;

        if (exponentD === 2n) {
          const basePowerN = lN ** exponent;
          const basePowerD = lD ** exponent;

          const rootResult = sqrt(
            { n: basePowerN, d: basePowerD, c: lC, e: lC ? exp : undefined },
            format === "precise",
          );

          values.push(rootResult);
          return;
        }

        if (exponentD !== 1n) {
          const basePowerN = lN ** exponent;
          const basePowerD = lD ** exponent;

          const rootResult = nthRoot(
            { n: basePowerN, d: basePowerD, c: lC, e: lC ? exp : undefined },
            exponentD,
            format === "precise",
          );

          values.push(rootResult);
          return;
        }

        let baseN = lN;
        let baseD = lD;

        // Handling negative exponents: flip the fraction and make exponent positive
        if (exponent < 0) {
          [baseN, baseD] = [baseD, baseN];
          exponent = -exponent;

          if (lC !== undefined) {
            resN = baseN ** exponent;
            resD = baseD ** exponent;
            resC = lC;
            resE = exp;
            break;
          }
        }

        if (exponent === 1n) {
          resN = baseN;
          resD = baseD;
          if (normalizedExponent.c === undefined) {
            resC = lC;
            resE = left.e;
          }
          break;
        }

        if (
          exponent > 1e4 &&
          (baseN * exponent > 6e6 || baseD * exponent > 6e6)
        ) {
          values.push(OverflowValue);
          return;
        }

        if (!lC) {
          resN = baseN ** exponent;
          resD = baseD ** exponent;
          break;
        }

        resN = baseN ** exponent;
        resD = baseD ** exponent;
        resC = lC;
        resE = exp;
        break;
      }
    }

    const value = { n: resN, d: resD, c: resC, e: resE };
    values.push(resD > SIMPLIFY_THRESHOLD ? simplify(value) : value);
  };

  const pushOpWithPrecedence = (currentOp: StackOp, pos: number) => {
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

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

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
          if (expValue > 2e6) {
            values.push(OverflowValue);
            break;
          }
          if (expValue >= 0n) {
            n *= 10n ** expValue;
          } else {
            d *= 10n ** -expValue;
          }
        }
        if (d === 1n) {
          values.push({ n, d: 1n });
        } else {
          values.push(simplify({ n, d }));
        }
        break;
      }
      case "CONST": {
        if (format === "precise") {
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
        let foundMatch = false;
        while (ops.length > 0) {
          if (ops[ops.length - 1] === "ABS_OPEN") {
            foundMatch = true;
            break;
          }
          applyOp(token.pos);
        }
        if (!foundMatch) {
          throw new InterpreterError(
            "Mismatched absolute value pipe",
            token.pos,
          );
        }

        ops.pop();
        const val = values.pop();
        if (val === undefined) {
          throw new UnexpectedEndOfExpressionError();
        }
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

  const finalValue = values.pop();
  if (finalValue === undefined) {
    throw new UnexpectedEndOfExpressionError();
  }

  if (finalValue.n === "OVERFLOW") {
    throw new OverflowError();
  }

  return simplify(finalValue);
}
