import { Clause, Compiler, CompilerError, CompilerErrorCode, Program } from "./compiler";
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

  it('should return empty program for empty tuple', () => {
    const code = "()";
    const stream = new Stream(code, 0);
    const parser = new Parser();
    const parserResult = parser.parse(stream) as ResultValue<Atom[]>;
    expect(parserResult.value.length).toBe(1);
    const atoms = parserResult.value;
    const compiler = new Compiler();
    const compilerResult = compiler.compile(atoms) as ResultValue<Program>;
    const program: Program = compilerResult.value;
    expect(program.cells.length).toBe(0);
    expect(program.clauses.size).toBe(0);
    expect(program.symbols.length).toBe(0);
  });

  it('should return empty program for monad tuple', () => {
    const code = "(a)";
    const stream = new Stream(code, 0);
    const parser = new Parser();
    const parserResult = parser.parse(stream) as ResultValue<Atom[]>;
    expect(parserResult.value.length).toBe(1);
    const atoms = parserResult.value;
    const compiler = new Compiler();
    const compilerResult = compiler.compile(atoms) as ResultValue<Program>;
    const program: Program = compilerResult.value;
    expect(program.cells.length).toBe(2);
    expect(program.cells[0]).toBe(5);
    expect(program.cells[1]).toBe(3);
    expect(program.symbols.length).toBe(1);
    expect(program.symbols[0]).toBe('a');
    expect(program.clauses.size).toBe(1);
    const clauses = program.clauses.get('a/0') as Clause[];
    expect(clauses.length).toBe(1);
    const clause = clauses[0];
    expect(clause.addr).toBe(0);
    expect(clause.len).toBe(2);
    expect(clause.neck).toBe(2);
    expect(clause.hgs.length).toBe(1);
    expect(clause.hgs[0]).toBe(0);
    expect(clause.xs.length).toBe(0);
  });
})