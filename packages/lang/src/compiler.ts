import { Atom, AtomKind, Identifier, Tuple, Variable } from "./parser";
import { Result, failure, isResultError, success } from "./result";

export enum Tag {
  Declare = 0,
  Use,
  Reference,
  Symbol,
  Integer,
  Arity
}

export function mask(tag: Tag, word: number): number {
  return word << 3 | tag;
}

export function unmask(word: number): number {
  return word >> 3
}

export function tagOf(word: number): Tag {
  return (word & 0b111)
}

export class Clause {
  constructor(
    public addr = 0,
    public len = 0,
    public neck = 0,
    public hgs: number[] = [],
    public xs: number[] = []
  ) { }

  static empty() {
    return new Clause();
  }
}

export class Program {
  constructor(
    public cells: number[] = [],
    public symbols: number[] = [],
    public clauses: Map<string, Clause[]> = new Map(),
  ) { }


  static empty() {
    return new Program();
  }

  append(program: Program) { }
}

export enum CompilerErrorCode {
  Unknown = 0,
  IdentifierAsClause,
  VariableAsClause,
  WrongFormat,
  EmptyTerm,
  TupleAsFunctor,
  VariableAsFunctor
}

export class CompilerError extends Error {
  constructor(public code: CompilerErrorCode, public atom: Atom) {
    super("CompilerError");
  }
}

export type CompilerResult<V> = Result<CompilerError, V>;

export class Compiler {
  parseFunctorName(atom: Atom): CompilerResult<string> {
    switch (atom.kind) {
      case AtomKind.Identifier:
        return success(atom.token.value);
      case AtomKind.Variable:
        return failure(new CompilerError(CompilerErrorCode.VariableAsFunctor, atom));
      case AtomKind.Tuple:
        return failure(new CompilerError(CompilerErrorCode.TupleAsFunctor, atom));
    }
  }

  composeClauseKey(functorName: string, arity: number) {
    return `${functorName}/${arity}`;
  }

  compileIdentifierClause(atom: Identifier): CompilerResult<Program> {
    const error = new CompilerError(CompilerErrorCode.IdentifierAsClause, atom)
    return failure(error);
  }

  compileVariableClause(atom: Variable): CompilerResult<Program> {
    const error = new CompilerError(CompilerErrorCode.VariableAsClause, atom)
    return failure(error);
  }

  compileTupleClause(atom: Tuple): CompilerResult<Program> {
    const len = atom.atoms.length;
    if (len === 0) {
    } else {
    }
    const error = new CompilerError(CompilerErrorCode.VariableAsClause, atom)
    return failure(error);
  }

  compileClause(atom: Atom): CompilerResult<Program> {
    switch (atom.kind) {
      case AtomKind.Identifier:
        return this.compileIdentifierClause(atom);
      case AtomKind.Variable:
        return this.compileVariableClause(atom);
      case AtomKind.Tuple:
        return this.compileTupleClause(atom);
    }
  }

  compile(atoms: Atom[]): CompilerResult<Program> {
    const initial: CompilerResult<Program> = success(Program.empty());
    return atoms.reduce((lastResult: CompilerResult<Program>, atom) => {
      if (isResultError(lastResult)) {
        return lastResult;
      }
      const program = lastResult.value;

      const result = this.compileClause(atom);
      if (isResultError(result)) {
        return result;
      }

      program.append(result.value)

      return success(program)
    }, initial);
  }
}
