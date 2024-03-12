import { Program, Tag, extractTagName, extractTag, detachTag } from "./program";

export function printCell(cell: number) {
  const tagName = extractTagName(cell);
  const tagValue = detachTag(cell);
  return `[${tagName}:${tagValue}]`;
}

export class Explorer {
  logs: any[] = [];

  static default() {
    return new Explorer();
  }

  log(...args: any) {
    this.logs.push(args);
  }

  print(program: Program) {
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

