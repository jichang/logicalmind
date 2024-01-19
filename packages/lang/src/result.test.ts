import { failure, isResultError, isResultValue, success } from './result';

describe('Result', () => {
  it('failure should return value with kind error', () => {
    const error = new Error('');
    const result = failure(error);
    expect(isResultError(result)).toBe(true);
    // @ts-ignore
    expect(result.error).toBe(error);
  })

  it('success should return value with kind error', () => {
    const error = new Error('');
    const result = success(error);
    expect(isResultValue(result)).toBe(true);
    // @ts-ignore
    expect(result.value).toBe(error);
  })
})
