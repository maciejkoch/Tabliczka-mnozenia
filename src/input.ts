export type Command = 'left' | 'right' | 'up' | 'down' | 'confirm' | 'back' | 'pause' | 'hint' | 'menu';
export type CommandSource = 'keyboard' | 'pad-stick' | 'pad-button';
export class Input {
  onCommand: (command: Command, source: CommandSource) => void = () => {};
  onPad: (pad: Gamepad | null) => void = () => {};
  movement = 0;
  verticalMovement = 0;
  aimMovement = 0;
  aimVerticalMovement = 0;
  private keys = new Set<string>();
  private previous: Record<string, boolean> = {};
  private lastPad = '';
  private lastNavigation = 0;
  private frame = 0;
  private selectedPad: number | null = null;
  constructor() {
    const commands: Record<string, Command> = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', Enter: 'confirm', ' ': 'confirm', Escape: 'back', p: 'pause', h: 'hint', m: 'menu' };
    window.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName))) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      this.keys.add(key);
      if (commands[key]) {
        // Enter on a focused native button already triggers its click.
        if ((key === 'Enter' || key === ' ') && event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        if (!event.repeat) this.onCommand(commands[key], 'keyboard');
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
    window.addEventListener('blur', () => this.keys.clear());
    this.tick();
  }
  private tick = () => {
    let pads: (Gamepad | null)[] = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch { /* keyboard still works */ }
    const pad = (this.selectedPad !== null ? pads[this.selectedPad] : null) ?? pads.find((candidate) => candidate?.connected) ?? null;
    this.selectedPad = pad?.index ?? null;
    const identity = pad ? `${pad.index}:${pad.id}` : '';
    if (identity !== this.lastPad) { this.lastPad = identity; this.previous = {}; this.onPad(pad); }
    const down = (index: number) => !!pad?.buttons[index]?.pressed;
    const horizontal = pad?.axes[0] ?? 0;
    const vertical = pad?.axes[1] ?? 0;
    const state: Record<string, boolean> = {
      left: down(14) || horizontal < -0.45, right: down(15) || horizontal > 0.45,
      up: down(12) || vertical < -0.45, down: down(13) || vertical > 0.45,
      confirm: down(0), back: down(1), hint: down(2), menu: down(3), pause: down(9),
    };
    const now = performance.now();
    for (const [command, active] of Object.entries(state)) {
      const navigation = ['left', 'right', 'up', 'down'].includes(command);
      if (active && (!this.previous[command] || (navigation && now - this.lastNavigation > 260))) {
        this.onCommand(command as Command, navigation && !({ left: down(14), right: down(15), up: down(12), down: down(13) } as Record<string, boolean>)[command] ? 'pad-stick' : 'pad-button');
        if (navigation) this.lastNavigation = now;
      }
    }
    this.previous = state;
    const keyboard = (this.keys.has('ArrowRight') || this.keys.has('d') ? 1 : 0) - (this.keys.has('ArrowLeft') || this.keys.has('a') ? 1 : 0);
    this.movement = keyboard || (down(14) ? -1 : down(15) ? 1 : Math.abs(horizontal) > 0.18 ? horizontal : 0);
    const keyboardVertical = (this.keys.has('ArrowDown') || this.keys.has('s') ? 1 : 0) - (this.keys.has('ArrowUp') || this.keys.has('w') ? 1 : 0);
    this.aimMovement = keyboard || (Math.abs(horizontal) > 0.18 ? horizontal : 0);
    this.aimVerticalMovement = keyboardVertical || (Math.abs(vertical) > 0.18 ? vertical : 0);
    this.verticalMovement = keyboardVertical || (down(12) ? -1 : down(13) ? 1 : Math.abs(vertical) > 0.18 ? vertical : 0);
    this.frame = requestAnimationFrame(this.tick);
  };
  getPad(): Gamepad | null {
    try { return this.selectedPad === null ? null : navigator.getGamepads()[this.selectedPad] ?? null; } catch { return null; }
  }
  dispose(): void { cancelAnimationFrame(this.frame); }
}
