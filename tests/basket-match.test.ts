import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BasketMatch, MATCH_SECONDS, matchTime, addMatch, parseRanking, serializeRanking, type MatchRecord } from '../src/basket-match.ts';

const record = (id: string, player = 'Emilia', correct = 2, wrong = 1): MatchRecord => ({ id, player, correct, wrong, shots: correct + wrong + 2, score: correct * 3 - wrong, mode: 'mixed', range: 'all', finishedAt: '2026-10-14T18:00:00.000Z' });

test('a timed match scores +3 for every correct basket, -1 for every wrong basket, and zero for misses and replaced shots', () => {
  const match = new BasketMatch();
  match.throw(); match.basket(true);
  assert.equal(match.score, 3);
  match.throw(); match.basket(false);
  assert.equal(match.score, 2);
  match.throw(); match.throw(); // missed or cancelled shots
  assert.equal(match.score, 2);
  assert.equal(match.missed, 2);
  match.throw(); match.basket(false);
  assert.equal(match.score, 1);
  match.throw(); match.basket(false);
  match.throw(); match.basket(false);
  assert.equal(match.score, -1);
});

test('match ends at exactly 180 seconds even during a shot or success animation; pause adds no time', () => {
  const match = new BasketMatch();
  assert.equal(matchTime(match.remaining), '3:00');
  match.tick(65.2);
  assert.equal(matchTime(match.remaining), '1:55');
  const remaining = match.remaining;
  match.tick(0); // paused game does not advance the match clock
  assert.equal(match.remaining, remaining);
  assert.equal(match.tick(114.7), false);
  assert.equal(matchTime(match.remaining), '0:01');
  match.throw();
  assert.equal(match.tick(0.2), true);
  assert.equal(match.elapsed, MATCH_SECONDS);
  assert.equal(matchTime(match.remaining), '0:00');
  match.basket(true); match.basket(false); match.throw();
  assert.equal(match.score, 0);
  assert.equal(match.shots, 1);
  assert.equal(match.tick(30), true);
});

test('all completed games remain in a sorted local-storage ranking, including negative scores and repeat players', () => {
  let ranking: MatchRecord[] = [];
  ranking = addMatch(ranking, record('first'));
  ranking = addMatch(ranking, record('negative', 'Jakub', 0, 2));
  ranking = addMatch(ranking, record('best', 'Piotr', 5, 1));
  ranking = addMatch(ranking, record('second', 'Emilia', 3, 0));
  assert.deepEqual(ranking.map(entry => entry.id), ['best', 'second', 'first', 'negative']);
  assert.deepEqual(parseRanking(serializeRanking(ranking)), ranking);
  assert.equal(addMatch(ranking, record('first')).length, 4, 'saving a game twice must not duplicate it');
});

test('corrupted ranking cannot break startup; bad entries are ignored while valid records survive', () => {
  assert.deepEqual(parseRanking('invalid json'), []);
  assert.deepEqual(parseRanking('{"version":1,"records":{}}'), []);
  const valid = record('valid');
  const records = [null, valid, valid, { ...record('score'), score: 99 }, { ...record('shots'), shots: 0 }, { ...record('date'), finishedAt: 'no date' }];
  assert.deepEqual(parseRanking(JSON.stringify({ version: 1, records })), [valid]);
});
