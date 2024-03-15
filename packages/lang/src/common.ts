import { Atom, AtomKind } from "./parser";

export function isVariableLiteral(value: string) {
  const firstChar = value[0];

  return firstChar.toUpperCase() === firstChar && firstChar !== firstChar.toLowerCase();
}

export function equalTo<T>(a: T) {
  return (b: T) => {
    return a === b;
  }
}

export function composeClauseKey(functorName: string, arity: number) {
  return `${functorName}/${arity}`;
}

export function determineArity(atom: Atom | undefined) {
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