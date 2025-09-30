export function padToGrid<T>(data: T[], cols: number, makeEmpty?: () => T): T[] {
  const r = data.length % cols;
  if (r === 0) return data;
  const empties = Array.from({ length: cols - r }, () =>
    makeEmpty ? makeEmpty() : ({ __empty: true } as T)
  );
  return [...data, ...empties];
}
