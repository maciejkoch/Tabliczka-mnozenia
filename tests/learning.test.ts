import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerChoices, chooseFact, equation, explanation, factPool, freshProgress, parseProgress, updateFact } from '../src/learning.ts';

test('addition and subtraction cover 0–20, including zero, with no negative results or sums over 20', () => {
  const pool = factPool('arithmetic', 'all');
  assert.equal(pool.length, 462);
  assert.equal(new Set(pool.map((fact) => fact.id)).size, 462);
  for (let a = 0; a <= 20; a++) for (let b = 0; b <= 20; b++) {
    assert.equal(pool.some((fact) => fact.op === 'add' && fact.a === a && fact.b === b && fact.answer === a + b), a + b <= 20);
    assert.equal(pool.some((fact) => fact.op === 'subtract' && fact.a === a && fact.b === b && fact.answer === a - b), b <= a);
  }
  assert.deepEqual(factPool('arithmetic', 'easy'), pool);
  assert.deepEqual(factPool('arithmetic', 'hard'), pool);
  for (const fact of pool) {
    assert.ok(fact.a >= 0 && fact.a <= 20 && fact.b >= 0 && fact.b <= 20);
    assert.ok(fact.answer >= 0 && fact.answer <= 20);
    assert.equal(equation(fact), `${fact.a} ${fact.op === 'add' ? '+' : '−'} ${fact.b}`);
    assert.ok(explanation(fact).includes(fact.op === 'add' ? 'dokładasz' : 'zabierasz'));
  }
});

test('arithmetic answer gates include zero and stay inside 0–20 even at the boundaries', () => {
  for (const fact of factPool('arithmetic', 'all')) for (let trial = 0; trial < 10; trial++) {
    const choices = answerChoices(fact);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices).size, 3);
    assert.ok(choices.includes(fact.answer));
    assert.ok(choices.every((choice) => Number.isInteger(choice) && choice >= 0 && choice <= 20));
  }
});

test('full mixed pool contains every multiplication and exact inverse division through 10 × 10', () => {
  const facts = factPool('mixed', 'all');
  assert.equal(facts.length, 200);
  assert.equal(new Set(facts.map((fact) => fact.id)).size, 200);
  for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
    assert.ok(facts.some((fact) => fact.op === 'multiply' && fact.a === a && fact.b === b && fact.answer === a * b));
    assert.ok(facts.some((fact) => fact.op === 'divide' && fact.a === a * b && fact.b === a && fact.answer === b));
  }
  assert.ok(facts.some((fact) => fact.a === 100 && fact.b === 10 && fact.answer === 10));
});

test('every question has exactly three unique in-range answers, including the correct one', () => {
  for (const fact of factPool('mixed', 'all')) for (let trial = 0; trial < 20; trial++) {
    const choices = answerChoices(fact);
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices).size, 3);
    assert.ok(choices.includes(fact.answer));
    assert.ok(choices.every((choice) => Number.isInteger(choice) && choice >= 1 && choice <= (fact.op === 'divide' ? 10 : 100)));
  }
});

test('ranges select multiplication factors and division divisors without fractional answers', () => {
  for (const range of ['easy', 'hard'] as const) {
    const low = range === 'easy' ? 1 : 6;
    const high = range === 'easy' ? 5 : 10;
    const pool = factPool('mixed', range);
    assert.equal(pool.length, 100);
    for (const fact of pool) {
      const factor = fact.op === 'multiply' ? fact.a : fact.b;
      assert.ok(factor >= low && factor <= high);
      assert.equal(fact.op === 'multiply' ? fact.a * fact.b : fact.a / fact.b, fact.answer);
    }
  }
});

test('recent questions are spaced out and mistakes increase their sampling priority', () => {
  const pool = factPool('multiply', 'all');
  const progress = freshProgress();
  const recent = pool.slice(0, 4).map((fact) => fact.id);
  for (let i = 0; i < 100; i++) assert.ok(!recent.includes(chooseFact(pool, progress, recent, 7).id));
  updateFact(progress, pool[5], false, 0);
  const allCorrect = freshProgress();
  updateFact(allCorrect, pool[5], true, 0);
  let mistakesPicked = 0, correctPicked = 0;
  for (let step = 0; step < 10000; step++) {
    const random = () => step / 10000;
    if (chooseFact(pool, progress, [], 5, random).id === pool[5].id) mistakesPicked++;
    if (chooseFact(pool, allCorrect, [], 5, random).id === pool[5].id) correctPicked++;
  }
  assert.ok(mistakesPicked > correctPicked);
});

test('help and incorrect answers reset independent-answer streak; saved progress round-trips safely', () => {
  const progress = freshProgress();
  const fact = factPool('divide', 'all')[0];
  updateFact(progress, fact, true, 0); updateFact(progress, fact, true, 1); updateFact(progress, fact, false, 2);
  assert.equal(progress.facts[fact.id].correct, 2);
  assert.equal(progress.facts[fact.id].wrong, 1);
  assert.equal(progress.facts[fact.id].streak, 0);
  assert.deepEqual(parseProgress(JSON.stringify(progress)), progress);
  for (const raw of ['broken', 'null', '{}', '{"version":1,"missions":-1}', '{"version":1,"missions":0,"crystals":0,"facts":[],"planets":{}}']) assert.deepEqual(parseProgress(raw), freshProgress());
});
