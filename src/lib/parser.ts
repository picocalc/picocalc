import { PicocalcErrror } from "./errors";
import type {
  Token,
  TokenBase,
  TokenBinaryOperator,
  TokenIdentifier,
  TokenNumber,
} from "./lexer";
import { getSym } from "./symbol";

interface TokenFn extends TokenBase {
  readonly type: "FUNC";
  readonly id: string;
}

interface TokenConst extends TokenBase {
  readonly type: "CONST";
  readonly id: "pi" | "e";
}

interface UnaryToken extends TokenBase {
  readonly type: "UNARY_PLUS" | "UNARY_MINUS";
}

interface ImplicitMulToken extends TokenBase {
  readonly type: "IMPLICIT_MUL";
}

interface AbsOpenToken extends TokenBase {
  readonly type: "ABS_OPEN";
}

interface AbsCloseToken extends TokenBase {
  readonly type: "ABS_CLOSE";
}

type AbsToken = AbsOpenToken | AbsCloseToken;

export type ParsedToken =
  | Exclude<Token, { type: "PIPE" | "IDENTIFIER" }>
  | TokenFn
  | TokenConst
  | UnaryToken
  | ImplicitMulToken
  | AbsToken;

type TokenType = (Token | ParsedToken)["type"];

type OperandToken =
  | TokenNumber
  | Extract<Token, { type: "FACTORIAL" | "RPAREN" }>
  | TokenConst
  | AbsCloseToken;

/**
 * Helper: Is the last token an "operand" (something that can be followed by a closing pipe or implicit mul)?
 */
function isOperand(last?: ParsedToken): last is OperandToken {
  if (!last) return false;
  return (
    last.type === "NUMBER" ||
    last.type === "CONST" ||
    last.type === "RPAREN" ||
    last.type === "ABS_CLOSE" ||
    last.type === "FACTORIAL"
  );
}

function isBinaryOperator(token: ParsedToken): token is TokenBinaryOperator {
  return (
    token.type === "MUL" ||
    token.type === "DIV" ||
    token.type === "POW" ||
    token.type === "MOD"
  );
}

function isUnaryContext(last?: ParsedToken) {
  return !isOperand(last);
}

export class ParserError extends PicocalcErrror {
  constructor(message: string, pos: number) {
    super("ParserError", message, pos);
  }
}

export class IncompleteExpressionError extends ParserError {
  constructor(message: string, pos: number) {
    super(`Incomplete expression: ${message}`, pos);
  }
}

export class UnexpectedOperatorError extends ParserError {
  constructor(message: string, pos: number) {
    super(`Unexpected operator: ${message}`, pos);
  }
}

function resolveIdentifier(token: TokenIdentifier): TokenConst | TokenFn {
  const pos = token.pos;
  if (token.id === "pi" || token.id === "e") {
    return { type: "CONST", id: token.id, pos };
  }
  if (
    token.id === "abs" ||
    token.id === "ceil" ||
    token.id === "floor" ||
    token.id === "sqrt"
  ) {
    return { type: "FUNC", id: token.id, pos };
  }
  throw new ParserError(`Unknown identifier '${token.id}'`, token.pos);
}

export function parse(tokens: Token[]): ParsedToken[] {
  if (tokens.length === 0) return [];

  const result: ParsedToken[] = [];
  let absStack = 0;

  for (let i = 0; i < tokens.length; i++) {
    let token: Token | ParsedToken = tokens[i]!;
    const prev = tokens[i - 1];

    if (token.type === "IDENTIFIER") token = resolveIdentifier(token);

    const pos = token.pos;

    const isPrevOperand = isOperand(result.at(-1));

    // --- Handle Pipes ---
    if (token.type === "PIPE") {
      const isClosing = absStack > 0 && isPrevOperand;
      if (isClosing) {
        result.push({ type: "ABS_CLOSE", pos });
        absStack--;
        continue;
      }
      if (isPrevOperand) {
        result.push({ type: "IMPLICIT_MUL", pos });
      }
      result.push({ type: "ABS_OPEN", pos });
      absStack++;
      continue;
    }

    const needsImplicit =
      token.type === "LPAREN" ||
      token.type === "FUNC" ||
      token.type === "NUMBER" ||
      token.type === "CONST";

    if (needsImplicit && isPrevOperand) {
      result.push({ type: "IMPLICIT_MUL", pos });
    }

    const prevParsed = result.at(-1);

    // --- Syntax Validation ---
    if (isBinaryOperator(token) && isUnaryContext(prevParsed)) {
      throw new UnexpectedOperatorError(
        `Unexpected operator '${getSym(token)}'`,
        token.pos,
      );
    }

    if (
      (token.type === "FACTORIAL" || token.type === "RPAREN") &&
      isUnaryContext(prevParsed)
    ) {
      if (!prevParsed) {
        throw new UnexpectedOperatorError(
          `Unexpected '${getSym(token)}' at the beginning of expression`,
          token.pos,
        );
      }
      throw new UnexpectedOperatorError(
        `Unexpected '${getSym(token)}' after '${getSym(prevParsed)}'`,
        token.pos,
      );
    }

    if (
      prev &&
      (prev.type === "NUMBER" ||
        (prev.type === "IDENTIFIER" &&
          resolveIdentifier(prev).type === "CONST")) &&
      token.type === "NUMBER"
    ) {
      throw new ParserError("Missing operator between numbers", token.pos);
    }

    // --- Unary Identification ---
    if (
      (token.type === "PLUS" || token.type === "MINUS") &&
      isUnaryContext(prevParsed)
    ) {
      result.push({
        type: token.type === "PLUS" ? "UNARY_PLUS" : "UNARY_MINUS",
        pos,
      });
    } else {
      result.push(token);
    }
  }

  // --- Final State Validation ---
  const last = result.at(-1);

  if (absStack > 0) {
    throw new ParserError("Unclosed absolute value '|'", last?.pos ?? 0);
  }

  const trailingOperators: TokenType[] = [
    "PLUS",
    "MINUS",
    "UNARY_PLUS",
    "UNARY_MINUS",
    "FUNC",
    "ABS_OPEN",
    "LPAREN",
  ];

  if (
    last &&
    last.type !== "CONST" &&
    (isBinaryOperator(last) || trailingOperators.includes(last.type))
  ) {
    const sym = last.type === "FUNC" ? last.id : getSym(last);
    throw new IncompleteExpressionError(`trailing operator '${sym}'`, last.pos);
  }

  return result;
}
