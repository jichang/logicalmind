import { Stream } from "./stream"

describe('Stream', () => {
  it('peek should return the first char when offset is 0', async () => {
    const code = "Hello";
    const stream = new Stream(code, 0);
    expect(stream.peek()).toEqual(code[0]);
  })

  it('peek should return the specific char at the offset', async () => {
    const code = "Hello";
    const stream = new Stream(code, 0);
    expect(stream.peek(1)).toEqual(code[1]);
  })
})
