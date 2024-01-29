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

export function tagNameOf(word: number): string {
  const tag = tagOf(word) as Tag;
  switch (tag) {
    case Tag.Declare:
      return 'Declare';
    case Tag.Use:
      return 'Use';
    case Tag.Reference:
      return 'Reference';
    case Tag.Symbol:
      return 'Symbol';
    case Tag.Integer:
      return 'Integer';
    case Tag.Arity:
      return 'Arity';
  }
}

export enum CompilerErrorCode {
  Unknown = 0,
  IdentifierAsClause,
  VariableAsClause,
  WrongClauseFormat,
  EmptyTerm,
  WrongGoalFormat,
  ArgsIsNotTuple,
  SubGoalsIsNotTuple,
  SubGoalIsNotTuple,
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

  determineArity(atom: Atom | undefined) {
    if (!atom) {
      return 0;
    }

    switch (atom.kind) {
      case AtomKind.Identifier:
      case AtomKind.Variable:
        return 1;
      case AtomKind.Tuple:
        return atom.atoms.length;
    }
  }

  compileGoal(program: Program, variables: Map<string, number>, fact: Tuple): CompilerResult<Program> {
    if (fact.atoms.length === 0) {
      return success(program);
    }

    if (fact.atoms.length > 2) {
      const error = new CompilerError(CompilerErrorCode.WrongGoalFormat, fact)
      return failure(error);
    }

    const functorAtom = fact.atoms[0];

    if (functorAtom.kind === AtomKind.Variable) {
      const error = new CompilerError(CompilerErrorCode.VariableAsFunctor, functorAtom)
      return failure(error);
    }

    if (functorAtom.kind === AtomKind.Tuple) {
      const error = new CompilerError(CompilerErrorCode.TupleAsFunctor, functorAtom)
      return failure(error);
    }

    const argsAtom = fact.atoms[1];

    const arity = this.determineArity(argsAtom);
    const arityCell = mask(Tag.Arity, arity);
    program.addCells(arityCell);

    const functorName = functorAtom.token.value;
    program.addSymbol(functorName);
    const symbolIndex = program.findSymbol(functorName);
    const functorCell = mask(Tag.Symbol, symbolIndex);
    program.addCells(functorCell);

    if (!argsAtom) {
      return success(program);
    }

    const argsAddr = program.cells.length;
    const argsCells = new Array(arity);
    program.addCells(...argsCells);

    if (argsAtom.kind !== AtomKind.Tuple) {
      const error = new CompilerError(CompilerErrorCode.ArgsIsNotTuple, functorAtom)
      return failure(error);
    }

    for (const index in argsAtom.atoms) {
      const argAtom = argsAtom.atoms[index];
      const cellAddr = argsAddr + Number(index);

      switch (argAtom.kind) {
        case AtomKind.Identifier: {
          const identifier = argAtom.token.value;
          program.addSymbol(identifier);
          const symbolIndex = program.findSymbol(identifier);
          const identifierCell = mask(Tag.Symbol, symbolIndex);
          program.cells[cellAddr] = identifierCell;
        }
          break;
        case AtomKind.Variable: {
          const variable = argAtom.token.value;
          const isVariableDeclared = variables.has(variable);
          if (!isVariableDeclared) {
            variables.set(variable, cellAddr);
          }
          const variableTag = isVariableDeclared ? Tag.Use : Tag.Declare;
          const variableAddr = variables.get(variable) as number;
          const variableCell = mask(variableTag, variableAddr);
          program.cells[cellAddr] = variableCell;
        }
          break;
        case AtomKind.Tuple: {
          const subGoalAddr = program.cells.length;
          const referenceCell = mask(Tag.Reference, subGoalAddr);
          program.cells[cellAddr] = referenceCell;

          const result = this.compileGoal(program, variables, argAtom);
          if (isResultError(result)) {
            return result;
          }
          break;
        }
      }
    }

    return success(program);
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
    if (atom.atoms.length === 0) {
      return success(program);
    }

    if (atom.atoms.length > 3) {
      const error = new CompilerError(CompilerErrorCode.WrongClauseFormat, atom)
      return failure(error);
    }

    const headAddr = program.cells.length;
    const functorAtom = atom.atoms[0];
    const argsAtom = atom.atoms[1];

    const headFact: Tuple = {
      kind: AtomKind.Tuple,
      atoms: [functorAtom, argsAtom]
    }

    const variables = new Map<string, number>();
    const result = this.compileGoal(program, variables, headFact);
    if (isResultError(result)) {
      return result;
    }

    const neckAddr = program.cells.length;
    const goalAddrs: number[] = [];

    const goalsAtom = atom.atoms[2];
    if (goalsAtom) {
      if (goalsAtom.kind !== AtomKind.Tuple) {
        const error = new CompilerError(CompilerErrorCode.SubGoalsIsNotTuple, goalsAtom)
        return failure(error);
      }

      for (const goal of goalsAtom.atoms) {
        goalAddrs.push(program.cells.length);

        if (goal.kind !== AtomKind.Tuple) {
          const error = new CompilerError(CompilerErrorCode.SubGoalIsNotTuple, goal)
          return failure(error);
        }

        const result = this.compileGoal(program, variables, goal);
        if (isResultError(result)) {
          return result;
        }
      }
    }

    const functorName = (functorAtom as Identifier).token.value;
    const arity = this.determineArity(argsAtom);
    const len = program.cells.length - headAddr;
    const clauseKey = this.composeClauseKey(functorName, arity);
    const clause = new Clause(headAddr, len, headAddr, neckAddr, goalAddrs, []);
    program.addClause(clauseKey, clause);
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

      return success<CompilerError, Program>(program)
    }, initial);
  }
}
