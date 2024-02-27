import { Compiler, CompilerError } from "./compiler";
import { AtomKind, Parser, ParserError } from "./parser";
import { Clause, Program } from "./program";
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

type EngineInnerError = {
  code: EngineErrorCode.Unknown
} | {
  code: EngineErrorCode.ProgramNotLoaded
} | {
  code: EngineErrorCode.ParserError,
  error: ParserError
} | {
  code: EngineErrorCode.CompilerError,
  error: CompilerError
} | {
  code: EngineErrorCode.TooManyQuery
} | {
  code: EngineErrorCode.InvalidQuery
} | {
  code: EngineErrorCode.EmptyQuery
}

export class EngineError extends Error {
  constructor(public innerError?: EngineInnerError) {
    super("EngineError");
  }
}

export type EngineResult<V> = Result<EngineError, V>;

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
      const error = new EngineError({ code: EngineErrorCode.ParserError, error: parserResult.error });
      return failure(error);
    }

    const atoms = parserResult.value;
    const compilerResult = this.compiler.compile(atoms);
    if (isResultError(compilerResult)) {
      const error = new EngineError({ code: EngineErrorCode.CompilerError, error: compilerResult.error });
      return failure(error);
    }

    this.program = compilerResult.value;

    return success(this.program);
  }

  *query(goal: string): Generator<EngineResult<Clause>, EngineResult<undefined>, unknown> {
    if (this.program === undefined) {
      const error = new EngineError({ code: EngineErrorCode.ProgramNotLoaded });
      return failure(error);
    }

    const stream = new Stream(goal, 0);

    const parserResult = new Parser().parse(stream, []);
    if (isResultError(parserResult)) {
      const error = new EngineError({ code: EngineErrorCode.ParserError, error: parserResult.error });
      return failure(error);
    }

    const ast = parserResult.value;
    if (ast.length !== 1) {
      const error = new EngineError({ code: EngineErrorCode.TooManyQuery});
      return failure(error);
    }

    const atom = ast[0];
    if (atom.kind === AtomKind.Identifier || atom.kind === AtomKind.Variable) {
      const error = new EngineError({ code: EngineErrorCode.InvalidQuery });
      return failure(error);
    }

    if (atom.atoms.length === 0) {
      const error = new EngineError({ code: EngineErrorCode.EmptyQuery });
      return failure(error);
    }

    if (atom.atoms.length === 1) {
      const goal = atom.atoms[0];
      const functorNameResult = this.compiler.parseFunctorName(goal);
      if (isResultError(functorNameResult)) {
        const error = new EngineError({ code: EngineErrorCode.CompilerError, error: functorNameResult.error });
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

      return success(undefined);
    }

    if (atom.atoms.length !== 2) {
      const error = new EngineError({ code: EngineErrorCode.InvalidQuery });
      return failure(error);
    }

    return success(undefined);
  }
}
