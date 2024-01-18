
export function isVariable(value: string) {
  const firstChar = value[0];

  return firstChar.toUpperCase() === firstChar && firstChar !== firstChar.toLowerCase();
}