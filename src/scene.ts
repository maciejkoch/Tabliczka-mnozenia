import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';

type Entity = { graphic: Graphics; x: number; y: number; kind: 'crystal' | 'rock'; spin: number };
export class SpaceScene {
  private app = new Application();
  private world = new Container();
  private stars: { graphic: Graphics; speed: number }[] = [];
  private ship!: Sprite;
  private shadow = new Graphics();
  private entities: Entity[] = [];
  private trail: Graphics[] = [];
  private spawnClock = 0;
  private elapsed = 0;
  private x = 640;
  private targetX = 640;
  private moving = false;
  private warp = false;
  private paused = false;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private theme = 0x7de0c6;
  private resizeObserver!: ResizeObserver;
  private planet = new Graphics();
  private variant = 0;
  onTick: (seconds: number) => void = () => {};
  onCrystal: () => void = () => {};
  onBump: () => void = () => {};
  getMovement: () => number = () => 0;
  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ backgroundAlpha: 0, antialias: true, preference: 'webgl', resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true, width: host.clientWidth, height: host.clientHeight });
    host.appendChild(this.app.canvas);
    this.app.canvas.setAttribute('aria-hidden', 'true');
    this.app.stage.addChild(this.world);
    for (let i = 0; i < 100; i++) {
      const star = new Graphics().circle(0, 0, i % 8 === 0 ? 2 : 1).fill({ color: i % 5 === 0 ? 0x7de0c6 : 0xfff8e8, alpha: 0.2 + Math.random() * 0.6 });
      star.position.set(Math.random() * 1280, Math.random() * 720);
      this.world.addChild(star);
      this.stars.push({ graphic: star, speed: 15 + Math.random() * 45 });
    }
    this.world.addChild(this.planet);
    this.drawPlanet();
    for (let i = 0; i < 7; i++) {
      const flame = new Graphics().circle(0, 0, 6 + (7 - i) * 1.1).fill({ color: i < 3 ? 0xf5bc75 : 0x72e1c1, alpha: (7 - i) / 13 });
      this.world.addChild(flame);
      this.trail.push(flame);
    }
    this.shadow.ellipse(0, 0, 66, 13).fill({ color: 0x7de0c6, alpha: 0.09 });
    this.world.addChild(this.shadow);
    const texture = await Assets.load<Texture>(`${import.meta.env.BASE_URL}art/ship.png`);
    this.ship = new Sprite(texture);
    this.ship.anchor.set(0.5);
    this.ship.width = 168;
    this.ship.height = 168;
    this.world.addChild(this.ship);
    const resize = () => {
      const width = host.clientWidth || innerWidth;
      const height = host.clientHeight || innerHeight;
      this.app.renderer.resize(width, height);
      const scale = Math.min(width / 1280, height / 720);
      this.world.scale.set(scale);
      this.world.position.set((width - 1280 * scale) / 2, (height - 720 * scale) / 2);
    };
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(host);
    resize();
    this.app.ticker.add((ticker) => this.tick(Math.min(ticker.deltaMS / 1000, 0.05)));
  }
  setPhase(phase: 'flight' | 'question' | 'correct' | 'idle'): void {
    this.moving = phase === 'flight';
    this.warp = phase === 'correct';
    if (phase !== 'flight') this.clearEntities();
    if (phase === 'flight') this.spawnClock = 0.2;
  }
  setPaused(value: boolean): void { this.paused = value; }
  setTarget(index: number): void { this.targetX = [300, 640, 980][index] ?? 640; }
  setTheme(color: number, variant: number): void { this.theme = color; this.variant = variant; this.drawPlanet(); }
  setSkin(color: number): void { if (this.ship) this.ship.tint = color; }
  reset(): void { this.clearEntities(); this.x = this.targetX = 640; this.elapsed = 0; this.paused = false; }
  private drawPlanet(): void {
    const color = [0x7ee0c5, 0x9cbbf3, 0xf4b28a][this.variant] ?? this.theme;
    this.planet.clear().circle(1120, 430, 105).fill({ color, alpha: 0.06 }).circle(1120, 430, 87).fill({ color, alpha: 0.14 });
    this.planet.ellipse(1120, 430, 137, 26).stroke({ color, alpha: 0.24, width: 3 });
  }
  private clearEntities(): void {
    this.entities.forEach((entity) => entity.graphic.destroy());
    this.entities = [];
  }
  private spawn(): void {
    const kind = Math.random() > 0.3 ? 'crystal' : 'rock';
    const graphic = new Graphics();
    if (kind === 'crystal') {
      graphic.poly([0, -19, 14, -3, 0, 19, -14, -3]).fill(0x90ecd0).stroke({ color: 0xe0fff0, width: 2 });
      graphic.moveTo(0, -19).lineTo(0, 19).moveTo(-14, -3).lineTo(14, -3).stroke({ color: 0xffffff, alpha: 0.5, width: 1 });
    } else {
      graphic.poly([-20, -10, -8, -24, 15, -20, 26, 0, 15, 22, -12, 25, -25, 5]).fill(0x455a64).stroke({ color: 0x7e9295, width: 2 });
      graphic.circle(6, -6, 6).fill(0x32434f).circle(-9, 9, 4).fill(0x32434f);
    }
    const entity: Entity = { graphic, x: 180 + Math.random() * 920, y: -45, kind, spin: (Math.random() - 0.5) * 1.4 };
    graphic.position.set(entity.x, entity.y);
    this.world.addChild(graphic);
    this.entities.push(entity);
  }
  private tick(seconds: number): void {
    if (this.paused || !this.ship) return;
    this.elapsed += seconds;
    const speed = this.warp && !this.reducedMotion ? 9 : this.moving ? 2 : 0.5;
    this.stars.forEach(({ graphic, speed: starSpeed }) => {
      graphic.y += seconds * starSpeed * speed;
      graphic.scale.y = this.warp && !this.reducedMotion ? 8 : 1;
      if (graphic.y > 740) { graphic.y = -20; graphic.x = Math.random() * 1280; }
    });
    if (this.moving) {
      this.x = Math.min(1100, Math.max(180, this.x + this.getMovement() * seconds * 460));
      this.spawnClock -= seconds;
      if (this.spawnClock <= 0) { this.spawn(); this.spawnClock = 0.55; }
    } else this.x += (this.targetX - this.x) * Math.min(1, seconds * 9);
    const bob = this.reducedMotion ? 0 : Math.sin(this.elapsed * 2.8) * 5;
    this.ship.position.set(this.x, 555 + bob);
    this.ship.rotation = this.moving ? this.getMovement() * 0.12 : (this.targetX - this.x) * 0.0002;
    this.shadow.position.set(this.x, 625);
    this.trail.forEach((flame, i) => {
      flame.position.set(this.x + Math.sin(this.elapsed * 8 + i) * 3, 607 + i * (this.warp ? 17 : 9) + bob);
      flame.visible = !this.reducedMotion || i < 2;
    });
    this.entities = this.entities.filter((entity) => {
      entity.y += seconds * (entity.kind === 'crystal' ? 170 : 150);
      entity.graphic.position.set(entity.x, entity.y);
      entity.graphic.rotation += entity.spin * seconds;
      if (Math.abs(entity.x - this.x) < 46 && Math.abs(entity.y - 555) < 43) {
        if (entity.kind === 'crystal') this.onCrystal();
        else { this.x = Math.max(180, Math.min(1100, this.x + (entity.x < this.x ? 65 : -65))); this.onBump(); }
        entity.graphic.destroy();
        return false;
      }
      if (entity.y > 770) { entity.graphic.destroy(); return false; }
      return true;
    });
    this.onTick(seconds);
  }
}
