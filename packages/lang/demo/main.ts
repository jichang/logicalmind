import { Engine } from "../src/engine";
import { ConsoleExplorer } from "../src/explorer";
import { Clause, Program } from "../src/program";
import { isResultError } from "../src/result";

const code = "(mother (a c)) (father (b c)) (couple (X Y) ((mother (X Z)) (father (Y Z))))";
const engine = new Engine(new ConsoleExplorer());
const program = Program.load(code);
if (isResultError(program)) {
  console.log(program.error.innerError);
} else {
  const result = engine.query(program.value, { goal: '(couple (a b))' });
  console.log(result);

  const answers: Clause[] = [];
  for (const next of result) {
    if (next.kind === 'Value') {
      answers.push(next.value.clause);
    }
  }

  console.log(answers);
}
