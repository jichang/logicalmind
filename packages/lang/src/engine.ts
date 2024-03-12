import { Compiler, CompilerError } from "./compiler";
import { Explorer, printCell } from "./explorer";
import { AtomKind, Parser, ParserError } from "./parser";
import { Clause, Program, Tag, isReferenceCell, isVariableCell, attachTag, extractTag, detachTag } from "./program";
import { Result, failure, isResultError, isResultValue, success } from "./result";
import { Stream } from "./stream";

export interface Frame {
  sourceAddr: number;
  targetAddr: number;
  trails: number[];
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
  public frames: Frame[] = [];
  public program: Program | undefined;

  constructor(public exploer: Explorer = new Explorer()) { }

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

  pushFrame(frame: Frame) {
    this.frames.push(frame)
  }

  popFrame() {
    return this.frames.pop();
  }

  heapSize() {
    return this.heap.length;
  }

  heapOffset() {
    if (this.program === undefined) {
      return 0;
    }

    return this.program.size()
  }

  relocate(cell: number, offset: number) {
    const tag = extractTag(cell);
    if (tag === Tag.Declare || tag === Tag.Reference || tag === Tag.Use) {
      const value = detachTag(cell);
      return attachTag(tag, value + offset);
    }

    return cell;
  }

  copyToHeap(cells: number[], start: number, len: number) {
    const offset = this.heap.length - start;

    for (let i = 0; i < len; i++) {
      const cell = cells[start + i];
      this.heap.push(this.relocate(cell, offset));
    }
  }

  getReferencedCell(cell: number) {
    const addr = detachTag(cell);
    return this.heap[addr]
  }

  deReference(cell: number): number {
    if (isVariableCell(cell)) {
      const ref = this.getReferencedCell(cell);
      if (ref === cell) {
        return cell;
      }

      return this.deReference(ref);
    }

    return cell;
  }

  writeHeapCell(addr: number, value: number) {
    if (this.program === undefined) {
      return 0;
    }

    this.heap[addr - this.program.size()] = value;
  }

  readHeapCell(addr: number) {
    return this.heap[addr]
  }

  unifyCell(frame: Frame, sourceCellAddr: number, targetCellAddr: number) {
    const sourceCell = this.deReference(this.readHeapCell(sourceCellAddr));
    const targetCell = this.deReference(this.readHeapCell(targetCellAddr));
    if (sourceCell === targetCell) {
      return true;
    }

    const sourceCellIsVariableCell = isVariableCell(sourceCell);
    const targetCellIsVariableCell = isVariableCell(targetCell);
    if (sourceCellIsVariableCell || targetCellIsVariableCell) {
      const sourceAddr = detachTag(sourceCell);
      const targetAddr = detachTag(targetCell);

      if (sourceCellIsVariableCell && targetCellIsVariableCell) {
        if (sourceAddr > targetAddr) {
          this.writeHeapCell(sourceAddr, targetCell);
          frame.trails.push(sourceAddr);
        } else {
          this.writeHeapCell(targetAddr, sourceCell);
          frame.trails.push(targetAddr);
        }
      } else if (sourceCellIsVariableCell) {
        this.writeHeapCell(sourceAddr, targetCell);
        frame.trails.push(sourceAddr);
      } else {
        this.writeHeapCell(targetAddr, sourceCell);
        frame.trails.push(targetAddr);
      }

      return true;
    } else if (isReferenceCell(sourceCell) && isReferenceCell(targetCell)) {
      return false;
    } else {
      return false;
    }
  }

  *unifyClause(sourceAddr: number, targetAddr: number) {
    const frame: Frame = {
      sourceAddr,
      targetAddr,
      trails: []
    }
    this.pushFrame(frame);

    const sourceArityCell = this.readHeapCell(sourceAddr);
    const targetArityCell = this.readHeapCell(targetAddr);
    if (sourceArityCell !== targetArityCell) {
      this.popFrame();
      return success(false);
    }

    const sourceFunctorCell = this.readHeapCell(sourceAddr + 1);
    const targetFunctorCell = this.readHeapCell(targetAddr + 1);
    if (sourceFunctorCell !== targetFunctorCell) {
      this.popFrame();
      return success(false);
    }

    const arity = detachTag(sourceArityCell);

    for (let i = 0; i < arity; i++) {
      if (!this.unifyCell(frame, sourceAddr + i + 2, targetAddr + i + 2)) {
        this.popFrame();
        return success(false);
      }
    }

    yield success(true);

    this.popFrame();
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

    for (const clause of clauses) {
      this.copyToHeap(program.cells, 0, program.size());
      this.copyToHeap(this.program.cells, clause.headAddr, clause.len);

      const generator = this.unifyClause(0, program.cells.length);
      for (const result of generator) {
        if (isResultValue(result)) {
          if (result.value) {
            yield success(clause)
          }
        }
      }
    }

    return success(undefined);
  }
}
