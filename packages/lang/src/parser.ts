import { Result, failure, success } from "./result";
import { Stream } from "./stream";

export interface Token {
  value: string;
  offset: number;
}

export enum AtomKind {
  Identifier,
  Variable,
  Expr
}

export type Atom = {
  kind: AtomKind.Identifier,
  token: Token;
} | {
  kind: AtomKind.Variable,
  token: Token;
} | {
  kind: AtomKind.Expr,
  expr: Expr
}

export interface Expr {
  atoms: Atom[]
}

export enum ParserErrorCode {
  LiteralIsNull = 0,
  LiteralShouldStartWithDoulbeQuotation,
  LiteralShouldEndWithDoulbeQuotation,
  LiteralContainsInvalidEscapeLetter
}

export class ParserError extends Error {
  constructor(public code: ParserErrorCode, public position: number, public expected: string[], public actual: string) {
    super('Parser');
  }
}

export type ParserResult<V> = Result<ParserError, V>;

export class Parser {
  parseLiteral(stream: Stream): ParserResult<string> {
    let head = stream.peek();
    if (!head) {
      const error = new ParserError(ParserErrorCode.LiteralIsNull, stream.position, ['"'], "");
      return failure(error);
    }

    switch (head) {
      case '"': {
        let collect = (literal: string): ParserResult<string> => {
          const head = stream.peek();
          if (!head) {
            const error = new ParserError(ParserErrorCode.LiteralShouldEndWithDoulbeQuotation, stream.position, ['"'], head);
            return failure(error);
          }

          switch (head) {
            case '"': {
              stream.forward();
              return success(literal);
            }
            case '\\': {
              let next = stream.peek(1);
              switch (next) {
                case '\f':
                case '\n':
                case '\r':
                case '\t':
                case '\v':
                case '\'':
                case '\"':
                case '\\':
                  stream.forward(2);
                  return collect(literal + next);
                default: {
                  const error = new ParserError(ParserErrorCode.LiteralContainsInvalidEscapeLetter, stream.position, ['\f', '\n', '\r', '\t', '\v', '\'', '\"', '\\'], next);
                  return failure(error);
                }
              }
            }
            default:
              stream.forward();
              return collect(literal + head);
          }
        }

        stream.forward(1);
        return collect("");
      }
      default: {
        const error = new ParserError(ParserErrorCode.LiteralShouldStartWithDoulbeQuotation, stream.position, ['"'], head);
        return failure(error);
      }
    }
  }

  parseAtom() { }

  parseExpr() { }

  parse(stream: Stream) { }
}
