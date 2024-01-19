import { Atom, AtomKind, Parser, ParserError, ParserErrorCode } from './parser';
import { ResultError, ResultValue } from './result';
import { Stream } from './stream';

describe('Parser', () => {
  it('parseLiteral should return error when stream is end', () => {
    const stream = new Stream('', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(0);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.LiteralIsNull);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('"');
    expect(result.error.actual).toBe('');
  })

  it('parseLiteral should return error when stream is not start with "', () => {
    const stream = new Stream('a', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(0);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.LiteralNotStartWithDoulbeQuotation);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('"');
    expect(result.error.actual).toBe('a');
  })

  it('parseLiteral should return error when stream is not end with "', () => {
    const stream = new Stream('"a', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(2);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.LiteralNotEndWithDoulbeQuotation);
    expect(result.error.position).toBe(2);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('"');
    expect(result.error.actual).toBe(undefined);
  })

  it('parseLiteral should return success when stream is well formed', () => {
    const stream = new Stream('"a"', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultValue<string>;
    expect(stream.position).toBe(3);
    expect(result.kind).toBe('Value');
    expect(result.value).toBe('a');
  })

  it('parseLiteral should return success when stream contains escaped letter', () => {
    const stream = new Stream('"\\\\a"', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultValue<string>;
    expect(stream.position).toBe(5);
    expect(result.kind).toBe('Value');
    expect(result.value).toBe('\\a');
  })

  it('parseSymbol should return error when stream is end', () => {
    const stream = new Stream('', 0);
    const parser = new Parser();
    const result = parser.parseSymbol(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(0);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.SymbolIsNull);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(0);
    expect(result.error.actual).toBe('');
  })

  it('parseSymbol should return error when stream is start with "', () => {
    const stream = new Stream('"ab', 0);
    const parser = new Parser();
    const result = parser.parseSymbol(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(0);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.SymbolContainsInvalidLetter);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(0);
    expect(result.error.actual).toBe('"');
  })
  it('parseSymbol should return success when stream is well formed', () => {
    const stream = new Stream('abc', 0);
    const parser = new Parser();
    const result = parser.parseSymbol(stream) as ResultValue<string>;
    expect(stream.position).toBe(3);
    expect(result.kind).toBe('Value');
    expect(result.value).toBe('abc');
  })

  it('parseSymbol should return success when stream is not well formed', () => {
    const stream = new Stream('ab(c', 0);
    const parser = new Parser();
    const result = parser.parseSymbol(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(2);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.SymbolContainsInvalidLetter);
    expect(result.error.position).toBe(2);
    expect(result.error.actual).toBe("(");
  })

  it('parseTuple should return error when stream is end', () => {
    const stream = new Stream('', 0);
    const parser = new Parser();
    const result = parser.parseTuple(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(0);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.TupleIsNull);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('(');
    expect(result.error.actual).toBe('');
  })

  it('parseTuple should return error when stream is not start with "', () => {
    const stream = new Stream('a', 0);
    const parser = new Parser();
    const result = parser.parseTuple(stream) as ResultError<ParserError>;
    expect(stream.position).toBe(0);
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.TupleNotStartWithLeftSquare);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('(');
    expect(result.error.actual).toBe('a');
  })

  it('parseTuple should return error when stream is not end with "', () => {
    const stream = new Stream('(a', 0);
    const parser = new Parser();
    const result = parser.parseTuple(stream) as ResultError<ParserError>;
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.TupleNotEndWithRightSquare);
    expect(result.error.position).toBe(2);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe(')');
    expect(result.error.actual).toBe(undefined);
    expect(stream.position).toBe(2);
  })

  it('parseTuple should return success when stream is well formed', () => {
    const stream = new Stream('(a)', 0);
    const parser = new Parser();
    const result = parser.parseTuple(stream) as ResultValue<Atom[]>;
    expect(result.kind).toBe('Value');
    expect(result.value.length).toBe(1);
    const atom = result.value[0];
    expect(atom.kind).toBe(AtomKind.Identifier);
    // @ts-ignore
    expect(atom.token.value).toBe("a");
    expect(stream.position).toBe(3);
  })

  it('parseTuple should return success when tuple is nested', () => {
    const stream = new Stream('(a (a))', 0);
    const parser = new Parser();
    const result = parser.parseTuple(stream) as ResultValue<Atom[]>;
    expect(result.kind).toBe('Value');
    expect(result.value.length).toBe(2);
    const atom = result.value[0];
    expect(atom.kind).toBe(AtomKind.Identifier);
    // @ts-ignore
    expect(atom.token.value).toBe("a");

    const tuple = result.value[1];
    expect(tuple.kind).toBe(AtomKind.Tuple);
    // @ts-ignore
    expect(tuple.atoms.length).toBe(1);
    // @ts-ignore
    expect(tuple.atoms[0].token.value).toBe("a");

    expect(stream.position).toBe(7);
  })

  it('parse should return success when expresions is nested', () => {
    const stream = new Stream('(a (a))\n(a)', 0);
    const parser = new Parser();
    const result = parser.parse(stream) as ResultValue<Atom[]>;
    expect(result.kind).toBe('Value');
    expect(result.value.length).toBe(2);
  })
})