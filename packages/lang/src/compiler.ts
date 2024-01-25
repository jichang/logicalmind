import { Atom, AtomKind, Identifier, Tuple, Variable } from "./parser";
import { Program, Clause } from "./program";
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

  checkArity(predicates: Atom) {
    if (!predicates) {
      return 0;
    }

    switch (predicates.kind) {
      case AtomKind.Identifier:
      case AtomKind.Variable:
        return 1;
      case AtomKind.Tuple:
        return predicates.atoms.length;
    }
  }

  compileIdentifierClause(program: Program, atom: Identifier): CompilerResult<Program> {
    const error = new CompilerError(CompilerErrorCode.IdentifierAsClause, atom)
    return failure(error);
  }

  compileVariableClause(program: Program, atom: Variable): CompilerResult<Program> {
    const error = new CompilerError(CompilerErrorCode.VariableAsClause, atom)
    return failure(error);
  }

  compileTupleClause(program: Program, atom: Tuple): CompilerResult<Program> {
    const len = atom.atoms.length;
    if (len === 0) {
      return success(program);
    }

    const addr = program.cells.length;
    const functor = atom.atoms[0];
    const args = atom.atoms[1];
    const goals = atom.atoms[2];

    if (functor.kind === AtomKind.Variable) {
      const error = new CompilerError(CompilerErrorCode.VariableAsFunctor, functor)
      return failure(error);
    }

    if (functor.kind === AtomKind.Tuple) {
      const error = new CompilerError(CompilerErrorCode.TupleAsFunctor, functor)
      return failure(error);
    }

    const functorName = functor.token.value;
    const arity = this.checkArity(args);
    program.addSymbol(functorName);

    const arityCell = mask(Tag.Arity, arity);
    const symbolIndex = program.findSymbol(functorName);
    const functorCell = mask(Tag.Symbol, symbolIndex);
    program.addCells([arityCell, functorCell]);

    const clauseKey = this.composeClauseKey(functorName, arity);

    if (arity === 0) {
      const len = program.cells.length - addr;
      const neck = len;

      const clause = new Clause(addr, len, neck, [addr], []);
      program.addClause(clauseKey, clause);

      return success(program);
    }

    if (!args) {
      return success(program);
    }

    const variables = new Map<string, number>();

    switch (args.kind) {
      case AtomKind.Identifier: {
        program.addSymbol(args.token.value);

        const argSymbolIndex = program.findSymbol(args.token.value);
        const argCell = mask(Tag.Symbol, argSymbolIndex);
        program.addCells([argCell]);
      }
        break;
      case AtomKind.Variable: {
        variables.set(args.token.value, program.cells.length);
        const argCell = mask(Tag.Declare, program.cells.length);
        program.addCells([argCell]);
      }
        break;
      case AtomKind.Tuple: { }
        break;
    }

    if (!goals) {
      const len = program.cells.length - addr;
      const neck = len;

      const clause = new Clause(addr, len, neck, [addr], []);
      program.addClause(clauseKey, clause);

      return success(program);
    }

    return success(program);
  }

  compileClause(program: Program, atom: Atom): CompilerResult<Program> {
    switch (atom.kind) {
      case AtomKind.Identifier:
        return this.compileIdentifierClause(program, atom);
      case AtomKind.Variable:
        return this.compileVariableClause(program, atom);
      case AtomKind.Tuple:
        return this.compileTupleClause(program, atom);
    }
  }

  compile(atoms: Atom[]): CompilerResult<Program> {
    const initial: CompilerResult<Program> = success(Program.empty());
    return atoms.reduce((lastResult: CompilerResult<Program>, atom: Atom) => {
      if (isResultError(lastResult)) {
        return lastResult;
      }
      const program = lastResult.value;

      const result = this.compileClause(program, atom);
      if (isResultError(result)) {
        return result;
      }

      program.append(result.value)

      return success<CompilerError, Program>(program)
    }, initial);
  }
}
