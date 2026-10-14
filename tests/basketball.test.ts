import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BasketballPhysics, crossedHoop, hoopLayout, LAUNCH, type ShotResult } from '../src/basketball.ts';

function simulate(angle: number, power: number, round = 0): { result: ShotResult | null; bounces: number } {
  const physics = new BasketballPhysics();
  physics.reset(round);
  let bounces = 0;
  physics.onBounce = () => bounces++;
  physics.shoot(angle, power);
  let result: ShotResult | null = null;
  for (let i = 0; i < 480 && !result; i++) result = physics.tick(1 / 60);
  return { result, bounces };
}

test('only downward entries with room for the whole ball score a basket', () => {
  const hoop = { x: 400, y: 250 };
  assert.equal(crossedHoop({ x: 395, y: 245 }, { x: 405, y: 260 }, hoop), true);
  assert.equal(crossedHoop({ x: 400, y: 260 }, { x: 400, y: 245 }, hoop), false);
  assert.equal(crossedHoop({ x: 435, y: 245 }, { x: 435, y: 260 }, hoop), false);
  assert.equal(crossedHoop({ x: 400, y: 255 }, { x: 400, y: 260 }, hoop), false);
});

test('ball bounces off the floor and a missed shot eventually permits a retry', () => {
  const { result, bounces } = simulate(25, 10);
  assert.deepEqual(result, { kind: 'miss' });
  assert.ok(bounces >= 2, 'ball must visibly bounce multiple times');
});

test('a paused simulation stays still, holding throw cannot replace a shot, and reset cancels it', () => {
  const physics = new BasketballPhysics();
  physics.reset(0);
  assert.equal(physics.shoot(62, 55), true);
  assert.equal(physics.shoot(30, 20), false);
  physics.tick(0.1);
  const before = { ...physics.ball!.position };
  assert.equal(physics.tick(0), null);
  assert.deepEqual(physics.ball!.position, before);
  physics.reset(1);
  assert.equal(physics.ball, null);
  assert.equal(physics.tick(1), null);
  assert.equal(physics.shoot(62, 55), true);
});

test('every basket in every layout is reachable using available angle and power', () => {
  for (let round = 0; round < 3; round++) {
    for (const [index, hoop] of hoopLayout(round).entries()) {
      let reachable = false;
      for (let angle = 50; angle <= 78 && !reachable; angle += 2) {
        const theta = angle * Math.PI / 180;
        const dx = hoop.x - LAUNCH.x;
        const rise = LAUNCH.y - hoop.y;
        const speed = Math.sqrt(800 * dx * dx / (2 * Math.cos(theta) ** 2 * (dx * Math.tan(theta) - rise)));
        const estimated = (speed - 430) / 5.4;
        for (const offset of [0, 1, 2, 3, -1, -2, -3, 4, 5]) {
          const power = Math.round(estimated + offset);
          if (power < 10 || power > 100) continue;
          const { result } = simulate(angle, power, round);
          if (result?.kind === 'basket' && result.index === index) { reachable = true; break; }
        }
      }
      assert.ok(reachable, `layout ${round}, basket ${index} must have a playable shot`);
    }
  }
});

test('physics results are independent of display refresh rate and baskets resolve once', () => {
  const play = (dt: number) => {
    const physics = new BasketballPhysics(); physics.reset(0); physics.shoot(62, 55);
    const results: ShotResult[] = [];
    for (let i = 0; i < Math.round(8 / dt); i++) { const result = physics.tick(dt); if (result) results.push(result); }
    return { results, position: physics.ball!.position };
  };
  const slow = play(1 / 30), fast = play(1 / 120);
  assert.deepEqual(slow.results, fast.results);
  assert.equal(slow.results.length, 1);
  assert.ok(Math.abs(slow.position.x - fast.position.x) < 1);
});


test('an explicit retry immediately replaces the moving ball and uses the new angle and power', () => {
  const physics = new BasketballPhysics();
  physics.reset(0);
  physics.shoot(62, 55);
  physics.tick(0.1);
  const oldBall = physics.ball;
  assert.equal(physics.active, true);
  assert.equal(physics.shoot(50, 20, true), true);
  assert.notEqual(physics.ball, oldBall);
  assert.deepEqual(physics.ball!.position, LAUNCH);
  assert.equal(physics.engine.world.bodies.filter(body => !body.isStatic).length, 1);
  let result: ShotResult | null = null;
  for (let i = 0; i < 480 && !result; i++) result = physics.tick(1 / 60);
  assert.deepEqual(result, { kind: 'basket', index: 0 });
});
