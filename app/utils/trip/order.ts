// A copy of the ids with the one at `from` moved to `to`.
export function moveId(ids: string[], from: number, to: number): string[] {
  const moved = [...ids]
  const [id] = moved.splice(from, 1)
  moved.splice(to, 0, id!)
  return moved
}
