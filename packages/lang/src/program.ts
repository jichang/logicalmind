import { equalTo } from "./common";
import { tagOf, unmask } from "./compiler";

export class Clause {
  constructor(
    public addr = 0,
    public len = 0,
    public neck = 0,
    public hgs: number[] = [],
    public xs: number[] = []
  ) { }

  static empty() {
    return new Clause();
  }
}

export class Program {
  constructor(
    public cells: number[] = [],
    public symbols: string[] = [],
    public clauses: Map<string, Clause[]> = new Map(),
  ) { }


  static empty() {
    return new Program();
  }

  addClause(key: string, clause: Clause) {
    const clauses = this.clauses.get(key);
    if (!clauses) {
      this.clauses.set(key, [clause]);
    } else {
      clauses.push(clause);
    }
  }

  findSymbol(symbol: string) {
    return this.symbols.findIndex(equalTo(symbol));
  }

  addSymbol(symbol: string) {
    const index = this.symbols.findIndex(equalTo(symbol));
    if (index === -1) {
      this.symbols.push(symbol);
    }
  }

  addCells(cells: number[]) {
    this.cells.push(...cells);
  }

  append(program: Program) { }

  print() {
    console.log('cells: ');
    for (const cell of this.cells) {
      console.log(`${cell}: ${tagOf(cell)} ${unmask(cell)}`);
    }
    console.log('symbols: ');
    for (const symbol of this.symbols) {
      console.log(symbol);
    }
    console.log('clauses: ');
    for (const value of this.clauses) {
      const [key, clauses] = value;
      console.log(key);
      for (const clause of clauses) {
        console.log(clause);
      }
    }
  }
}
