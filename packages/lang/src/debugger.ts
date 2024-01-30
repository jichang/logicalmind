import { Program, Tag, tagNameOf, tagOf, unmask } from "./program";

export class Debugger {
  static default() {
    return new Debugger();
  }

  print(program: Program) {
    const cells =
      program.cells.map((cell, index) => {
        const tag = tagOf(cell);
        const tagName = tagNameOf(cell);
        const tagValue = tag === Tag.Symbol ? program.symbols[unmask(cell)] : unmask(cell);
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

