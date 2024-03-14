import { Engine } from "../src/engine";
import { ConsoleExplorer } from "../src/explorer";
import { Clause } from "../src/program";

const code = "(mother (a c)) (father (b c)) (couple (X Y) ((mother (X Z)) (father (Y Z))))";
const engine = new Engine(new ConsoleExplorer());
const program = engine.load(code);
if (program.kind === "Error") {
  console.log(program.error.innerError);
}
const result = engine.query({ goal: '(couple (a b))' });
console.log(result);

const answers: Clause[] = [];
for (const next of result) {
  if (next.kind === 'Value') {
    answers.push(next.value.clause);
  }
}

console.log(answers);

