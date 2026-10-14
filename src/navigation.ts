export type Direction = 'left' | 'right' | 'up' | 'down';
export type ControlBounds = { x: number; y: number; width: number; height: number };
// Prefer controls in the same row/column; wrap at an edge so no menu is a dead end.
export function nextControl(bounds: ControlBounds[], current: number, command: Direction): number {
  if (!bounds.length) return -1;
  if (!bounds[current]) return 0;
  const origin = bounds[current];
  const horizontal = command === 'left' || command === 'right';
  const direction = command === 'left' || command === 'up' ? -1 : 1;
  const candidates = bounds.map((rect, index) => {
    const dx = rect.x + rect.width / 2 - origin.x - origin.width / 2;
    const dy = rect.y + rect.height / 2 - origin.y - origin.height / 2;
    return { index, primary: (horizontal ? dx : dy) * direction, cross: Math.abs(horizontal ? dy : dx) };
  }).filter((candidate) => candidate.index !== current);
  const forward = candidates.filter((candidate) => candidate.primary > 5).sort((a, b) => a.primary + a.cross * 3 - b.primary - b.cross * 3);
  if (forward.length) return forward[0].index;
  return candidates.filter((candidate) => candidate.primary < -5).sort((a, b) => a.primary + a.cross * 3 - b.primary - b.cross * 3)[0]?.index ?? current;
}
