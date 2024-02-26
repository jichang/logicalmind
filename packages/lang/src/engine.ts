import { Compiler, CompilerError } from "./compiler";
import { AtomKind, Parser, ParserError, Tuple } from "./parser";
import { Program } from "./program";
import { Result, failure, isResultError, success } from "./result";
import { Stream } from "./stream";

export class Frame {
}

export enum EngineErrorCode {
  Unknown = 0,
  ProgramNotLoaded,
  ParserError,
  CompilerError,
  TooManyQuery,
  InvalidQuery,
  EmptyQuery
}

type EngineEnnerError<T extends EngineErrorCode> =
  T extends EngineErrorCode.ParserError ? ParserError : T extends EngineErrorCode.CompilerError ? CompilerError : undefined;

export class EngineError<T extends EngineErrorCode> extends Error {
  constructor(public code: T, public innerError?: EngineEnnerError<T>) {
    super("EngineError");
  }
}

export type EngineResult<V, T extends EngineErrorCode = EngineErrorCode> = Result<EngineError<T>, V>;

export class Engine {
  public parser: Parser = new Parser();
  public compiler: Compiler = new Compiler();
  public heap: number[] = [];
  public program: Program | undefined;

  reset() {
    this.heap = [];
  }

  load(code: string): EngineResult<Program> {
    const stream = new Stream(code, 0);
    const parserResult = this.parser.parse(stream, []);
    if (isResultError(parserResult)) {
      const error = new EngineError(EngineErrorCode.ParserError, parserResult.error);
      return failure(error);
    }

    const atoms = parserResult.value;
    const compilerResult = this.compiler.compile(atoms);
    if (isResultError(compilerResult)) {
      const error = new EngineError(EngineErrorCode.CompilerError, compilerResult.error);
      return failure(error);
    }

    this.program = compilerResult.value;

    return success(this.program);
  }

  *query(goal: string) {
    if (this.program === undefined) {
      const error = new EngineError(EngineErrorCode.ProgramNotLoaded);
      return failure(error);
    }

    const stream = new Stream(goal, 0);

    const parserResult = new Parser().parse(stream, []);
    if (isResultError(parserResult)) {
      const error = new EngineError(EngineErrorCode.ParserError, parserResult.error);
      return failure(error);
    }

    const ast = parserResult.value;
    if (ast.length !== 1) {
      const error = new EngineError(EngineErrorCode.TooManyQuery);
      return failure(error);
    }

    const atom = ast[0];
    if (atom.kind === AtomKind.Identifier || atom.kind === AtomKind.Variable) {
      const error = new EngineError(EngineErrorCode.InvalidQuery);
      return failure(error);
    }

    if (atom.atoms.length === 0) {
      const error = new EngineError(EngineErrorCode.EmptyQuery);
      return failure(error);
    }

    if (atom.atoms.length === 1) {
      const goal = atom.atoms[0];
      const functorNameResult = this.compiler.parseFunctorName(goal);
      if (isResultError(functorNameResult)) {
        const error = new EngineError(EngineErrorCode.CompilerError, functorNameResult.error);
        return failure(error);
      }
      const functorName = functorNameResult.value;
      const clauseKey = this.compiler.composeClauseKey(functorName, 0);
      const clauses = this.program.clauses.get(clauseKey);
      if (clauses) {
        for (const clause of clauses) {
          yield success(clause);
        }
      }

      return;
    }

    if (atom.atoms.length !== 2) {
      const error = new EngineError(EngineErrorCode.InvalidQuery);
      return failure(error);
    }
  }
}
