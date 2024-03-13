import { Program, Tag, attachTag, detachTag, extractTag, isVariableCell } from "./program";

export interface Frame {
  sourceAddr: number;
  targetAddr: number;
  trails: Map<number, number>;
}

export enum UnifyErrorCode {
  Unknown = 0,
  UnmatchArity,
  UnmatchFunctor,
  UnmatchArg,
}

export class UnifyError extends Error {
  constructor(public code: UnifyErrorCode) {
    super("UnifyError");
  }
}


export class QueryContext {
  heap: number[] = [];
  frames: Frame[] = [];

  constructor(public program: Program) { }

  pushFrame(frame: Frame) {
    return this.frames.push(frame)
  }

  getTopFrame() {
    return this.frames[this.frames.length - 1];
  }

  popFrame() {
    const frame = this.frames.pop();
    if (frame) {
      for (const addr of frame.trails.keys()) {
        this.writeHeapCell(addr, frame.trails.get(addr) as number)
      }
    }
    return frame;
  }

  getHeapSize() {
    return this.heap.length;
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

  readHeapCell(addr: number) {
    return this.heap[addr]
  }

  writeHeapCell(addr: number, cell: number) {
    this.heap[addr] = cell;
  }
}
