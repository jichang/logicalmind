import { Tag, attachTag, detachTag, Program } from "./program";
import { QueryContext } from "./query";

describe('QueryContext', () => {

  it('should relocate cells for variables and reference', () => {
    const queryContext = new QueryContext(Program.empty());
    const value = 100;
    const offset = 100;
    for (const tag of [Tag.Use, Tag.Declare, Tag.Reference]) {
      const cell = attachTag(tag, value);
      const result = queryContext.relocate(cell, offset);
      expect(detachTag(result)).toBe(value + offset);
    }

    for (const tag of [Tag.Arity, Tag.Integer, Tag.Symbol]) {
      const cell = attachTag(tag, value);
      const result = queryContext.relocate(cell, offset);
      expect(detachTag(result)).toBe(value);
    }
  })

  it('copyToHeap should relocate cells for variable and reference', () => {
    const queryContext = new QueryContext(Program.empty());
    queryContext.program = Program.empty();
    queryContext.heap.push(attachTag(Tag.Arity, 1));

    const cells = [
      attachTag(Tag.Arity, 0),
      attachTag(Tag.Declare, 1),
      attachTag(Tag.Integer, 2),
      attachTag(Tag.Reference, 3),
      attachTag(Tag.Symbol, 4),
      attachTag(Tag.Use, 1)
    ];
    queryContext.copyToHeap(cells, 0, cells.length);

    expect(queryContext.heap[0]).toBe(attachTag(Tag.Arity, 1));
    expect(queryContext.heap[1]).toBe(attachTag(Tag.Arity, 0));
    expect(queryContext.heap[2]).toBe(attachTag(Tag.Declare, 2));
    expect(queryContext.heap[3]).toBe(attachTag(Tag.Integer, 2));
    expect(queryContext.heap[4]).toBe(attachTag(Tag.Reference, 4));
    expect(queryContext.heap[5]).toBe(attachTag(Tag.Symbol, 4));
    expect(queryContext.heap[6]).toBe(attachTag(Tag.Use, 2));
  })

  it('getRef should follow reference chain', () => {
    const queryContext = new QueryContext(Program.empty());
    queryContext.heap.push(attachTag(Tag.Declare, 0), attachTag(Tag.Use, 0), attachTag(Tag.Use, 0));

    expect(queryContext.getReferencedCell(queryContext.heap[0])).toBe(0);
    expect(queryContext.getReferencedCell(queryContext.heap[1])).toBe(0);
    expect(queryContext.getReferencedCell(queryContext.heap[2])).toBe(0);
  })

  it('deReference should follow reference chain', () => {
    const queryContext = new QueryContext(Program.empty());
    queryContext.heap.push(attachTag(Tag.Declare, 0), attachTag(Tag.Use, 0), attachTag(Tag.Use, 1));

    expect(queryContext.deReference(queryContext.heap[0])).toBe(0);
    expect(queryContext.deReference(queryContext.heap[1])).toBe(0);
    expect(queryContext.deReference(queryContext.heap[2])).toBe(0);
  })
})