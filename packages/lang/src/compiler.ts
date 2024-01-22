import { Atom, AtomKind } from "./parser";
import { Result, failure, success } from "./result";

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
}

export class Program {
  constructor(
    public cells: number[] = [],
    public symbols: number[] = [],
    public clauses: Map<string, Clause[]> = new Map(),
  ) { }
}

export enum CompilerErrorCode {
  Unknown = 0,
  WrongFormat = 1,
  NullOrEmptyTerm = 2,
  TupleAsFunctor = 3,
  VariableAsFunctor = 4
}

export class CompilerError extends Error {
  constructor(public code: CompilerErrorCode, public atom: Atom) {
    super("CompilerError");
  }
}

export type CompilerResult<V> = Result<CompilerError, V>;

export function parseFunctorName(atom: Atom): CompilerResult<string> {
  switch (atom.kind) {
    case AtomKind.Identifier:
      return success(atom.token.value);
    case AtomKind.Variable:
      return failure(new CompilerError(CompilerErrorCode.VariableAsFunctor, atom));
    case AtomKind.Tuple:
      return failure(new CompilerError(CompilerErrorCode.TupleAsFunctor, atom));
  }
}

export function compile() { }