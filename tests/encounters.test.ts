import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnswerAction, encounterFor } from '../src/encounters.ts';

test('a mission alternates shooting and portals before three boss generators; calm keeps gates', () => {
  assert.deepEqual(Array.from({ length: 12 }, (_, i) => encounterFor(i, false)),
    ['laser', 'portal', 'laser', 'portal', 'laser', 'portal', 'laser', 'portal', 'laser', 'boss', 'boss', 'boss']);
  assert.ok(Array.from({ length: 12 }, (_, i) => encounterFor(i, true)).every((kind) => kind === 'gate'));
});

test('holding A cannot replace a committed answer; impact resolves once using game time', () => {
  const action = new AnswerAction();
  assert.equal(action.begin(2, 0.6), true);
  assert.equal(action.begin(0, 0.6), false);
  assert.equal(action.tick(0.2), null);
  assert.equal(action.tick(0), null); // No game time passes during pause.
  assert.equal(action.active, true);
  assert.equal(action.tick(0.41), 2);
  assert.equal(action.active, false);
  assert.equal(action.tick(10), null);
  assert.equal(action.begin(0, 0.6), true);
});

test('restart cancels an in-flight answer so it cannot answer the next mission', () => {
  const action = new AnswerAction();
  action.begin(1, 0.8);
  action.tick(0.4);
  action.cancel();
  assert.equal(action.tick(1), null);
  assert.equal(action.begin(2, 0.8), true);
  assert.equal(action.tick(0.9), 2);
});
