import { GenericMathErrror } from "./errors";

export class LexerError extends GenericMathErrror {
  constructor(message: string, pos: number) {
    super("LexerError", message, pos);
  }
}
export interface TokenBase {
  pos: number;
}

export interface TokenNumber extends TokenBase {
  type: "NUMBER";
  whole: string;
  fraction?: string;
  exponent?: string;
}

export interface TokenIdentifier extends TokenBase {
  type: "IDENTIFIER";
  id: string;
}

export type Token =
  | TokenNumber
  | TokenIdentifier
  | { type: "PLUS"; pos: number }
  | { type: "MINUS"; pos: number }
  | { type: "MUL"; pos: number }
  | { type: "DIV"; pos: number }
  | { type: "POW"; pos: number }
  | { type: "MOD"; pos: number }
  | { type: "FACTORIAL"; pos: number }
  | { type: "PIPE"; pos: number }
  | { type: "LPAREN"; pos: number }
  | { type: "RPAREN"; pos: number };

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

function isWhitespace(ch?: string): ch is " " {
  return ch === " ";
}

function isDigit(ch?: string): ch is Digit {
  if (ch === undefined) return false;
  return ch >= "0" && ch <= "9";
}

function isAlpha(ch?: string): boolean {
  if (ch === undefined) return false;
  return ch >= "a" && ch <= "z";
}

interface LexerOptions {
  readonly decimalSeparator?: "." | ",";
}

/**
 * Maximum allowed expression length
 */
const MAX_EXPRESSION_LENGTH = 75_000_000;

/**
 * Simple lexer (tokenizer).
 */
export function tokenize(
  expression: string,
  options: LexerOptions = {},
): Token[] {
  const { decimalSeparator = "." } = options;
  const tokens: Token[] = [];
  let index = 0;
  const length = expression.length;

  if (length > MAX_EXPRESSION_LENGTH) {
    throw new LexerError(
      `Expression length (${length}) exceeds the maximum allowed limit of ${MAX_EXPRESSION_LENGTH}`,
      0,
    );
  }

  while (index < length) {
    const ch = expression[index]!;
    const startPos = index;

    if (isWhitespace(ch)) {
      index++;
      continue;
    }

    if (isDigit(ch) || ch === decimalSeparator) {
      let whole = "";
      let fraction: string | undefined = undefined;
      let exponent: string | undefined = undefined;
      const startIdx = index;

      if (ch === decimalSeparator) {
        whole = "0";
        index++;
        const fracStart = index;
        while (index < length && isDigit(expression[index])) {
          index++;
        }
        if (index === fracStart) {
          throw new LexerError("Expected digit after decimal separator", index);
        }
        fraction = expression.slice(fracStart, index);
      } else {
        while (index < length && isDigit(expression[index])) {
          index++;
        }
        whole = expression.slice(startIdx, index);
        if (index < length && expression[index] === decimalSeparator) {
          index++;
          const fracStart = index;
          while (index < length && isDigit(expression[index])) {
            index++;
          }
          fraction = expression.slice(fracStart, index);
        }
      }

      if (
        index < length &&
        (expression[index] === "e" || expression[index] === "E")
      ) {
        let lookahead = index + 1;
        let sign = "";

        const next = expression[lookahead];

        if (lookahead < length && (next === "+" || next === "-")) {
          sign = next;
          lookahead++;
        }

        if (lookahead < length && isDigit(expression[lookahead])) {
          index = lookahead;
          let expBuffer = sign;
          while (index < length && isDigit(expression[index])) {
            expBuffer += expression[index];
            index++;
          }
          exponent = expBuffer;
        }
      }

      // Final check for trailing separators
      if (index < length && expression[index] === decimalSeparator) {
        throw new LexerError("Invalid decimal number format", index);
      }

      tokens.push({ type: "NUMBER", whole, fraction, exponent, pos: startPos });
      continue;
    }

    if (isAlpha(ch)) {
      let id = "";
      while (index < length && isAlpha(expression[index])) {
        id += expression[index++];
      }
      tokens.push({ type: "IDENTIFIER", id, pos: startPos });
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN", pos: startPos });
      index++;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "RPAREN", pos: startPos });
      index++;
      continue;
    }

    if (ch === "+") {
      tokens.push({ type: "PLUS", pos: startPos });
      index++;
      continue;
    }

    if (ch === "-") {
      tokens.push({ type: "MINUS", pos: startPos });
      index++;
      continue;
    }

    if (ch === "*") {
      tokens.push({ type: "MUL", pos: startPos });
      index++;
      continue;
    }

    if (ch === "/") {
      tokens.push({ type: "DIV", pos: startPos });
      index++;
      continue;
    }

    if (ch === "^") {
      tokens.push({ type: "POW", pos: startPos });
      index++;
      continue;
    }

    if (ch === "!") {
      tokens.push({ type: "FACTORIAL", pos: startPos });
      index++;
      continue;
    }

    if (ch === "|") {
      tokens.push({ type: "PIPE", pos: startPos });
      index++;
      continue;
    }

    if (ch === "%") {
      tokens.push({ type: "MOD", pos: startPos });
      index++;
      continue;
    }

    throw new LexerError(`Unexpected character '${ch}'`, index);
  }

  return tokens;
}
