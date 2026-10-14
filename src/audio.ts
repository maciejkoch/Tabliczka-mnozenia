export class Sound {
  enabled = true;
  private context: AudioContext | null = null;
  unlock(): void {
    if (!this.enabled) return;
    try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* audio is optional */ }
  }
  play(kind: 'select' | 'correct' | 'hint' | 'crystal' | 'win'): void {
    if (!this.enabled) return;
    this.unlock();
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const melodies = { select: [350], correct: [523, 659, 784], hint: [330, 392], crystal: [1100, 1400], win: [523, 659, 784, 1047] };
    melodies[kind].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.095;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + 0.2);
    });
  }
}
