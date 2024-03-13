import { QueryContext } from "./query";
import { Program, Tag, extractTagName, extractTag, detachTag } from "./program";

export function printCell(cell: number) {
  const tagName = extractTagName(cell);
  const tagValue = detachTag(cell);
  return `[${tagName}:${tagValue}]`;
}

export interface IExplorer {
  trackStep(step: string, ...args: any): void;
  printQueryContext(queryContext: QueryContext, program: Program): void;
  printProgram(program: Program): void;
}

export class EmptyExplorer {
  trackStep(step: string, ...args: any) { }
  printQueryContext(queryContext: QueryContext, program: Program) { }
  printProgram(program: Program) { }
}

export class Explorer implements IExplorer {
  trackStep(step: string, ...args: any) {
    console.log(`Execute step ${step}: ${args}`)
  }

  printQueryContext(queryContext: QueryContext, program: Program) {
    const cells =
      queryContext.heap.map((cell, index) => {
        const tag = extractTag(cell);
        const tagName = extractTagName(cell);
        const tagValue = tag === Tag.Symbol ? program.symbols[detachTag(cell)] : detachTag(cell);
        return `[${index}]:${cell} = ${tagName} ${tagValue}`;
      }).join('\n');

    const frames = queryContext.frames.map((frame) => {
      return JSON.stringify(frame, undefined, 0);
    }).join('\n');

    console.log([`Heap:\n${cells}`, `Frames:\n${frames}`].join('\n\n'));
  }

  printProgram(program: Program) {
    const cells =
      program.cells.map((cell, index) => {
        const tag = extractTag(cell);
        const tagName = extractTagName(cell);
        const tagValue = tag === Tag.Symbol ? program.symbols[detachTag(cell)] : detachTag(cell);
        return `[${index}]:${cell} = ${tagName} ${tagValue}`;
      }).join('\n');

    const symbols =
      program.symbols.map((symbol, index) => {
        return `[${index}]: ${symbol}`;
      }).join('\n')

    const clauses = Array.from(program.clauses.entries()).map(entry => {
      const clauseKey = entry[0];
      const clauses = entry[1].map(clause => {
        return JSON.stringify(clause, null, 2)
      }).join('\n');
      return `${clauseKey}\n${clauses}`
    }).join('\n')

    console.log([`Cells:\n${cells}`, `Symbols:\n${symbols}`, `Clauses:\n${clauses}`].join('\n\n'));
  }
}

