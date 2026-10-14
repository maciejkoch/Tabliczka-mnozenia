export type Mode = 'multiply' | 'divide' | 'mixed';
export type Range = 'all' | 'easy' | 'hard';
export type Fact = { id: string; op: 'multiply' | 'divide'; a: number; b: number; answer: number };
export type RecordEntry = { correct: number; wrong: number; streak: number; lastSeen: number };
export type Progress = { version: 1; missions: number; crystals: number; facts: Record<string, RecordEntry>; planets: Record<string, number> };

export function freshProgress(): Progress {
  return { version: 1, missions: 0, crystals: 0, facts: {}, planets: {} };
}

export function factPool(mode: Mode, range: Range): Fact[] {
  const facts: Fact[] = [];
  const low = range === 'hard' ? 6 : 1;
  const high = range === 'easy' ? 5 : 10;
  for (let a = low; a <= high; a++) {
    for (let b = 1; b <= 10; b++) {
      if (mode !== 'divide') facts.push({ id: `m:${a}:${b}`, op: 'multiply', a, b, answer: a * b });
      if (mode !== 'multiply') facts.push({ id: `d:${a * b}:${a}`, op: 'divide', a: a * b, b: a, answer: b });
    }
  }
  return facts;
}

export function chooseFact(pool: Fact[], progress: Progress, recent: string[], questionIndex: number, random = Math.random): Fact {
  const available = pool.filter((fact) => !recent.slice(-4).includes(fact.id));
  const candidates = available.length ? available : pool;
  if (!candidates.length) throw new Error('Brak działań w wybranym zakresie.');
  const weights = candidates.map((fact) => {
    const record = progress.facts[fact.id];
    if (!record) return 3;
    const retryDue = questionIndex - record.lastSeen >= 3;
    return 1 + Math.max(0, record.wrong - record.correct / 2) * (retryDue ? 3 : 0.3) + 3 / (record.streak + 1);
  });
  let value = random() * weights.reduce((total, weight) => total + weight, 0);
  for (let i = 0; i < candidates.length; i++) {
    value -= weights[i];
    if (value < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export function answerChoices(fact: Fact, random = Math.random): number[] {
  const upper = fact.op === 'divide' ? 10 : 100;
  const choices = new Set<number>([fact.answer]);
  const offsets = fact.op === 'divide' ? [-1, 1, -2, 2] : [-fact.b, fact.b, -fact.a, fact.a, -1, 1];
  for (const offset of offsets.sort(() => random() - 0.5)) {
    const value = fact.answer + offset;
    if (value >= 1 && value <= upper) choices.add(value);
    if (choices.size === 3) break;
  }
  for (let value = 1; choices.size < 3; value++) choices.add(value);
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function updateFact(progress: Progress, fact: Fact, firstTry: boolean, index: number): void {
  const record = progress.facts[fact.id] ?? { correct: 0, wrong: 0, streak: 0, lastSeen: 0 };
  if (firstTry) { record.correct++; record.streak++; }
  else { record.wrong++; record.streak = 0; }
  record.lastSeen = index;
  progress.facts[fact.id] = record;
}

export function equation(fact: Fact): string {
  return `${fact.a} ${fact.op === 'multiply' ? '×' : '÷'} ${fact.b}`;
}

export function explanation(fact: Fact): string {
  if (fact.op === 'divide') return `Podziel ${fact.a} kryształów na grupy po ${fact.b}. Ile grup powstanie?`;
  if (fact.a === 1) return `Jedna grupa po ${fact.b} kryształów. Policz kryształy w grupie.`;
  if (fact.a > 5) return `5 × ${fact.b} = ${5 * fact.b}. Dodaj jeszcze ${fact.a - 5} ${fact.a - 5 === 1 ? 'grupę' : fact.a - 5 < 5 ? 'grupy' : 'grup'} po ${fact.b}.`;
  return `${fact.a} ${fact.a < 5 ? 'grupy' : 'grup'} po ${fact.b} kryształów. Możesz dodawać ${fact.b} krok po kroku.`;
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return freshProgress();
  try {
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1 || !Number.isFinite(parsed.missions) || parsed.missions < 0 || !Number.isFinite(parsed.crystals) || parsed.crystals < 0 || !parsed.facts || typeof parsed.facts !== 'object' || Array.isArray(parsed.facts) || !parsed.planets || typeof parsed.planets !== 'object' || Array.isArray(parsed.planets)) return freshProgress();
    const result = freshProgress();
    result.missions = Math.floor(parsed.missions);
    result.crystals = Math.floor(parsed.crystals);
    for (const [id, value] of Object.entries(parsed.facts)) {
      const entry = value as RecordEntry;
      if (!entry || !['correct', 'wrong', 'streak', 'lastSeen'].every((key) => Number.isFinite(entry[key as keyof RecordEntry]) && entry[key as keyof RecordEntry] >= 0)) continue;
      result.facts[id] = { correct: entry.correct, wrong: entry.wrong, streak: entry.streak, lastSeen: entry.lastSeen };
    }
    for (const [id, value] of Object.entries(parsed.planets)) if (Number.isInteger(value) && Number(value) >= 0) result.planets[id] = Math.min(3, Number(value));
    return result;
  } catch { return freshProgress(); }
}
