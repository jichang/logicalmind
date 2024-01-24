import { Clause, Program } from "./program"

describe('Program', () => {
  it('addClause', () => {
    const program = Program.empty();
    const clause1 = Clause.empty();
    const clause2 = Clause.empty();

    program.addClause('a', clause1);
    program.addClause('a', clause2);

    expect(program.clauses.size).toBe(1);
    const clauses = program.clauses.get('a') as Clause[];
    expect(clauses[0]).toBe(clause1);
    expect(clauses[1]).toBe(clause2);
  })

  it('addSymbol', () => {
    const program = Program.empty();
    const symbol1 = 'a';
    const symbol2 = 'b';
    program.addSymbol(symbol1);
    program.addSymbol(symbol2);

    expect(program.symbols.length).toBe(2);
    const symbols = program.symbols;
    expect(symbols[0]).toBe(symbol1);
    expect(symbols[1]).toBe(symbol2);
  })

  it('addCells', () => {
    const program = Program.empty();
    const cell1 = 0;
    const cell2 = 1;
    program.addCells([cell1, cell2]);

    expect(program.cells.length).toBe(2);
    const cells = program.cells;
    expect(cells[0]).toBe(cell1);
    expect(cells[1]).toBe(cell2);
  })
})