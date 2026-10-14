export type Encounter = 'gate' | 'laser' | 'portal' | 'boss';

export function encounterFor(question: number, calm: boolean): Encounter {
  if (calm) return 'gate';
  if (question >= 9) return 'boss';
  return question % 2 === 0 ? 'laser' : 'portal';
}

/** Uses game time, so pausing the scene also pauses the committed answer. */
export class AnswerAction {
  private pending: { index: number; elapsed: number; duration: number } | null = null;
  get active(): boolean { return this.pending !== null; }
  get progress(): number { return this.pending ? Math.min(1, this.pending.elapsed / this.pending.duration) : 0; }
  begin(index: number, duration: number): boolean {
    if (this.pending || !Number.isInteger(index) || index < 0 || index > 2 || duration <= 0) return false;
    this.pending = { index, elapsed: 0, duration };
    return true;
  }
  tick(seconds: number): number | null {
    if (!this.pending) return null;
    this.pending.elapsed += Math.max(0, seconds);
    if (this.pending.elapsed < this.pending.duration) return null;
    const index = this.pending.index;
    this.pending = null;
    return index;
  }
  cancel(): void { this.pending = null; }
}
