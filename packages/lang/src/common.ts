
export function isVariableLiteral(value: string) {
  const firstChar = value[0];

  return firstChar.toUpperCase() === firstChar && firstChar !== firstChar.toLowerCase();
}

export function equalTo<T>(a: T) {
  return (b: T) => {
    return a === b;
  }
}
