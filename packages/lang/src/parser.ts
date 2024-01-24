import { isVariable } from "./common";
import { Result, failure, isResultError, success } from "./result";
import { Stream } from "./stream";

export interface Token {
  value: string;
  position: number;
}

export enum AtomKind {
  Identifier,
  Variable,
  Tuple
}

export interface Identifier {
  kind: AtomKind.Identifier,
  token: Token;
}

export interface Variable {
  kind: AtomKind.Variable,
  token: Token;
}

export interface Tuple {
  kind: AtomKind.Tuple,
  atoms: Atom[]
}

export type Atom = Identifier | Variable | Tuple

export enum ParserErrorCode {
  LiteralIsNull = 0,
  LiteralNotStartWithDoulbeQuotation,
  LiteralNotEndWithDoulbeQuotation,
  LiteralContainsInvalidEscapeLetter,
  SymbolIsNull = 0,
  SymbolNotStartWithNormalLetter,
  SymbolNotEndWithNormalLetter,
  SymbolContainsInvalidLetter,
  TupleIsNull = 0,
  TupleNotStartWithLeftSquare,
  TupleNotEndWithRightSquare,
}

export class ParserError extends Error {
  constructor(public code: ParserErrorCode, public position: number, public expected: string[], public actual: string) {
    super('Parser');
  }
}

export type ParserResult<V> = Result<ParserError, V>;

export class Parser {
  parseLiteral(stream: Stream): ParserResult<string> {
    const head = stream.peek();
    if (!head) {
      const error = new ParserError(ParserErrorCode.LiteralIsNull, stream.position, ['"'], "");
      return failure(error);
    }

    if (head !== '"') {
      const error = new ParserError(ParserErrorCode.LiteralNotStartWithDoulbeQuotation, stream.position, ['"'], head);
      return failure(error);
    }

    stream.forward();

    const collect = (literal: string): ParserResult<string> => {
      const head = stream.peek();
      if (!head) {
        const error = new ParserError(ParserErrorCode.LiteralNotEndWithDoulbeQuotation, stream.position, ['"'], head);
        return failure(error);
      }

      switch (head) {
        case '"': {
          stream.forward();
          return success(literal);
        }
        case '\\': {
          const next = stream.peek(1);
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

    return collect("");
  }

  parseSymbol(stream: Stream): ParserResult<string> {
    const head = stream.peek();
    if (!head) {
      const error = new ParserError(ParserErrorCode.SymbolIsNull, stream.position, [], "");
      return failure(error);
    }

    const collect = (symbol: string): ParserResult<string> => {
      const head = stream.peek();
      if (!head) {
        return success(symbol);
      }

      switch (head) {
        case '(':
        case '"': {
          const error = new ParserError(ParserErrorCode.SymbolContainsInvalidLetter, stream.position, [], head);
          return failure(error);
        }
        case ')': {
          return success(symbol);
        }
        case ' ':
        case '\t':
        case '\r':
        case '\n': {
          stream.forward();
          return success(symbol);
        }
        default: {
          stream.forward();
          return collect(symbol + head);
        }
      }
    }

    return collect("");
  }

  parseTuple(stream: Stream): ParserResult<Atom[]> {
    const head = stream.peek();
    if (!head) {
      const error = new ParserError(ParserErrorCode.TupleIsNull, stream.position, ['('], "");
      return failure(error);
    }

    if (head !== '(') {
      const error = new ParserError(ParserErrorCode.TupleNotStartWithLeftSquare, stream.position, ['('], head);
      return failure(error);
    }

    stream.forward();

    const collect = (atoms: Atom[]): ParserResult<Atom[]> => {
      const head = stream.peek();
      if (!head) {
        const error = new ParserError(ParserErrorCode.TupleNotEndWithRightSquare, stream.position, [')'], head);
        return failure(error);
      }

      switch (head) {
        case '(': {
          const result = this.parseTuple(stream);
          if (isResultError(result)) {
            return result;
          } else {
            return collect([...atoms, { kind: AtomKind.Tuple, atoms: result.value }])
          }
        }
        case ')': {
          stream.forward();
          return success(atoms);
        }
        case '"': {
          const position = stream.position;
          const result = this.parseLiteral(stream);
          if (isResultError(result)) {
            return result;
          } else {
            const value = result.value;
            const token = {
              value,
              position
            };
            return collect([...atoms, { kind: AtomKind.Identifier, token }])
          }
        }
        case ' ':
        case '\t':
        case '\r':
        case '\n':
          stream.forward();
          return collect(atoms);
        default:
          {
            const position = stream.position;
            const result = this.parseSymbol(stream);
            if (isResultError(result)) {
              return result;
            } else {
              const value = result.value;
              const token = {
                value,
                position
              };
              if (isVariable(value)) {
                return collect([...atoms, { kind: AtomKind.Variable, token }])
              } else {
                return collect([...atoms, { kind: AtomKind.Identifier, token }])
              }
            }
          }
      }
    }

    return collect([]);
  }

  parse(stream: Stream, atoms: Atom[] = []): ParserResult<Atom[]> {
    const head = stream.peek();
    if (!head) {
      return success(atoms);
    }

    switch (head) {
      case '(': {
        const result = this.parseTuple(stream);
        if (isResultError(result)) {
          return result;
        } else {
          const atom: Atom = {
            kind: AtomKind.Tuple,
            atoms: result.value
          };

          return this.parse(stream, [...atoms, atom]);
        }
      }
      case '"': {
        const position = stream.position;
        const result = this.parseLiteral(stream);
        if (isResultError(result)) {
          return result;
        } else {
          const atom: Atom = {
            kind: AtomKind.Identifier,
            token: {
              position,
              value: result.value
            }
          };

          return this.parse(stream, [...atoms, atom]);
        }
      }
      case ' ':
      case '\t':
      case '\r':
      case '\n': {
        stream.forward();
        return this.parse(stream, atoms);
      }
      default: {
        const position = stream.position;
        const result = this.parseSymbol(stream);
        if (isResultError(result)) {
          return result;
        } else {
          const atom: Atom = {
            kind: isVariable(result.value) ? AtomKind.Variable : AtomKind.Identifier,
            token: {
              position,
              value: result.value
            }
          };

          return this.parse(stream, [...atoms, atom]);
        }
      }
    }
  }
}
