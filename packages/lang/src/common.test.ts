import { isVariableLiteral } from './common';

describe('isVariable', () => {
  it('should return true for upper case letter', () => {
    expect(isVariableLiteral('Abbb')).toBe(true);
  })

  it('should return true for lower case letter', () => {
    expect(isVariableLiteral('bbbb')).toBe(false);
  })

  it('should return false for number', () => {
    expect(isVariableLiteral('11111')).toBe(false);
  })

  it('should return false for special language', () => {
    expect(isVariableLiteral('测试')).toBe(false);
  })
})
