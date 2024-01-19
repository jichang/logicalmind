export type ResultError<E> =
  {
    kind: 'Error',
    error: E;
  }

export type ResultValue<V> =
  {
    kind: 'Value',
    value: V
  }

export type Result<E, V> =
  ResultError<E> | ResultValue<V>

export function failure<E, V>(e: E): Result<E, V> {
  return {
    kind: 'Error',
    error: e
  }
}

export function isResultError<E, V>(result: Result<E, V>): result is ResultError<E> {
  return result.kind === 'Error';
}

export function isResultValue<E, V>(result: Result<E, V>): result is ResultValue<V> {
  return result.kind === 'Value';
}

export function success<E, V>(v: V): Result<E, V> {
  return {
    kind: 'Value',
    value: v
  }
}
