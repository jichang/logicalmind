import { Compiler, CompilerError, CompilerErrorCode, Program } from "./compiler";
import { Atom, Parser } from "./parser";
import { ResultError, ResultValue } from "./result";
import { Stream } from "./stream";

describe('Compiler', () => {
  it('should return error when compiling identity clause', () => {
    const code = "a";
    const stream = new Stream(code, 0);
    const parser = new Parser();
    const parserResult = parser.parse(stream) as ResultValue<Atom[]>;
    expect(parserResult.value.length).toBe(1);
    const atoms = parserResult.value;
    const compiler = new Compiler();
    const compilerResult = compiler.compile(atoms) as ResultError<CompilerError>;
    const error = compilerResult.error;
    expect(error.code).toBe(CompilerErrorCode.IdentifierAsClause);
    expect(error.atom).toBe(atoms[0]);
  });

  it('should return error when compiling variable clause', () => {
    const code = "A";
    const stream = new Stream(code, 0);
    const parser = new Parser();
    const parserResult = parser.parse(stream) as ResultValue<Atom[]>;
    expect(parserResult.value.length).toBe(1);
    const atoms = parserResult.value;
    const compiler = new Compiler();
    const compilerResult = compiler.compile(atoms) as ResultError<CompilerError>;
    const error = compilerResult.error;
    expect(error.code).toBe(CompilerErrorCode.VariableAsClause);
    expect(error.atom).toBe(atoms[0]);
  });
})