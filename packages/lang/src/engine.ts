import { Compiler, CompilerError } from "./compiler";
import { AtomKind, Parser, ParserError } from "./parser";
import { Clause, Program, Tag, mask, tagOf, unmask } from "./program";
import { Result, failure, isResultError, success } from "./result";
import { Stream } from "./stream";

export interface Frame {
  sourceAddr: number;
  targetAddr: number;
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

  pushFrame(sourceAddr: number, targetAddr: number) {
    this.frames.push({
      sourceAddr,
      targetAddr
    })
  }

  popFrame() {
    const frame = this.frames.pop();
    if (!frame) {
      return;
    }

    const { sourceAddr, targetAddr } = frame;
    this.heap.splice(sourceAddr);
  }

  relocate(cell: number, offset: number) {
    const tag = tagOf(cell);
    if (tag === Tag.Declare || tag === Tag.Reference || tag === Tag.Use) {
      const value = unmask(cell);
      return mask(tag, value + offset);
    }

    return cell;
  }

  copyToHeap(cells: number[], start: number, len: number) {
    if (!this.program) {
      return;
    }

    const offset = this.program.size() + this.heap.length;

    for (let i = 0; i < len; i++) {
      const cell = cells[start + i];
      this.heap.push(this.relocate(cell, offset));
    }
  }

  *unify() {
    const frame = this.frames[this.frames.length - 1];
    const { sourceAddr, targetAddr } = frame;

    const sourceCell = this.heap[sourceAddr];
    const targetCell = this.heap[targetAddr];
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

      this.pushFrame(0, clause.len);

      const generator = this.unify();
      for (const result of generator) {
        // output result based on the frames and heap
      }

      this.popFrame();
    }

    return success(undefined);
  }
}
