import { Compiler, CompilerError } from "./compiler";
import { EmptyExplorer, IExplorer } from "./explorer";
import { AtomKind, Parser, ParserError } from "./parser";
import { Clause, Program, isReferenceCell, isVariableCell, detachTag } from "./program";
import { Frame, QueryContext, UnifyError, UnifyErrorCode } from "./query";
import { Result, failure, isResultError, isResultValue, success } from "./result";
import { Stream } from "./stream";

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
  public program: Program | undefined;

  constructor(public explorer: IExplorer = new EmptyExplorer()) { }

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

  unifyCell(context: QueryContext, sourceCellAddr: number, targetCellAddr: number): Result<UnifyError, boolean> {
    const sourceCell = context.deReference(context.readHeapCell(sourceCellAddr));
    const targetCell = context.deReference(context.readHeapCell(targetCellAddr));
    if (sourceCell === targetCell) {
      return success(true);
    }

    const frame = context.getTopFrame();
    const sourceCellIsVariableCell = isVariableCell(sourceCell);
    const targetCellIsVariableCell = isVariableCell(targetCell);
    if (sourceCellIsVariableCell || targetCellIsVariableCell) {
      const sourceAddr = detachTag(sourceCell);
      const targetAddr = detachTag(targetCell);

      if (sourceCellIsVariableCell && targetCellIsVariableCell) {
        if (sourceAddr > targetAddr) {
          context.writeHeapCell(sourceAddr, targetCell);
          frame.trails.set(sourceAddr, sourceCell);
        } else {
          context.writeHeapCell(targetAddr, sourceCell);
          frame.trails.set(targetAddr, targetCell);
        }
      } else if (sourceCellIsVariableCell) {
        context.writeHeapCell(sourceAddr, targetCell);
        frame.trails.set(sourceAddr, sourceCell);
      } else {
        context.writeHeapCell(targetAddr, sourceCell);
        frame.trails.set(targetAddr, targetCell);
      }

      return success(true);
    } else if (isReferenceCell(sourceCell) && isReferenceCell(targetCell)) {
      return this.unify(context, detachTag(sourceCell), detachTag(targetCell));
    } else {
      return success(false);
    }
  }

  unify(context: QueryContext, sourceAddr: number, targetAddr: number): Result<UnifyError, boolean> {
    const sourceArityCell = context.readHeapCell(sourceAddr);
    const targetArityCell = context.readHeapCell(targetAddr);
    if (sourceArityCell !== targetArityCell) {
      return failure(new UnifyError(UnifyErrorCode.UnmatchArity));
    }

    const sourceFunctorCell = context.readHeapCell(sourceAddr + 1);
    const targetFunctorCell = context.readHeapCell(targetAddr + 1);
    if (sourceFunctorCell !== targetFunctorCell) {
      return failure(new UnifyError(UnifyErrorCode.UnmatchFunctor));
    }

    const arity = detachTag(sourceArityCell);

    for (let i = 0; i < arity; i++) {
      const result = this.unifyCell(context, sourceAddr + i + 2, targetAddr + i + 2)
      if (isResultError(result)) {
        return failure(new UnifyError(UnifyErrorCode.UnmatchArg));
      }
    }

    return success(true);
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
      const error = new EngineError({ code: EngineErrorCode.TooManyQuery });
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

    const functor = atom.atoms[0];
    const functorNameResult = this.compiler.parseFunctorName(functor);
    if (isResultError(functorNameResult)) {
      const error = new EngineError({ code: EngineErrorCode.CompilerError, error: functorNameResult.error });
      return failure(error);
    }

    const functorName = functorNameResult.value;
    const arity = this.compiler.determineArity(atom.atoms[1]);
    const clauseKey = this.compiler.composeClauseKey(functorName, arity);
    const clauses = this.program.clauses.get(clauseKey);
    if (!clauses) {
      return success(undefined);
    }

    if (atom.atoms.length === 1) {
      for (const clause of clauses) {
        yield success(clause);
      }

      return success(undefined);
    }

    if (atom.atoms.length !== 2) {
      const error = new EngineError({ code: EngineErrorCode.InvalidQuery });
      return failure(error);
    }

    const compilerResult = this.compiler.compile([atom], [...this.program.symbols]);
    if (isResultError(compilerResult)) {
      const error = new EngineError({ code: EngineErrorCode.CompilerError, error: compilerResult.error });
      return failure(error);
    }

    const program = compilerResult.value;
    const context = new QueryContext(program);

    for (const clause of clauses) {
      context.copyToHeap(program.cells, 0, program.size());
      context.copyToHeap(this.program.cells, clause.headAddr, clause.len);

      this.explorer.printQueryContext(context, this.program);

      const sourceAddr = 0;
      const targetAddr = program.cells.length;
      const frame: Frame = {
        sourceAddr,
        targetAddr,
        trails: new Map()
      }
      context.pushFrame(frame);
      const result = this.unify(context, 0, program.cells.length);
      this.explorer.printQueryContext(context, this.program);
      if (isResultValue(result)) {
        if (result.value) {
          yield success(clause)
        }
      }
      context.popFrame();

      this.explorer.printQueryContext(context, this.program);
    }

    return success(undefined);
  }
}
