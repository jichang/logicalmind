import { Engine } from "./engine";
import { Clause, Program } from "./program";
import { ResultValue } from "./result";

describe('Engine', () => {
  it('should support fact query', () => {
    const code = "(a) (b)";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a)' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(1);
    const answer = answers[0];
    expect(answer.headAddr).toBe(0);
    expect(answer.neckAddr).toBe(2);
    expect(answer.goalAddrs.length).toBe(0);
    expect(answer.xs.length).toBe(1);
    expect(answer.xs[0]).toBe(3);
  })

  it('should support exist fact query', () => {
    const code = "(a) (b)";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(b)' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(1);
    const answer = answers[0];
    expect(answer.headAddr).toBe(2);
    expect(answer.neckAddr).toBe(4);
    expect(answer.goalAddrs.length).toBe(0);
    expect(answer.xs.length).toBe(1);
    expect(answer.xs[0]).toBe(11);
  })

  it('should support non-exist fact query', () => {
    const code = "(a) (b)";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(c)' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(0);
  })

  it('should support exist fact query with variable', () => {
    const code = "(a (b))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a (X))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(1);
    const answer = answers[0];
    expect(answer.headAddr).toBe(0);
    expect(answer.neckAddr).toBe(3);
    expect(answer.goalAddrs.length).toBe(0);
    expect(answer.xs.length).toBe(2);
    expect(answer.xs[0]).toBe(3);
    expect(answer.xs[1]).toBe(11);
  })

  it('should support exist fact query with tuple', () => {
    const code = "(a ((b (A)) c))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a (X c))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(1);
    const answer = answers[0];
    expect(answer.headAddr).toBe(0);
    expect(answer.neckAddr).toBe(7);
    expect(answer.goalAddrs.length).toBe(0);
    expect(answer.xs.length).toBe(3);
    expect(answer.xs[0]).toBe(3);
    expect(answer.xs[1]).toBe(34);
    expect(answer.xs[2]).toBe(19);
  })

  it('should support exist fact query with tuple contains variable', () => {
    const code = "(a ((b (c)) d))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a ((b (X)) d))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(1);
    const answer = answers[0];
    expect(answer.headAddr).toBe(0);
    expect(answer.neckAddr).toBe(7);
    expect(answer.goalAddrs.length).toBe(0);
    expect(answer.xs.length).toBe(3);
    expect(answer.xs[0]).toBe(3);
    expect(answer.xs[1]).toBe(34);
    expect(answer.xs[2]).toBe(27);
  })

  it('should support exist fact query with tuple contains variable in multiple clauses', () => {
    const code = "(a ((e (c)) d)) (a ((b (c)) d)) (a ((b (e)) d))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a ((b (X)) d))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(2);
    const firstAnswer = answers[0];
    expect(firstAnswer.headAddr).toBe(7);
    expect(firstAnswer.neckAddr).toBe(14);
    expect(firstAnswer.goalAddrs.length).toBe(0);
    expect(firstAnswer.xs.length).toBe(3);
    expect(firstAnswer.xs[0]).toBe(3);
    expect(firstAnswer.xs[1]).toBe(90);
    expect(firstAnswer.xs[2]).toBe(27);

    const sndAnswer = answers[1];
    expect(sndAnswer.headAddr).toBe(14);
    expect(sndAnswer.neckAddr).toBe(21);
    expect(sndAnswer.goalAddrs.length).toBe(0);
    expect(sndAnswer.xs.length).toBe(3);
    expect(sndAnswer.xs[0]).toBe(3);
    expect(sndAnswer.xs[1]).toBe(146);
    expect(sndAnswer.xs[2]).toBe(27);
  })

  it('should support exist rule query with tuple contains variable in multiple clauses with subgoals', () => {
    const code = "(f (c)) (a ((e (X)) d) ((f (X))))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a ((e (c)) d))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(1);
    const answer = answers[0];
    expect(answer.headAddr).toBe(3);
    expect(answer.neckAddr).toBe(10);
    expect(answer.goalAddrs.length).toBe(1);
    expect(answer.goalAddrs[0]).toBe(10);
    expect(answer.xs.length).toBe(3);
    expect(answer.xs[0]).toBe(19);
    expect(answer.xs[1]).toBe(58);
    expect(answer.xs[2]).toBe(35);
  })

  it('should support non-exist rule query with tuple contains variable in multiple clauses with subgoals', () => {
    const code = "(f (d)) (a ((e (X)) d) ((f (X))))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a ((e (c)) d))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        answers.push(next.value.clause);
      }
    }

    expect(answers.length).toBe(0);
  })

  it('should support multiple rule query with tuple contains variable in multiple clauses with subgoals', () => {
    const code = "(f (d)) (f (c)) (a ((e (X)) d) ((f (X))))";
    const program = (Program.load(code) as ResultValue<Program>).value;
    const engine = new Engine();
    const result = engine.query(program, { goal: '(a ((e (X)) d))' });

    const answers: Clause[] = [];
    for (const next of result) {
      if (next.kind === 'Value') {
        const { clause } = next.value;
        answers.push(clause);
      }
    }

    expect(answers.length).toBe(2);
  })
})
