import { Clause, Program } from "./program";

export class Spine {
  public top: number = 0;

  constructor(
    // base addr of the heap where the clause starts
    public baseAddr: number,
    // head addr of the clause
    public headAddr: number,
    // goals addr of the clause
    public goalsAddrs: number[],
    // top addr of the trail when this clause is unified
    public trailTopAddr: number,
    // index of the last clause the top goal of the Spine has tried to match so far
    public lastClauseIndex: number,
    // dereferenced goal registers
    public regs: number[],
    // index elements based on regs
    public xs: number[]
  ) { }

  static answer(headAddr: number, trailTopAddr: number) {
    return new Spine(0, headAddr, [], trailTopAddr, -1, [], [])
  }
}

export class Engine {
  public heapTop: number = 0;
  public trails: Spine[] = []
  public uStack: number[] = []
  public spines: Spine[] = []

  constructor(
    public program: Program
  ) { }

  answer(program: Program, query: Clause) { }
}
