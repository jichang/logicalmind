import { Engine, EngineResult } from "../src/engine";
import { printCell } from "../src/explorer";
import { Clause, Program, Tag, attachTag, detachTag } from "../src/program";
import { ResultValue } from "../src/result";

const code = "(a (b))";
const engine = new Engine();
engine.load(code);
const result = engine.query('(a (X))');

const answers: Clause[] = [];
for (const next of result) {
  answers.push((next as ResultValue<Clause>).value);
}

