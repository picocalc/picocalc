export class GenericMathErrror extends Error {
  pos?: number;
  constructor(name: string, message: string, pos?: number) {
    if (pos === undefined) {
      super(message);
    } else {
      super(`${message} at position ${pos}`);
    }
    this.pos = pos;
    this.name = name;
  }
}

class InterpreterError extends GenericMathErrror {
  constructor(message: string, pos?: number) {
    super("InterpreterError", message, pos);
  }
}

export class MaximumPrecisionError extends InterpreterError {
  constructor(precision: number, maxPrecision: number) {
    super(
      `Exceeded maximum precision of ${maxPrecision} digits (${precision})`,
    );
  }
}

export class NotImplementedError extends InterpreterError {
  constructor(message: string, pos?: number) {
    super(message, pos);
  }
}

export class OverflowError extends InterpreterError {
  constructor() {
    super("Overflow");
  }
}

export class DivisionByZeroError extends InterpreterError {
  constructor() {
    super("Division by zero");
  }
}

export class EmptyExpressionError extends InterpreterError {
  constructor() {
    super("Empty expression");
  }
}

export class MismatchedParenthesisError extends InterpreterError {
  constructor(pos: number, message: string = "Mismatched parenthesis") {
    super(message, pos);
  }
}
