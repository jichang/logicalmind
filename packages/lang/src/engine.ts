import { Compiler, CompilerError } from "./compiler";
import { EmptyExplorer, IExplorer } from "./explorer";
import { AtomKind, Parser, ParserError } from "./parser";
import { Clause, Program, isReferenceCell, isVariableCell, detachTag } from "./program";
import { Frame, QueryContext } from "./query";
import { Result, failure, isResultError, isResultValue, success } from "./result";
import { Stream } from "./stream";


export enum UnifyErrorCode {
  Unknown = 0,
  UnmatchArity,
  UnmatchFunctor,
  UnmatchArg,
  UnmatchSubGoal,
  UnmatchCell
}

export class UnifyError extends Error {
  constructor(public code: UnifyErrorCode) {
    super("UnifyError");
  }
}

export enum EngineErrorCode {
  Unknown = 0,
  ProgramNotLoaded,
  ParserError,
  CompilerError,
  TooManyQuery,
  InvalidQuery,
  EmptyQuery,
  UnifyError,
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
} | {
  code: EngineErrorCode.UnifyError,
  error: UnifyError
}

export class EngineError extends Error {
  constructor(public innerError?: EngineInnerError) {
    super("EngineError");
  }
}

export type EngineResult<V> = Result<EngineError, V>;

export enum QueryStep {
  UnifyClauseArity = "UnifyArity",
  UnifyClauseFunctor = "UnifyFunctor",
  UnifyClauseArg = "UnifyArg",
  UnifySubGoal = "UnifySubGoal",
  UnifyCellStart = "UnifyCellStart",
  UnifyCellEnd = "UnifyCellEnd",
  UnifyVariableCell = "UnifyVariableCell",
  UnifyReferenceCell = "UnifyReferenceCell",
  UnifyCellFailed = "UnifyCellFailed",
  UnifyClauseStart = "UnifyStart",
  CopyToHeap = "CopyToHeap",
  QueryStart = "QueryStart",
  QueryEnd = "QueryEnd",
  QuerySubGoalStart = "QuerySubGoalStart",
  QuerySubGoalEnd = "QuerySubGoalEnd",
  ReturnAnswer = "ReturnAnswer"
}

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
    this.explorer.trackStep(QueryStep.UnifyCellStart, context, sourceCellAddr, targetCellAddr);
    const sourceCell = context.deReference(context.readHeapCell(sourceCellAddr));
    const targetCell = context.deReference(context.readHeapCell(targetCellAddr));
    if (sourceCell === targetCell) {
      return success(true);
    }

    const frame = context.getTopFrame();
    const sourceCellIsVariableCell = isVariableCell(sourceCell);
    const targetCellIsVariableCell = isVariableCell(targetCell);
    if (sourceCellIsVariableCell || targetCellIsVariableCell) {
      this.explorer.trackStep(QueryStep.UnifyVariableCell, sourceCell, targetCell);

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
      this.explorer.trackStep(QueryStep.UnifyReferenceCell, sourceCell, targetCell);
      return this.unify(context, detachTag(sourceCell), detachTag(targetCell));
    } else {
      this.explorer.trackStep(QueryStep.UnifyCellFailed, sourceCell, targetCell);
      return failure(new UnifyError(UnifyErrorCode.UnmatchCell));
    }
  }

  unify(context: QueryContext, sourceAddr: number, targetAddr: number): Result<UnifyError, boolean> {
    this.explorer.trackStep(QueryStep.UnifyClauseStart, sourceAddr, targetAddr);

    const sourceArityCell = context.readHeapCell(sourceAddr);
    const targetArityCell = context.readHeapCell(targetAddr);
    this.explorer.trackStep(QueryStep.UnifyClauseArity, sourceAddr, targetAddr);
    if (sourceArityCell !== targetArityCell) {
      return failure(new UnifyError(UnifyErrorCode.UnmatchArity));
    }

    const sourceFunctorCell = context.readHeapCell(sourceAddr + 1);
    const targetFunctorCell = context.readHeapCell(targetAddr + 1);
    this.explorer.trackStep(QueryStep.UnifyClauseFunctor, sourceAddr, targetAddr);
    if (sourceFunctorCell !== targetFunctorCell) {
      return failure(new UnifyError(UnifyErrorCode.UnmatchFunctor));
    }

    const arity = detachTag(sourceArityCell);

    for (let i = 0; i < arity; i++) {
      this.explorer.trackStep(QueryStep.UnifyClauseArg, sourceAddr, targetAddr);
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
    const queryClauses = program.clauses.get(clauseKey) as Clause[];
    const queryClause = queryClauses[0];
    const context = new QueryContext(program);

    for (const clause of clauses) {
      this.explorer.trackStep(QueryStep.QueryStart, queryClause.baseAddr);

      this.explorer.trackStep(QueryStep.CopyToHeap, queryClause.baseAddr, clause.baseAddr);
      context.copyToHeap(program.cells, queryClause);
      const relocatedClause = context.copyToHeap(this.program.cells, clause);

      const sourceAddr = 0;
      const targetAddr = program.cells.length;
      const frame: Frame = {
        sourceAddr,
        targetAddr,
        trails: new Map()
      }
      context.pushFrame(frame);

      const result = this.unify(context, 0, program.cells.length);

      if (isResultValue(result)) {
        if (result.value) {
          if (clause.goalAddrs.length === 0) {
            yield success(clause)
          } else {
            for (const goalAddr of relocatedClause.goalAddrs) {
              const arity = detachTag(context.readHeapCell(goalAddr));
              const functor = detachTag(context.readHeapCell(goalAddr + 1));
              const functorName = this.program.symbols[functor];
              const goalClauseKey = this.compiler.composeClauseKey(functorName, arity);
              const goalClauses = this.program.clauses.get(goalClauseKey);

              if (goalClauses) {
                for (const goalClause of goalClauses) {
                  this.explorer.trackStep(QueryStep.QuerySubGoalStart, goalClause.baseAddr);

                  const goalSourceAddr = goalAddr;
                  const goalTargetAddr = context.getHeapSize();
                  this.explorer.trackStep(QueryStep.CopyToHeap, goalClause.baseAddr);
                  context.copyToHeap(this.program.cells, goalClause);

                  const frame: Frame = {
                    sourceAddr: goalSourceAddr,
                    targetAddr: goalTargetAddr,
                    trails: new Map()
                  }
                  context.pushFrame(frame);

                  const result = this.unify(context, goalSourceAddr, goalTargetAddr);

                  if (isResultValue(result)) {
                    if (result.value) {
                      this.explorer.trackStep(QueryStep.ReturnAnswer, clause);
                      this.explorer.printQueryContext(context, this.program);
                      yield success(clause)
                    }
                  }

                  context.popFrame(false);

                  this.explorer.trackStep(QueryStep.QuerySubGoalEnd, queryClause.baseAddr);
                }
              }
            }
          }
        }
      }
      context.popFrame(true);

      this.explorer.trackStep(QueryStep.QueryEnd, queryClause.baseAddr);
    }

    return success(undefined);
  }
}
