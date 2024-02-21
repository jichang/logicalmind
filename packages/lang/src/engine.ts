import { Compiler } from "./compiler";
import { AtomKind, Parser, Tuple } from "./parser";
import { Clause, Program, isReference, isVariable, unmask } from "./program";
import { isResultError } from "./result";
import { Stream } from "./stream";

export class Frame {
}

export class Engine {
  constructor(
    public program: Program
  ) { }

  answer(atom: Tuple) {
    if (atom.atoms.length === 0) {
      return;
    }

    if (atom.atoms.length === 1) {
      return;
    }

    if (atom.atoms.length !== 2) {
      return;
    }

    return;
  }

  query(goal: string) {
    const stream = new Stream(goal, 0);

    const parserResult = new Parser().parse(stream, []);
    if (isResultError(parserResult)) {
      return parserResult;
    }

    const ast = parserResult.value;
    if (ast.length !== 1) {
      return;
    }

    const atom = ast[0];
    switch (atom.kind) {
      case AtomKind.Identifier:
      case AtomKind.Variable:
        break;
      case AtomKind.Tuple:
        {
          return this.answer(atom);
        }
        break;
    }
  }
}
