import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Events } = Matter;
export const BALL_RADIUS = 12;
export const LAUNCH = { x: 180, y: 420 };
export const GROUND = 520;
export const HOOP_HALF_WIDTH = 43;
export type Hoop = { x: number; y: number };
export type ShotResult = { kind: 'basket'; index: number } | { kind: 'miss' };
const layouts: Hoop[][] = [
  [{ x: 455, y: 335 }, { x: 700, y: 275 }, { x: 960, y: 205 }],
  [{ x: 430, y: 285 }, { x: 690, y: 350 }, { x: 950, y: 255 }],
  [{ x: 475, y: 365 }, { x: 735, y: 230 }, { x: 970, y: 305 }],
];
export function hoopLayout(round: number): Hoop[] { return layouts[round % layouts.length].map((hoop) => ({ ...hoop })); }
export function shotVelocity(angle: number, power: number): { x: number; y: number } {
  const radians = angle * Math.PI / 180;
  const speed = (430 + power * 5.4) / 60;
  return { x: Math.cos(radians) * speed, y: -Math.sin(radians) * speed };
}
// A basket requires the whole ball to fit inside the rim while travelling down.
export function crossedHoop(previous: { x: number; y: number }, current: { x: number; y: number }, hoop: Hoop): boolean {
  if (previous.y >= hoop.y || current.y < hoop.y || current.y <= previous.y) return false;
  const x = previous.x + (current.x - previous.x) * (hoop.y - previous.y) / (current.y - previous.y);
  return Math.abs(x - hoop.x) < HOOP_HALF_WIDTH - BALL_RADIUS - 4;
}
export class BasketballPhysics {
  readonly engine = Engine.create({ positionIterations: 10, velocityIterations: 10 });
  ball: Matter.Body | null = null;
  hoops: Hoop[] = [];
  active = false;
  onBounce: () => void = () => {};
  private accumulator = 0;
  private elapsed = 0;
  private settled = 0;
  private resolved = false;
  constructor() {
    this.engine.gravity.scale = 0.0008;
    Events.on(this.engine, 'collisionStart', (event) => {
      if (this.ball && this.ball.speed > 1 && event.pairs.some((pair) => pair.bodyA === this.ball || pair.bodyB === this.ball)) this.onBounce();
    });
  }
  reset(round: number): void {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.ball = null; this.active = false; this.accumulator = 0; this.elapsed = 0; this.settled = 0; this.resolved = false;
    this.hoops = hoopLayout(round);
    const fixed = { isStatic: true, restitution: 0.6, friction: 0.25 };
    Composite.add(this.engine.world, [
      Bodies.rectangle(550, GROUND + 25, 1200, 50, fixed),
      Bodies.rectangle(-25, 200, 50, 1000, fixed),
      Bodies.rectangle(1125, 200, 50, 1000, fixed),
      ...this.hoops.flatMap(({ x, y }) => [
        Bodies.circle(x - HOOP_HALF_WIDTH, y, 4, fixed),
        Bodies.circle(x + HOOP_HALF_WIDTH, y, 4, fixed),
        Bodies.rectangle(x + HOOP_HALF_WIDTH + 8, y - 40, 10, 105, fixed),
      ]),
    ]);
  }
  shoot(angle: number, power: number, replaceActive = false): boolean {
    if (this.active && !replaceActive) return false;
    if (this.ball) Composite.remove(this.engine.world, this.ball);
    this.ball = Bodies.circle(LAUNCH.x, LAUNCH.y, BALL_RADIUS, { restitution: 0.74, friction: 0.28, frictionAir: 0.0004, density: 0.004, slop: 0.01 });
    Composite.add(this.engine.world, this.ball);
    Body.setVelocity(this.ball, shotVelocity(angle, power));
    Body.setAngularVelocity(this.ball, 0.12);
    this.active = true; this.elapsed = 0; this.settled = 0; this.accumulator = 0; this.resolved = false;
    return true;
  }
  tick(seconds: number): ShotResult | null {
    if (!this.active || !this.ball) return null;
    // Small fixed steps prevent a fast ball tunnelling through a thin rim.
    const step = 1000 / 240;
    this.accumulator += Math.max(0, Math.min(seconds, 0.1)) * 1000;
    let result: ShotResult | null = null;
    while (this.accumulator >= step) {
      const previous = { ...this.ball.position };
      Engine.update(this.engine, step);
      this.accumulator -= step; this.elapsed += step / 1000;
      if (!this.resolved) {
        const index = this.hoops.findIndex((hoop) => crossedHoop(previous, this.ball!.position, hoop));
        if (index !== -1) { this.resolved = true; result = { kind: 'basket', index }; }
      }
      this.settled = this.ball.speed < 0.5 && this.ball.position.y > GROUND - 20 ? this.settled + step / 1000 : 0;
      if (this.settled > 0.5 || this.elapsed >= 8) {
        this.active = false;
        if (!this.resolved) { this.resolved = true; result = { kind: 'miss' }; }
        break;
      }
    }
    return result;
  }
}

export function courtMarkup(hoops: Hoop[], choices: number[], playerName: string): string {
  const colors = ['#6acfc5', '#f5c05a', '#b6a3e8'];
  return `<svg class="basket-court" viewBox="0 -140 1100 740" role="img" aria-label="Widok z boku: zawodnik po lewej, trzy kosze z odpowiedziami po prawej">
    <defs><linearGradient id="court-sky" x2="0" y2="1"><stop stop-color="#203b55"/><stop offset="1" stop-color="#48747c"/></linearGradient><linearGradient id="court-floor" x2="0" y2="1"><stop stop-color="#deaa79"/><stop offset="1" stop-color="#bc825b"/></linearGradient><radialGradient id="ball-fill" cx=".3" cy=".25"><stop stop-color="#ffbd6c"/><stop offset="1" stop-color="#e77b38"/></radialGradient></defs>
    <rect x="0" y="-140" width="1100" height="740" rx="24" fill="url(#court-sky)"/>
    <circle cx="970" cy="-50" r="45" fill="#ffe8ae" opacity=".8"/>
    <path d="M0 230 100 125 215 235 340 145 490 255 630 155 770 255 950 120 1100 215V520H0Z" fill="#304e60"/>
    <path d="M0 315 110 255 250 310 400 235 570 310 780 220 920 300 1100 230V520H0Z" fill="#254552"/>
    <g stroke="#8ac9c2" opacity=".1" stroke-width="2"><path d="M0 420H1100M0 465H1100"/>${Array.from({ length: 23 }, (_, i) => `<path d="M${i * 50} 385v135"/>`).join('')}</g>
    <rect y="520" width="1100" height="80" fill="url(#court-floor)"/><path d="M0 520H1100M0 570H1100" stroke="#f4d7b5" stroke-width="4"/>
    <ellipse cx="145" cy="525" rx="53" ry="9" fill="#182d3e" opacity=".25"/>
    <path d="M135 482 128 510 108 516M153 482 160 510 177 516" stroke="#1a3040" stroke-width="15" stroke-linecap="round"/>
    <path d="M122 449 118 483H166L160 449" fill="#f0b751" stroke="#ffe2a0" stroke-width="2"/>
    <path d="M126 409Q142 398 158 409L167 453H117Z" fill="#6acfc5" stroke="#b4f2da" stroke-width="2"/>
    <text x="142" y="440" text-anchor="middle" fill="#204754" font-size="25" font-weight="900">7</text>
    <g id="player-arms" stroke="#f1bd96" stroke-width="11" stroke-linecap="round" fill="none"><path d="M126 416 149 406 169 418M158 416 172 403 180 412"/></g>
    <circle cx="142" cy="383" r="22" fill="#f1bd96"/><path d="M121 383Q114 351 141 356Q165 351 165 382L152 370 133 372Z" fill="#26313c"/><circle cx="153" cy="383" r="2.5" fill="#26313c"/><path d="M150 394q5 3 8-2" stroke="#a16651" stroke-width="2" fill="none"/>
    <text x="140" y="561" text-anchor="middle" fill="#4a3d36" font-size="17" font-weight="900">${playerName.toUpperCase()}</text>
    ${hoops.map(({ x, y }, index) => `<g class="basket-hoop" data-hoop="${index}"><path d="M${x + 51} ${y + 14}V516" stroke="#9bafb7" stroke-width="8"/><path d="M${x + 28} 516h47" stroke="#c6d4d3" stroke-width="10" stroke-linecap="round"/><rect x="${x + 46}" y="${y - 92}" width="10" height="105" rx="3" fill="#e8f2e9"/><rect x="${x + 44}" y="${y - 53}" width="14" height="33" fill="none" stroke="${colors[index]}" stroke-width="3"/><path class="basket-net" d="M${x - 43} ${y}l12 47h62l12-47m-72 0 20 47m0-47 21 47m0-47 19 47m-73-27h75m-69 16h66" fill="none" stroke="#e3eeea" stroke-width="2" opacity=".8"/><path d="M${x - 43} ${y}h86" stroke="#f0925d" stroke-width="7" stroke-linecap="round"/><rect x="${x - 40}" y="${y + 64}" width="80" height="52" rx="14" fill="${colors[index]}"/><text x="${x}" y="${y + 102}" text-anchor="middle" fill="#15343f" font-size="35" font-weight="900">${choices[index]}</text></g>`).join('')}
    <g id="aim-preview" fill="#ffe4a6"></g><g id="basket-ball"><circle r="12" fill="url(#ball-fill)" stroke="#9d4b25" stroke-width="1.5"/><path d="M-12 0h24M0-12v24M-8-9Q4 0-8 9M8-9Q-4 0 8 9" stroke="#924725" stroke-width="1.2" fill="none"/></g>
  </svg>`;
}
