export enum Tag {
  Declare = 0,
  Use,
  Reference,
  Symbol,
  Integer,
  Arity
}

export function attachTag(tag: Tag, cell: number): number {
  return cell << 3 | tag;
}

export function detachTag(cell: number): number {
  return cell >> 3
}

export function extractTag(cell: number): Tag {
  return (cell & 0b111)
}

export function extractTagName(cell: number): string {
  const tag = extractTag(cell) as Tag;
  switch (tag) {
    case Tag.Declare:
      return 'Declare';
    case Tag.Use:
      return 'Use';
    case Tag.Reference:
      return 'Reference';
    case Tag.Symbol:
      return 'Symbol';
    case Tag.Integer:
      return 'Integer';
    case Tag.Arity:
      return 'Arity';
  }
}

export function isVariableCell(cell: number) {
  const tag = extractTag(cell) as Tag;
  return tag === Tag.Declare || tag === Tag.Use;
}

export function isReferenceCell(cell: number) {
  const tag = extractTag(cell) as Tag;
  return tag === Tag.Reference;
}

export class Clause {
  constructor(
    // the key of clause
    public key = "",
    // the base of the heap where the cells for the clause start
    public baseAddr = 0,
    // the length of the code of the clause i.e., number of the heap cells the clause occupies
    public len = 0,
    // the base of the clause head
    public headAddr = 0,
    // the length of the head and thus the offset where the first body element starts (or the end of the clause if none)
    public neckAddr = 0,
    // the toplevel skeleton of a clause containing references to the location of its head and then body elements
    public goalAddrs: number[] = [],
    // the index vector containing dereferenced constants, numbers or array sizes as extracted from the outermost term
    // of the head of the clause, with 0 values marking variable positions
    public xs: number[] = []
  ) { }

  relocate(offset: number): Clause {
    return new Clause(this.key,
      this.baseAddr + offset,
      this.len, this.headAddr + offset,
      this.neckAddr + offset,
      this.goalAddrs.map(addr => {
        return addr + offset
      }),
      this.xs);
  }

  static empty() {
    return new Clause();
  }
}

export class Program {
  static MaxArgIndex = 4;

  constructor(
    public cells: number[] = [],
    public symbols: string[] = [],
    public clauses: Map<string, Clause[]> = new Map(),
  ) { }

  static empty() {
    return new Program();
  }

  size() {
    return this.cells.length;
  }

  addClause(key: string, clause: Clause) {
    const clauses = this.clauses.get(key);
    if (!clauses) {
      this.clauses.set(key, [clause]);
    } else {
      clauses.push(clause);
    }
  }

  addSymbol(symbol: string) {
    const index = this.symbols.indexOf(symbol);
    if (index !== -1) {
      return index;
    }

    this.symbols.push(symbol);

    return this.symbols.length - 1;
  }

  getSymbol(index: number) {
    return this.symbols[index];
  }

  addCells(...cells: number[]) {
    this.cells.push(...cells);
  }

  deref(cell: number) {
    while (isVariableCell(cell)) {
      const addr = detachTag(cell);
      let source = this.cells[addr];
      if (source === cell) {
        break;
      }

      source = cell;
    }

    return cell;
  }

  getCell(cellAddr: number) {
    return this.cells[cellAddr];
  }

  setCell(cellAddr: number, cell: number) {
    this.cells[cellAddr] = cell;
  }

  getReference(cellAddr: number) {
    return this.cells[detachTag(cellAddr)];
  }

  setReference(cellAddr: number, refAddr?: number) {
    this.cells[detachTag(cellAddr)] = refAddr ?? cellAddr;
  }
}
