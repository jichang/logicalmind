import { equalTo } from "./common";
import { Tag, tagNameOf, tagOf, unmask } from "./compiler";

export class Clause {
  constructor(
    public addr = 0,
    public len = 0,
    public headAddr = 0,
    public neckAdd = 0,
    public goalAddrs: number[] = [],
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

  addCells(...cells: number[]) {
    this.cells.push(...cells);
  }

  print() {
    console.log('cells: ');
    this.cells.map((cell, index) => {
      const tag = tagOf(cell);
      const tagName = tagNameOf(cell);
      const tagValue = tag === Tag.Symbol ? this.symbols[unmask(cell)] : unmask(cell);
      console.log(`[${index}]:${cell} = ${tagName} ${tagValue}`);
    })
    console.log('symbols: ');
    this.symbols.map((symbol, index) => {
      console.log(symbol);
    })
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
