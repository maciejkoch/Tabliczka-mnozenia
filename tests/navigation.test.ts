import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextControl, type ControlBounds, type Direction } from '../src/navigation.ts';
const directions: Direction[] = ['left', 'right', 'up', 'down'];

test('controller navigation crosses rows and wraps at menu edges', () => {
  const bounds = Array.from({ length: 6 }, (_, i) => ({ x: i % 3 * 120, y: Math.floor(i / 3) * 100, width: 100, height: 40 }));
  assert.equal(nextControl(bounds, 0, 'right'), 1);
  assert.equal(nextControl(bounds, 1, 'down'), 4);
  assert.equal(nextControl(bounds, 4, 'up'), 1);
  assert.equal(nextControl(bounds, 2, 'right'), 0);
  assert.equal(nextControl(bounds, 0, 'left'), 2);
  assert.equal(nextControl(bounds, 0, 'up'), 3);
  assert.equal(nextControl([], 0, 'right'), -1);
  assert.equal(nextControl([bounds[0]], 0, 'right'), 0);
});

test('all buttons on an irregular menu are reachable using directional controller input', () => {
  const bounds: ControlBounds[] = [
    { x: 0, y: 0, width: 120, height: 40 }, { x: 850, y: 0, width: 90, height: 40 },
    ...Array.from({ length: 3 }, (_, i) => ({ x: i * 100, y: 250, width: 80, height: 40 })),
    { x: 0, y: 350, width: 430, height: 60 }, { x: 450, y: 350, width: 430, height: 60 },
    ...Array.from({ length: 4 }, (_, i) => ({ x: i * 120, y: 450, width: 100, height: 70 })),
    { x: 550, y: 450, width: 100, height: 70 }, { x: 680, y: 450, width: 100, height: 70 },
    { x: 0, y: 570, width: 160, height: 50 }, { x: 700, y: 570, width: 200, height: 50 },
    { x: 0, y: 660, width: 300, height: 50 }, { x: 800, y: 660, width: 100, height: 50 },
  ];
  const visited = new Set([14]);
  const queue = [14];
  while (queue.length) {
    const current = queue.shift()!;
    for (const direction of directions) {
      const next = nextControl(bounds, current, direction);
      if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  assert.equal(visited.size, bounds.length);
});
