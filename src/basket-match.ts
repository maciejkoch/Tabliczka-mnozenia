import type { Mode, Range } from './learning';

export const MATCH_SECONDS = 180;
export const RANKING_KEY = 'matematyczny-basket:ranking:v1';
export class BasketMatch {
  elapsed = 0;
  shots = 0;
  correct = 0;
  wrong = 0;
  get score(): number { return this.correct * 3 - this.wrong; }
  get remaining(): number { return Math.max(0, MATCH_SECONDS - this.elapsed); }
  get finished(): boolean { return this.remaining === 0; }
  get missed(): number { return Math.max(0, this.shots - this.correct - this.wrong); }
  throw(): void { if (!this.finished) this.shots++; }
  basket(correct: boolean): void { if (!this.finished) { if (correct) this.correct++; else this.wrong++; } }
  tick(seconds: number): boolean {
    if (Number.isFinite(seconds) && seconds > 0) this.elapsed = Math.min(MATCH_SECONDS, this.elapsed + seconds);
    return this.finished;
  }
}
export function matchTime(remaining: number): string {
  const seconds = Math.max(0, Math.ceil(remaining));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export type MatchRecord = {
  id: string; player: string; score: number; correct: number; wrong: number; shots: number;
  mode: Mode; range: Range; finishedAt: string;
};
export function sortRanking(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((a, b) => b.score - a.score || b.correct - a.correct || a.wrong - b.wrong || a.finishedAt.localeCompare(b.finishedAt) || a.id.localeCompare(b.id));
}
export function parseRanking(raw: string | null): MatchRecord[] {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (value?.version !== 1 || !Array.isArray(value.records)) return [];
    const seen = new Set<string>();
    return sortRanking(value.records.filter((record: MatchRecord) => {
      if (!record || typeof record.id !== 'string' || !record.id || seen.has(record.id) || !['Emilia', 'Jakub', 'Piotr'].includes(record.player)) return false;
      if (!['correct', 'wrong', 'shots'].every((key) => Number.isSafeInteger(record[key as 'correct' | 'wrong' | 'shots']) && record[key as 'correct' | 'wrong' | 'shots'] >= 0)) return false;
      if (record.shots < record.correct + record.wrong || record.score !== 3 * record.correct - record.wrong) return false;
      if (!['multiply', 'divide', 'mixed', 'arithmetic'].includes(record.mode) || !['easy', 'hard', 'all'].includes(record.range) || typeof record.finishedAt !== 'string' || !Number.isFinite(Date.parse(record.finishedAt))) return false;
      seen.add(record.id); return true;
    }));
  } catch { return []; }
}
export function addMatch(records: MatchRecord[], record: MatchRecord): MatchRecord[] {
  return sortRanking([...records.filter((entry) => entry.id !== record.id), record]);
}
export function serializeRanking(records: MatchRecord[]): string { return JSON.stringify({ version: 1, records }); }
