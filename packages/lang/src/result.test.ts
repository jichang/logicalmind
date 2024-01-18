import { failure, success } from './result';

describe('Result', () => {
  it('failure should return value with kind error', () => {
    const error = new Error('');
    const result = failure(error);
    expect(result.kind).toBe('Error');
    // @ts-ignore
    expect(result.error).toBe(error);
  })

  it('success should return value with kind error', () => {
    const error = new Error('');
    const result = success(error);
    expect(result.kind).toBe('Value');
    // @ts-ignore
    expect(result.value).toBe(error);
  })
})
