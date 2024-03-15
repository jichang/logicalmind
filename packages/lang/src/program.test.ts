import { Clause, Program } from "./program"
import { ResultValue } from "./result";

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
    program.addCells(cell1, cell2);

    expect(program.cells.length).toBe(2);
    const cells = program.cells;
    expect(cells[0]).toBe(cell1);
    expect(cells[1]).toBe(cell2);
  })

  it('should load program', () => {
    const code = "(a (b c d)) (add ((s (X)) Y (s (Z))) ((add (X Y Z))))";
    const loadResult = Program.load(code) as ResultValue<Program>;
    const program: Program = loadResult.value;
    expect(program.cells.length).toBe(21);
    expect(program.cells[0]).toBe(29);
    expect(program.cells[1]).toBe(3);
    expect(program.cells[2]).toBe(11);
    expect(program.cells[3]).toBe(19);
    expect(program.cells[4]).toBe(27);
    expect(program.cells[5]).toBe(29);
    expect(program.cells[6]).toBe(35);
    expect(program.cells[7]).toBe(82);
    expect(program.cells[8]).toBe(64);
    expect(program.cells[9]).toBe(106);
    expect(program.cells[10]).toBe(13);
    expect(program.cells[11]).toBe(43);
    expect(program.cells[12]).toBe(96);
    expect(program.cells[13]).toBe(13);
    expect(program.cells[14]).toBe(43);
    expect(program.cells[15]).toBe(120);
    expect(program.cells[16]).toBe(29);
    expect(program.cells[17]).toBe(35);
    expect(program.cells[18]).toBe(97);
    expect(program.cells[19]).toBe(65);
    expect(program.cells[20]).toBe(121);
    expect(program.symbols.length).toBe(6);
    expect(program.symbols[0]).toBe('a');
    expect(program.symbols[1]).toBe('b');
    expect(program.symbols[2]).toBe('c');
    expect(program.symbols[3]).toBe('d');
    expect(program.symbols[4]).toBe('add');
    expect(program.symbols[5]).toBe('s');
    expect(program.clauses.size).toBe(2);
    const firstClauses = program.clauses.get('a/3') as Clause[];
    expect(firstClauses.length).toBe(1);
    const firstClause = firstClauses[0];
    expect(firstClause.baseAddr).toBe(0);
    expect(firstClause.len).toBe(5);
    expect(firstClause.headAddr).toBe(0);
    expect(firstClause.neckAddr).toBe(5);
    expect(firstClause.goalAddrs.length).toBe(0);
    expect(firstClause.xs.length).toBe(4);
    expect(firstClause.xs[0]).toBe(3);
    expect(firstClause.xs[1]).toBe(11);
    expect(firstClause.xs[2]).toBe(19);
    expect(firstClause.xs[3]).toBe(27);
    const sndClauses = program.clauses.get('add/3') as Clause[];
    expect(sndClauses.length).toBe(1);
    const sndClause = sndClauses[0];
    expect(sndClause.baseAddr).toBe(5);
    expect(sndClause.len).toBe(16);
    expect(sndClause.headAddr).toBe(5);
    expect(sndClause.neckAddr).toBe(16);
    expect(sndClause.goalAddrs.length).toBe(1);
    expect(sndClause.goalAddrs[0]).toBe(16);
    expect(sndClause.xs.length).toBe(4);
    expect(sndClause.xs[0]).toBe(35);
    expect(sndClause.xs[1]).toBe(82);
    expect(sndClause.xs[2]).toBe(64);
    expect(sndClause.xs[3]).toBe(106);
  })
})