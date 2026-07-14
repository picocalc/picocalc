import "bigint.bitlength";
import { evaluate } from "./lib/interpreter";
import { tokenize } from "./lib/lexer";
import { parse } from "./lib/parser";
import type { PrecisionOptions } from "./lib/types";
import { formatResult } from "./utils/format-result";

export { PicocalcErrror } from "./lib/errors";

interface CalculateOptions extends PrecisionOptions {
  decimalSeparator?: "." | ",";
}

/**
 * The main entry point for the library.
 */
function calculate(expression: string, options?: CalculateOptions): string {
  const tokens = tokenize(expression, options);
  const transformed = parse(tokens);
  const result = evaluate(transformed, options);
  return formatResult(result, options);
}

export { calculate };
