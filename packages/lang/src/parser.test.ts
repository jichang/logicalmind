import { Parser, ParserError, ParserErrorCode } from './parser';
import { ResultError, ResultValue } from './result';
import { Stream } from './stream';

describe('Parser', () => {
  it('parseLiteral should return error when stream is end', () => {
    const stream = new Stream('', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultError<ParserError>;
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
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.LiteralShouldStartWithDoulbeQuotation);
    expect(result.error.position).toBe(0);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('"');
    expect(result.error.actual).toBe('a');
  })

  it('parseLiteral should return error when stream is not end with "', () => {
    const stream = new Stream('"a', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultError<ParserError>;
    expect(result.kind).toBe('Error');
    expect(result.error.code).toBe(ParserErrorCode.LiteralShouldEndWithDoulbeQuotation);
    expect(result.error.position).toBe(2);
    expect(result.error.expected.length).toBe(1);
    expect(result.error.expected[0]).toBe('"');
    expect(result.error.actual).toBe(undefined);
  })

  it('parseLiteral should return success when stream is well formed', () => {
    const stream = new Stream('"a"', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultValue<string>;
    expect(result.kind).toBe('Value');
    expect(result.value).toBe('a');
  })

  it('parseLiteral should return success when stream contains escaped letter', () => {
    const stream = new Stream('"\\\\a"', 0);
    const parser = new Parser();
    const result = parser.parseLiteral(stream) as ResultValue<string>;
    expect(result.kind).toBe('Value');
    expect(result.value).toBe('\\a');
  })
})