import { composeClauseKey } from "./common";
import { Compiler, CompilerError } from "./compiler";
import { EmptyExplorer, IExplorer } from "./explorer";
import { AtomKind, Parser, ParserError } from "./parser";
import { Clause, Program, isReferenceCell, isVariableCell, detachTag, extractTag, Tag } from "./program";
import { Answer, Frame, Query, QueryContext } from "./query";
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
  UnifyTermArity = "UnifyTermArity",
  UnifyTermFunctor = "UnifyTermFunctor",
  UnifyTermArg = "UnifyTermArg",
  UnifySubGoal = "UnifySubGoal",
  UnifyCellStart = "UnifyCellStart",
  UnifyCellEnd = "UnifyCellEnd",
  UnifyVariableCell = "UnifyVariableCell",
  UnifyReferenceCell = "UnifyReferenceCell",
  UnifyCellFailed = "UnifyCellFailed",
  UnifyClauseStart = "UnifyClauseStart",
  QueryStart = "QueryStart",
  QueryEnd = "QueryEnd",
  QuerySubGoalStart = "QuerySubGoalStart",
  QuerySubGoalEnd = "QuerySubGoalEnd",
  ReturnAnswer = "ReturnAnswer",
  FindMatchedClause = "FindMatchedClause",
  AnalyseTerm = "AnalyseTerm",
  NoMatchedClause = "NoMatchedClause",
  CopyClauseToHeap = "CopyClauseToHeap",
  ParseQuery = "ParseQuery",
  CompileQuery = "CompileQuery",
  UnifyClauseResult = "UnifyClauseResult",
  UnifyTermStart = "UnifyTermStart",
  UnifyTermEnd = "UnifyTermEnd"
}

export class Engine {
  public parser: Parser = new Parser();
  public compiler: Compiler = new Compiler();

  constructor(public explorer: IExplorer = new EmptyExplorer()) { }

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
      return this.unifyTerm(context, detachTag(sourceCell), detachTag(targetCell));
    } else {
      this.explorer.trackStep(QueryStep.UnifyCellFailed, sourceCell, targetCell);
      return failure(new UnifyError(UnifyErrorCode.UnmatchCell));
    }
  }

  unifyTerm(context: QueryContext, sourceAddr: number, targetAddr: number): Result<UnifyError, boolean> {
    this.explorer.trackStep(QueryStep.UnifyTermStart, sourceAddr, targetAddr);

    const sourceArityCell = context.readHeapCell(sourceAddr);
    const targetArityCell = context.readHeapCell(targetAddr);
    this.explorer.trackStep(QueryStep.UnifyTermArity, sourceAddr, targetAddr);
    if (sourceArityCell !== targetArityCell) {
      return failure(new UnifyError(UnifyErrorCode.UnmatchArity));
    }

    const sourceFunctorCell = context.readHeapCell(sourceAddr + 1);
    const targetFunctorCell = context.readHeapCell(targetAddr + 1);
    this.explorer.trackStep(QueryStep.UnifyTermFunctor, sourceAddr, targetAddr);
    if (sourceFunctorCell !== targetFunctorCell) {
      return failure(new UnifyError(UnifyErrorCode.UnmatchFunctor));
    }

    const arity = detachTag(sourceArityCell);

    for (let i = 0; i < arity; i++) {
      const sourceTermArgAddr = sourceAddr + i + 2;
      const targetTermArgAddr = targetAddr + i + 2;
      this.explorer.trackStep(QueryStep.UnifyTermArg, sourceTermArgAddr, targetTermArgAddr);
      const result = this.unifyCell(context, sourceTermArgAddr, targetTermArgAddr)
      if (isResultError(result)) {
        return failure(new UnifyError(UnifyErrorCode.UnmatchArg));
      }
    }

    this.explorer.trackStep(QueryStep.UnifyTermEnd, sourceAddr, targetAddr);

    return success(true);
  }

  *unifyTerms(context: QueryContext, termAddrs: number[]) {
    const termAddr = termAddrs[0];
    const result = this.unify(context, termAddr);

    for (const currentTermUnification of result) {
      if (isResultValue(currentTermUnification)) {
        const restTerms = termAddrs.slice(1);
        if (restTerms.length !== 0) {
          const nextTermResult = this.unifyTerms(context, restTerms);
          for (const nextTermUnification of nextTermResult) {
            if (nextTermUnification) {
              yield true;
            }
          }
        } else {
          yield true;
        }
      }
    }

    return false;
  }

  *unify(context: QueryContext, termAddr: number): Generator<EngineResult<Clause>, EngineResult<undefined>, unknown> {
    this.explorer.printQueryContext(context);
    const { program: program } = context;

    this.explorer.trackStep(QueryStep.AnalyseTerm, termAddr);
    const arity = detachTag(context.readHeapCell(termAddr));
    const functor = detachTag(context.readHeapCell(termAddr + 1));
    const functorName = program.symbols[functor];

    const clauseKey = composeClauseKey(functorName, arity);
    const clauses = program.clauses.get(clauseKey);
    if (clauses === undefined || clauses.length === 0) {
      this.explorer.trackStep(QueryStep.NoMatchedClause, termAddr);
      return success(undefined);
    }
    this.explorer.trackStep(QueryStep.FindMatchedClause, clauseKey, clauses?.length);

    for (const clause of clauses) {
      this.explorer.trackStep(QueryStep.UnifyClauseStart, clause);

      const sourceAddr = termAddr;
      const targetAddr = context.getHeapSize();

      this.explorer.trackStep(QueryStep.CopyClauseToHeap, clause);
      const targetClause = context.copyToHeap(program.cells, clause);
      this.explorer.printQueryContext(context);

      const frame: Frame = {
        sourceAddr,
        targetAddr,
        trails: new Map()
      }
      context.pushFrame(frame);

      const result = this.unifyTerm(context, sourceAddr, targetAddr);
      if (isResultValue(result)) {
        if (targetClause.goalAddrs.length !== 0) {
          const result = this.unifyTerms(context, targetClause.goalAddrs);
          for (const isMatched of result) {
            if (isMatched) {
              yield success(clause)
            }
          }
        } else {
          yield success(clause);
        }
      }

      context.popFrame(false);
    }

    return success(undefined);
  }

  *query(program: Program, query: Query): Generator<EngineResult<Answer>, EngineResult<undefined>, unknown> {
    const { goal } = query;

    const stream = new Stream(goal, 0);

    this.explorer.trackStep(QueryStep.ParseQuery, query);
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

    if (atom.atoms.length !== 2 && atom.atoms.length !== 1) {
      const error = new EngineError({ code: EngineErrorCode.InvalidQuery });
      return failure(error);
    }

    this.explorer.trackStep(QueryStep.CompileQuery, query);
    const compilerResult = this.compiler.compile([atom], [...program.symbols]);
    if (isResultError(compilerResult)) {
      const error = new EngineError({ code: EngineErrorCode.CompilerError, error: compilerResult.error });
      return failure(error);
    }

    const queryProgram = compilerResult.value;
    const queryClauses = new Array<Clause>().concat(...queryProgram.clauses.values())
    const queryClause = queryClauses[0];

    const context = new QueryContext(program);

    this.explorer.trackStep(QueryStep.CopyClauseToHeap, queryClause);
    const targetClause = context.copyToHeap(queryProgram.cells, queryClause);

    for (const result of this.unify(context, targetClause.baseAddr)) {
      this.explorer.trackStep(QueryStep.UnifyClauseResult, result);
      if (isResultValue(result)) {
        const clause = result.value;
        const answer: Answer = {
          context,
          clause,
          targetClause,
        }
        yield success(answer);
      }
    }

    return success(undefined);
  }
}
