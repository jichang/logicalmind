import { isVariable } from './common';

describe('isVariable', () => {
  it('should return true for upper case letter', () => {
    expect(isVariable('Abbb')).toBe(true);
  })

  it('should return true for lower case letter', () => {
    expect(isVariable('bbbb')).toBe(false);
  })

  it('should return false for number', () => {
    expect(isVariable('11111')).toBe(false);
  })

  it('should return false for special language', () => {
    expect(isVariable('测试')).toBe(false);
  })
})
