import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito-sans';
import './style.css';
import { answerChoices, chooseFact, equation, explanation, factPool, parseProgress, updateFact, type Fact, type Mode, type Range } from './learning';
import { Input, type Command } from './input';
import { Sound } from './audio';
import { SpaceScene } from './scene';
import { encounterFor, type Encounter } from './encounters';
import { BasketballPhysics, courtMarkup, shotVelocity, LAUNCH } from './basketball';
import { BasketMatch, RANKING_KEY, matchTime, parseRanking, addMatch, serializeRanking, type MatchRecord } from './basket-match';
import { nextControl, type Direction } from './navigation';

const root = document.querySelector<HTMLDivElement>('#app')!;
const art = `${import.meta.env.BASE_URL}art/`;
const icons = {
  star: '<svg viewBox="0 0 24 24" fill="none"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor"/></svg>',
  pad: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7h10c3 0 5 9 3 11-2 2-5-3-6-3h-4c-1 0-4 5-6 3C2 16 4 7 7 7Z" stroke="currentColor" stroke-width="1.7"/><path d="M8 9v5m-2.5-2.5h5" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="10" r="1" fill="currentColor"/><circle cx="18" cy="13" r="1" fill="currentColor"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9h4l5-4v14l-5-4H4V9Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 17h16" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="7" r="3" fill="#102b35" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="17" r="3" fill="#102b35" stroke="currentColor" stroke-width="1.7"/></svg>',
};
const planets = [
  { id: 'flora', name: 'Flora', label: 'Zielona planeta', color: '#83ddbd', hex: 0x83ddbd, number: '01', class: 'flora', subtitle: 'Odkryj kosmiczny ogród' },
  { id: 'polaris', name: 'Polaris', label: 'Lodowa planeta', color: '#aec7f6', hex: 0xaec7f6, number: '02', class: 'polaris', subtitle: 'Rozświetl lodowe doliny' },
  { id: 'sol', name: 'Sol', label: 'Słoneczna planeta', color: '#f8b27e', hex: 0xf8b27e, number: '03', class: 'sol', subtitle: 'Rozgrzej słoneczną stację' },
];
const modeNames = { multiply: 'Mnożenie', divide: 'Dzielenie', mixed: 'Mieszany', arithmetic: 'Do 20' };
const modeSymbols = { multiply: '×', divide: '÷', mixed: '× ÷', arithmetic: '+ −' };
const modeDescriptions = { multiply: 'Łączymy w grupy', divide: 'Dzielimy po równo', mixed: 'Podwójna przygoda', arithmetic: 'Dodaj i odejmij' };
function rangeLabel(): string { return mode === 'arithmetic' ? '0–20' : range === 'all' ? '1–10' : range === 'easy' ? '1–5' : '6–10'; }
const storageKey = 'kosmiczna-wyprawa:progress:v1';
function readStored(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
let progress = parseProgress(readStored(storageKey));
let storageAvailable = true;
let mode: Mode = 'mixed';
let range: Range = 'all';
let planetIndex = 0;
let calm = false;
let gameStyle: 'basketball' | 'space' = readStored('matematyczny-basket:style') === 'space' ? 'space' : 'basketball';
const basketball = new BasketballPhysics();
let throwAngle = 62;
let throwPower = 55;
let basketMessage = '';
let basketMatch = new BasketMatch();
let ranking = parseRanking(readStored(RANKING_KEY));
let lastMatchId: string | null = null;
let basketMenu = false;
let controllerNavigation = false;
let lastMonitorTime = performance.now();
let lastBounceTime = 0;
basketball.onBounce = () => { if (performance.now() - lastBounceTime > 90) { sound.play('bounce'); lastBounceTime = performance.now(); } };
function isBasket(): boolean { return gameStyle === 'basketball'; }
let skin = readStored('kosmiczna-wyprawa:skin') ?? 'original';
const pilots = [
  { id: 'emilia', name: 'Emilia', greeting: 'Emilio' },
  { id: 'jakub', name: 'Jakub', greeting: 'Jakubie' },
  { id: 'piotr', name: 'Piotr', greeting: 'Piotrze' },
];
let pilotId = readStored('kosmiczna-wyprawa:pilot') ?? 'emilia';
function pilot(): typeof pilots[number] { return pilots.find((entry) => entry.id === pilotId) ?? pilots[0]; }
let view: 'home' | 'game' | 'result' = 'home';
let modal: 'settings' | 'pause' | 'pad' | 'hangar' | 'help' | 'stats' | 'ranking' | null = null;
let previousFocus: HTMLElement | null = null;
let ready = false;
let failed = false;
let phase: 'flight' | 'question' | 'correct' = 'flight';
let phaseTime = 0;
let questionIndex = 0;
let firstTryCount = 0;
let missionCrystals = 0;
let selectedAnswer = 1;
let firstTry = true;
let hintShown = false;
let incorrect = new Set<number>();
let fact!: Fact;
let choices: number[] = [];
let recent: string[] = [];
let earnedStars = 0;
let missionSaved = false;
let answerPending = false;
let toastClock = 0;
const questionCount = 12;
function encounter(): Encounter { return encounterFor(questionIndex, calm); }
function actionLabel(): string { return encounter() === 'portal' ? 'LEĆ' : encounter() === 'gate' ? 'WYBIERZ' : 'STRZEL'; }
function targetLabel(): string { return ({ gate: 'BRAMA', laser: 'DRON', portal: 'PORTAL', boss: 'GENERATOR' })[encounter()]; }
const scene = new SpaceScene();
const sound = new Sound();
const input = new Input();
sound.enabled = readStored('kosmiczna-wyprawa:sound') !== 'off';

root.innerHTML = `<div class="space-art" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
  <header class="topbar"><button class="brand" data-action="home" aria-label="Kosmiczna wyprawa — strona główna"><span class="brand-mark"><i></i></span><span>KOSMICZNA<span class="brand-small">WYPRAWA</span></span></button>
  <div class="header-actions"><button class="pad-status" data-action="pad">${icons.pad}<span id="pad-label">Podłącz pada</span><i id="pad-dot"></i></button><span class="header-divider"></span><button class="icon-button" data-action="sound" aria-label="Wyłącz dźwięk" title="Dźwięk">${icons.sound}</button><button class="icon-button" data-action="fullscreen" aria-label="Włącz pełny ekran" title="Pełny ekran">${icons.full}</button></div></header>
  <div id="game-canvas" aria-hidden="true"></div><main id="screen"></main>
  <footer class="footer"><span class="controller-guide"><kbd>← →</kbd> wybierz <span class="key-a">A</span> / <kbd>Enter</kbd> zatwierdź <kbd>B</kbd> / <kbd>Esc</kbd> wróć</span><span class="footer-tag">MAŁY PILOT. WIELKA PRZYGODA.</span></footer>
  <div id="modal-root"></div><div id="toast" role="status" aria-live="polite"></div>`;
const screen = document.querySelector<HTMLElement>('#screen')!;
const canvasHost = document.querySelector<HTMLElement>('#game-canvas')!;
const modalRoot = document.querySelector<HTMLElement>('#modal-root')!;

function escape(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
function save(): void {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); }
  catch { storageAvailable = false; }
}
function storeOption(key: string, value: string): void { try { localStorage.setItem(key, value); } catch { storageAvailable = false; } }
function stars(count: number): string { return [0, 1, 2].map((i) => `<span class="small-star ${i < count ? 'earned' : ''}">${icons.star}</span>`).join(''); }
function unlockedSkin(): number { return progress.missions >= 5 ? 3 : progress.missions >= 3 ? 2 : progress.missions >= 1 ? 1 : 0; }
function applySkin(): void { scene.setSkin(({ original: 0xffffff, gold: 0xffd07a, ice: 0xb5dcff, rose: 0xffb4da })[skin] ?? 0xffffff); }
function focusedAction(): string | null { return (document.activeElement as HTMLElement)?.dataset.action ?? null; }
function focusButton(button?: HTMLButtonElement | null): void {
  root.querySelectorAll('.pad-focus').forEach((entry) => entry.classList.remove('pad-focus'));
  if (!button) return;
  button.focus({ preventScroll: true });
  if (controllerNavigation) button.classList.add('pad-focus');
  button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function focusAction(action: string): void {
  focusButton([...root.querySelectorAll<HTMLButtonElement>('button[data-action]')].find((entry) => entry.dataset.action === action && !entry.disabled && entry.offsetParent !== null && !entry.closest('[inert]')));
}
function renderHome(restore?: string | null): void {
  restore ??= focusedAction();
  basketMenu = false;
  view = 'home';
  document.querySelector('.controller-guide')!.innerHTML = '<kbd>← →</kbd> wybierz <span class="key-a">A</span> / <kbd>Enter</kbd> zatwierdź <kbd>B</kbd> / <kbd>Esc</kbd> wróć';
  scene.setPhase('idle');
  basketball.active = false;
  root.classList.toggle('basketball-theme', isBasket());
  document.querySelector('.brand')!.setAttribute('aria-label', isBasket() ? 'Matematyczny basket — strona główna' : 'Kosmiczna wyprawa — strona główna');
  document.querySelector('.brand > span:last-child')!.innerHTML = isBasket() ? 'MATEMATYCZNY<span class="brand-small">BASKET</span>' : 'KOSMICZNA<span class="brand-small">WYPRAWA</span>';
  document.title = isBasket() ? 'Matematyczny basket · policz i traf!' : 'Kosmiczna wyprawa · matematyczna przygoda';
  document.querySelector('.footer-tag')!.textContent = isBasket() ? 'POLICZ. WYCELUJ. TRAF.' : 'MAŁY PILOT. WIELKA PRZYGODA.';
  canvasHost.classList.remove('visible');
  root.classList.remove('playing');
  const planet = planets[planetIndex];
  screen.className = 'home-screen';
  screen.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-orbit"></span> WYPRAWA EMILII, JAKUBA I PIOTRA</div>
    <h1>${pilot().greeting},<br><span>${isBasket() ? 'czas na basket!' : 'kosmos czeka!'}</span></h1><p class="hero-description">${isBasket() ? 'Policz wynik i rzuć do właściwego kosza! Ćwicz mnożenie i dzielenie' : 'Pilotuj statek i oswajaj mnożenie oraz dzielenie'}<br class="wide-only"> do <strong>10 × 10</strong> lub dodawanie i odejmowanie <strong>do 20.</strong></p>
    <div class="pilot-picker" role="group" aria-label="Wybierz pilota"><span>${isBasket() ? 'KTO DZIŚ GRA?' : 'KTO DZIŚ PILOTUJE?'}</span>${pilots.map((entry) => `<button data-action="pilot:${entry.id}" aria-pressed="${pilotId === entry.id}" class="${pilotId === entry.id ? 'selected' : ''}">${entry.name}</button>`).join('')}</div>
    <div class="hero-badges"><span><i></i> Wasza własna przygoda</span><span>Bez pośpiechu</span><span>Na padzie lub klawiaturze</span></div></div>
    <div class="hero-visual" aria-hidden="true">${isBasket() ? `<div class="basket-hero-ball"><i></i><b>×</b></div><div class="basket-hero-rim"><i></i></div><span class="basket-hero-caption">DOBRY WYNIK. CELNY RZUT.</span>` : `<div class="orbit-dash"></div><img class="hero-ship" src="${art}ship.png" alt=""/><span class="coordinate">SEKTOR 10 × 10<span>WSZYSTKIE SYSTEMY GOTOWE</span></span><span class="hero-spark spark-one">✧</span><span class="hero-spark spark-two">+</span>`}</div>
  </section>
  <section class="mission-panel" aria-labelledby="mission-title"><div class="section-title"><h2 id="mission-title">${isBasket() ? 'Przygotuj swój mecz' : 'Przygotuj swoją wyprawę'}</h2><button class="text-button" data-action="help">Jak gramy? ${icons.arrow}</button></div>
    <div class="game-style-picker" role="group" aria-label="Rodzaj gry"><button data-action="style:basketball" class="${isBasket() ? 'selected' : ''}" aria-pressed="${isBasket()}">🏀 Matematyczny basket <small>Kąt, siła i celny rzut</small></button><button data-action="style:space" class="${!isBasket() ? 'selected' : ''}" aria-pressed="${!isBasket()}">🚀 Kosmiczna wyprawa <small>Statki, lasery i portale</small></button></div><div class="mission-config"><div class="mode-block"><p class="field-label"><span>01</span> CO DZIŚ ĆWICZYMY?</p><div class="mode-options" role="group" aria-label="Rodzaj działań">${(['multiply', 'divide', 'mixed', 'arithmetic'] as Mode[]).map((entry) => `<button class="mode-card ${mode === entry ? 'selected' : ''}" data-action="mode:${entry}" aria-pressed="${mode === entry}"><span class="mode-symbol">${modeSymbols[entry]}</span><span>${modeNames[entry]}<small>${modeDescriptions[entry]}</small></span><i class="selection-dot"></i></button>`).join('')}</div></div>
    <div class="planet-block"><p class="field-label"><span>02</span> ${isBasket() ? 'WYBIERZ BOISKO' : 'WYBIERZ PLANETĘ'}</p><div class="planet-options" role="group" aria-label="Cel wyprawy">${planets.map((entry, i) => `<button class="planet-card ${planetIndex === i ? 'selected' : ''}" data-action="planet:${i}" aria-pressed="${planetIndex === i}" style="--planet-color:${entry.color}"><span class="planet-orb ${entry.class}"><i></i></span><span>${entry.name}<small>${stars(progress.planets[entry.id] ?? 0)}</small></span></button>`).join('')}</div></div></div>
    <div class="launch-row"><button class="settings-button" data-action="settings">${icons.settings}<span>Zakres: <strong>${rangeLabel()}</strong><small>${isBasket() ? 'Mecz · 3 minuty' : calm ? 'Spokojny lot' : 'Lot z kryształami'}</small></span></button><div class="mission-summary"><span class="mini-dot" style="background:${planet.color}"></span><span>${isBasket() ? 'Policz · ustaw kąt i siłę · rzuć!' : planet.subtitle}<small>${isBasket() ? '3 minuty · dobry kosz +3 · błędny −1 · pudło 0' : '12 działań · krótka misja · bez limitu odpowiedzi'}</small></span></div><button class="launch-button" data-action="start" ${!ready && !isBasket() ? 'disabled' : ''}><span class="key-a">A</span><span>${isBasket() ? 'Zagraj w basket' : failed ? 'Spróbuj ponownie' : ready ? 'Ruszaj w kosmos' : 'Przygotowanie statku…'}</span>${icons.arrow}</button></div>
  </section>
  <section class="home-bottom"><button class="progress-chip" data-action="${isBasket() ? 'ranking' : 'stats'}"><span class="chip-icon">${icons.star}</span><span>${isBasket() ? 'Ranking basketu' : 'Twoja kosmiczna historia'}<small>${isBasket() ? ranking.length ?  `Mecze: ${ranking.length} · rekord ${ranking[0].score} pkt` : 'Rozegraj pierwszy mecz i zapisz wynik' : progress.missions ? `${progress.missions} ukończonych misji · ${progress.crystals} kryształów` : 'Pierwsza przygoda dopiero przed Tobą'}</small></span>${icons.arrow}</button><button class="hangar-link" data-action="hangar"><span class="mini-ship">✦</span> Hangar <small>${unlockedSkin() + 1}/4 statki</small>${icons.arrow}</button></section>`;
  if (restore) focusAction(restore);
  else if (input.getPad()) { controllerNavigation = true; focusAction('start'); }
}

async function initialize(): Promise<void> {
  try {
    await scene.init(canvasHost);
    ready = true;
    failed = false;
    applySkin();
    if (view === 'home') renderHome();
  } catch (error) {
    console.error('Nie udało się przygotować grafiki gry:', error);
    failed = true;
    if (isBasket()) return;
    toast('Nie udało się uruchomić grafiki. Odśwież stronę i sprawdź akcelerację sprzętową przeglądarki.', 15);
    const button = screen.querySelector<HTMLButtonElement>('[data-action="start"]');
    if (button) { button.disabled = false; button.textContent = 'Odśwież grę'; }
  }
}
function startMission(): void {
  if (!ready && !isBasket()) { if (failed) location.reload(); return; }
  sound.unlock();
  sound.play('select');
  view = 'game';
  questionIndex = 0; firstTryCount = 0; missionCrystals = 0; recent = []; earnedStars = 0; missionSaved = false; answerPending = false;
  phase = 'flight'; phaseTime = 0;
  if (isBasket()) { basketMatch = new BasketMatch(); lastMatchId = null; basketMenu = false; }
  if (ready) scene.reset();
  scene.setTheme(planets[planetIndex].hex, planetIndex);
  applySkin();
  scene.setPhase(calm ? 'question' : 'flight');
  canvasHost.classList.toggle('visible', !isBasket());
  root.classList.add('playing');
  if (isBasket() || calm) newQuestion(); else renderGame();
  (document.activeElement as HTMLElement)?.blur();
}
function renderBasketGame(): void {
  const restore = basketMenu ? focusedAction() : null;
  document.querySelector('.controller-guide')!.innerHTML = '<kbd>↑ ↓</kbd> kąt <kbd>← →</kbd> siła <span class="key-a">A</span> / <kbd>Enter</kbd> rzut <kbd>Y / M</kbd> przyciski <kbd>P</kbd> pauza';
  screen.className = `game-screen basket-game${phase === 'correct' ? ' basket-success' : ''}`;
  screen.innerHTML = `<div class="game-hud"><button class="hud-destination" data-action="pause"><span class="basket-hud-icon">🏀</span><span>Matematyczny basket<small>${modeNames[mode]} · zakres ${rangeLabel()} · ${pilot().name}</small></span></button><div class="basket-clock" aria-label="Pozostały czas meczu"><span>CZAS MECZU</span><strong id="basket-clock">${matchTime(basketMatch.remaining)}</strong></div><div class="hud-right"><span class="basket-score" aria-label="Punkty"><span>PUNKTY</span><b id="basket-score">${basketMatch.score}</b></span><button class="icon-button" data-action="pause" aria-label="Pauza">Ⅱ</button></div></div>
    <section class="basket-question"><div><span class="eyebrow">POLICZ I TRAF · DZIAŁANIE ${questionIndex + 1}</span><h2 class="equation">${equation(fact)} <span>= ?</span></h2></div><p id="basket-message" role="status" aria-live="polite">${phase === 'correct' ? `Brawo, ${pilot().greeting}! ${equation(fact)} = ${fact.answer}. Celny kosz! +3 punkty.` : basketMessage || 'Który kosz ma dobry wynik? Ustaw swój rzut.'}</p><button class="text-button" data-action="hint" ${answerPending || phase === 'correct' ? 'disabled' : ''}><span class="key-x">X</span> / H · Podpowiedź</button></section>
    <div class="basket-stage court-${planetIndex}">${courtMarkup(basketball.hoops, choices, pilot().name)}${hintShown && phase !== 'correct' ? `<div class="basket-hint">${hintMarkup()}</div>` : ''}<div class="basket-side-note">WIDOK Z BOKU <span>RZUT Z LEWEJ →</span></div></div>
    <div class="throw-controls"><div class="throw-control"><label for="throw-angle"><span>KĄT <small>↑ ↓</small></span><output id="angle-value">${Math.round(throwAngle)}°</output></label><div><button data-action="aim:angle:-2" aria-label="Zmniejsz kąt">−</button><input id="throw-angle" type="range" min="25" max="78" step="1" value="${throwAngle}" aria-label="Kąt rzutu"/><button data-action="aim:angle:2" aria-label="Zwiększ kąt">+</button></div></div><div class="throw-control"><label for="throw-power"><span>SIŁA <small>← →</small></span><output id="power-value">${Math.round(throwPower)}%</output></label><div><button data-action="aim:power:-2" aria-label="Zmniejsz siłę">−</button><input id="throw-power" type="range" min="10" max="100" step="1" value="${throwPower}" aria-label="Siła rzutu"/><button data-action="aim:power:2" aria-label="Zwiększ siłę">+</button></div></div><button class="launch-button throw-button" data-action="throw"><span class="key-a">A</span><span id="throw-caption">Rzuć piłkę</span>${icons.arrow}</button><span class="throw-keyboard">Enter / Spacja<br><small>+3 / −1 / pudło 0</small></span></div><div class="basket-pad-guide"><span id="basket-control-mode">${basketMenu ? 'PRZYCISKI · krzyżak / gałka wybiera · A zatwierdza · B wraca do rzutu' : 'RZUT · gałka ustawia kąt i siłę · A rzuca · krzyżak wybiera przyciski'}</span><button data-action="basket-menu" aria-pressed="${basketMenu}">Y / M · ${basketMenu ? 'Wróć do rzutu' : 'Wybierz przycisk'}</button></div>`;
  updateBasketVisual();
  if (restore) focusAction(restore);
}
function changeAim(control: string, delta: number): void {
  if (!delta || view !== 'game' || modal || phase !== 'question') return;
  if (control === 'angle') throwAngle = Math.min(78, Math.max(25, throwAngle + delta));
  else throwPower = Math.min(100, Math.max(10, throwPower + delta));
  updateBasketVisual();
}
function shootBasket(): void {
  if (view !== 'game' || modal || phase !== 'question') return;
  if (basketMatch.finished || !basketball.shoot(throwAngle, throwPower, true)) return;
  basketMatch.throw();
  basketMenu = false;
  root.querySelectorAll('.pad-focus').forEach((entry) => entry.classList.remove('pad-focus'));
  sound.unlock(); sound.play('launch'); answerPending = true;
  basketMessage = 'Piłka w grze…';
  document.querySelector('#basket-message')!.textContent = basketMessage;
  (document.activeElement as HTMLElement)?.blur();
  updateBasketVisual();
}
function updateBasketVisual(): void {
  const body = basketball.ball;
  const position = basketball.active || phase === 'correct' ? body?.position ?? LAUNCH : LAUNCH;
  document.querySelector('#basket-ball')?.setAttribute('transform', `translate(${position.x} ${position.y}) rotate(${(body?.angle ?? 0) * 180 / Math.PI})`);
  const preview = document.querySelector('#aim-preview');
  if (preview) {
    const velocity = shotVelocity(throwAngle, throwPower);
    preview.innerHTML = phase === 'correct' ? '' : Array.from({ length: 9 }, (_, i) => { const t = (i + 1) * 0.07; return `<circle cx="${LAUNCH.x + velocity.x * 60 * t}" cy="${LAUNCH.y + velocity.y * 60 * t + 400 * t * t}" r="${3.5 - i * 0.2}" opacity="${0.9 - i * 0.07}"/>`; }).join('');
  }
  for (const [id, value, suffix] of [['angle', throwAngle, '°'], ['power', throwPower, '%']] as const) {
    const output = document.querySelector(`#${id}-value`); if (output) output.textContent = `${Math.round(value)}${suffix}`;
    const slider = document.querySelector<HTMLInputElement>(`#throw-${id}`); if (slider) { slider.value = String(value); slider.disabled = phase !== 'question'; }
  }
  screen.querySelectorAll<HTMLButtonElement>('[data-action^="aim:"], [data-action="throw"]').forEach((button) => button.disabled = phase !== 'question');
  const hintButton = screen.querySelector<HTMLButtonElement>('[data-action="hint"]'); if (hintButton) hintButton.disabled = answerPending || phase !== 'question';
  const modeGuide = document.querySelector('#basket-control-mode'); if (modeGuide) modeGuide.textContent = basketMenu ? 'PRZYCISKI · krzyżak / gałka wybiera · A zatwierdza · B wraca do rzutu' : 'RZUT · gałka ustawia kąt i siłę · A rzuca · krzyżak wybiera przyciski';
  const menuButton = screen.querySelector<HTMLButtonElement>('[data-action="basket-menu"]'); if (menuButton) { menuButton.setAttribute('aria-pressed', String(basketMenu)); menuButton.textContent = `Y / M · ${basketMenu ? 'Wróć do rzutu' : 'Wybierz przycisk'}`; }
  const clock = document.querySelector('#basket-clock'); if (clock) clock.textContent = matchTime(basketMatch.remaining);
  screen.querySelector('.basket-clock')?.classList.toggle('running-out', basketMatch.remaining <= 30);
  const score = document.querySelector('#basket-score'); if (score) score.textContent = String(basketMatch.score);
  const caption = document.querySelector('#throw-caption'); if (caption) caption.textContent = phase === 'correct' ? 'Celny kosz!' : basketball.active ? 'Rzuć ponownie' : 'Rzuć piłkę';
}
function tickBasket(seconds: number): void {
  if (basketMatch.tick(seconds)) { finishMission(); return; }
  const movementSeconds = Math.min(seconds, 0.05);
  if (phase === 'question' && !basketMenu) { changeAim('power', input.aimMovement * movementSeconds * 32); changeAim('angle', -input.aimVerticalMovement * movementSeconds * 24); }
  const result = basketball.tick(seconds);
  if (result && phase === 'question') {
    if (result.kind === 'basket') { resolveAnswer(result.index); screen.querySelector(`[data-hoop="${result.index}"]`)?.classList.add(choices[result.index] === fact.answer ? 'scored' : 'wrong-basket'); }
    else { answerPending = false; basketMessage = 'Blisko! Popraw kąt lub siłę i spróbuj jeszcze raz.'; document.querySelector('#basket-message')!.textContent = basketMessage; }
  }
  updateBasketVisual();
  if (phase === 'correct') {
    phaseTime += seconds;
    if (phaseTime >= 0.8) { questionIndex++; newQuestion(); }
  }
}
root.addEventListener('input', (event) => {
  const slider = event.target as HTMLInputElement;
  if (!isBasket() || modal || phase !== 'question') return;
  if (slider.id === 'throw-angle') throwAngle = Number(slider.value);
  else if (slider.id === 'throw-power') throwPower = Number(slider.value);
  else return;
  updateBasketVisual();
});
function renderGame(): void {
  if (isBasket()) { renderBasketGame(); return; }
  screen.className = `game-screen encounter-${encounter()}${answerPending ? ' answer-pending' : ''}${phase === 'correct' ? ' answer-success' : ''}`;
  const planet = planets[planetIndex];
  const station = questionIndex >= questionCount - 3;
  screen.innerHTML = `<div class="game-hud"><button class="hud-destination" data-action="pause"><span class="planet-orb tiny ${planet.class}"><i></i></span><span>${station ? 'Stacja ' : 'Kierunek: '}${planet.name}<small>${station ? calm ? 'Finał misji · uruchom stację' : 'Finał misji · wyłącz tarczę bossa' : `${modeNames[mode]} · zakres ${rangeLabel()}`}</small></span></button><div class="mission-dots" aria-label="${questionIndex} z ${questionCount} działań">${Array.from({ length: questionCount }, (_, i) => `<i class="${i < questionIndex ? 'done' : i === questionIndex ? 'current' : ''} ${i >= 9 ? 'station-dot' : ''}"></i>`).join('')}</div><div class="hud-right"><span class="crystal-count"><span>◆</span><b id="crystal-count">${missionCrystals}</b></span><button class="icon-button pause-button" data-action="pause" aria-label="Pauza">Ⅱ</button></div></div>
    <div id="game-content">${phase === 'flight' ? flightMarkup() : questionMarkup()}</div>
    <div class="game-bottom-label"><span>SEKTOR ${planet.number} / ${station ? 'STACJA ORBITALNA' : 'SZLAK ODKRYWCÓW'}</span><span>${phase === 'flight' ? '<kbd>← →</kbd> / gałka — steruj statkiem' : `<kbd>← →</kbd> / gałka — ${encounter() === 'portal' ? 'ustaw kurs' : 'ustaw cel'} · <span class="key-a">A</span> / <kbd>Enter</kbd> ${actionLabel().toLowerCase()}`}</span></div>`;
  syncAnswerTargets();
}
function syncAnswerTargets(): void {
  if (!isBasket() && ready && view === 'game' && phase !== 'flight') scene.setAnswerTargets([...screen.querySelectorAll<HTMLElement>('.answer-gate')], selectedAnswer);
}
scene.onResize = syncAnswerTargets;
function flightMarkup(): string {
  return `<section class="flight-info"><div class="eyebrow">${questionIndex === 0 ? `WITAJ NA POKŁADZIE, ${pilot().greeting.toUpperCase()}!` : `ŚWIETNIE, ${pilot().greeting.toUpperCase()}! LECIMY DALEJ`}</div><h2>${questionIndex === 0 ? 'Złap trochę gwiezdnej energii' : 'Zbieraj kryształy po drodze'}</h2><p>Ruszaj gałką lub strzałkami. Omijaj asteroidy — nie tracisz punktów.</p><div class="flight-progress"><i id="flight-fill"></i></div><button class="skip-flight" data-action="skip">Przejdź do działania ${icons.arrow}</button></section>`;
}
function hintMarkup(): string {
  if (fact.op === 'add' || fact.op === 'subtract') {
    const dots = (count: number, removed = false) => count ? Array.from({ length: count }, () => `<i class="${removed ? 'removed' : ''}"></i>`).join('') : '<span class="empty-crystals">0</span>';
    const diagram = fact.op === 'add'
      ? `<span class="arithmetic-pile">${dots(fact.a)}</span><b>+</b><span class="arithmetic-pile">${dots(fact.b)}</span>`
      : `<span class="arithmetic-pile">${dots(fact.answer)}${Array.from({ length: fact.b }, () => '<i class="removed"></i>').join('')}</span>${fact.a === 0 ? '' : '<small>Przekreślone kryształy zabieramy.</small>'}`;
    return `<div class="hint-card" role="status"><div class="robot-face" aria-hidden="true"><i></i><i></i></div><div class="hint-copy"><strong>${pilot().greeting}, policzmy razem</strong><p>${explanation(fact)}</p><div class="arithmetic-hint" aria-label="${fact.op === 'add' ? 'Połącz obie grupy kryształów' : `${fact.a} kryształów, ${fact.b} przekreślonych`}">${diagram}</div></div></div>`;
  }
  const groups = fact.op === 'multiply' ? fact.a : fact.answer;
  const perGroup = fact.b;
  return `<div class="hint-card" role="status"><div class="robot-face" aria-hidden="true"><i></i><i></i></div><div class="hint-copy"><strong>${pilot().greeting}, policzmy razem</strong><p>${explanation(fact)}</p><div class="hint-groups" aria-label="Kryształy ułożone w równe grupy">${Array.from({ length: groups }, () => `<span class="hint-group">${Array.from({ length: perGroup }, () => '<i></i>').join('')}</span>`).join('')}</div></div></div>`;
}
function questionMarkup(): string {
  const kind = encounter();
  const bossHits = Math.max(0, questionIndex - 9) + (phase === 'correct' ? 1 : 0);
  const success = { gate: 'Brama otwarta. Lecimy dalej!', laser: 'Cel trafiony! Droga wolna.', portal: 'Właściwy portal! Skok gotowy.', boss: bossHits === 3 ? 'Tarcza wyłączona! Stacja uratowana!' : 'Generator wyłączony! Tarcza słabnie.' }[kind];
  const prompt = { gate: 'Która brama ma właściwy wynik?', laser: 'Wyceluj w drona z dobrym wynikiem. A — strzel!', portal: 'Ustaw statek pod właściwym portalem. A — leć!', boss: 'Traf w dobry wynik, żeby wyłączyć generator tarczy. A — strzel!' }[kind];
  const heading = { gate: 'OTWÓRZ BRAMĘ', laser: 'LASER MATEMATYCZNY', portal: 'SKOK PRZEZ PORTAL', boss: 'STRAŻNIK STACJI' }[kind];
  return `<section class="question-area" aria-label="Działanie ${questionIndex + 1}"><div class="eyebrow">${heading} · DZIAŁANIE ${questionIndex + 1} Z ${questionCount}</div><h2 class="equation" aria-label="${equation(fact)} równa się ile">${equation(fact)} <span>= ?</span></h2><p class="question-prompt" aria-live="polite">${answerPending ? kind === 'portal' ? 'Silniki gotowe — lecimy do portalu!' : 'Laser wystrzelony!' : phase === 'correct' ? `Brawo, ${pilot().greeting}! ${success}` : hintShown ? 'Spokojnie, masz tyle prób, ile potrzebujesz.' : prompt}</p>${kind === 'boss' ? `<div class="boss-status ${bossHits === 3 ? 'defeated' : ''}" role="status" aria-label="Wyłączone generatory: ${bossHits} z 3"><div class="boss-robot" aria-hidden="true"><span>◉</span><span>◉</span></div><div><strong>${bossHits === 3 ? 'STACJA URATOWANA' : 'TARCZA STRAŻNIKA'}</strong><div class="boss-shields">${[0, 1, 2].map((i) => `<i class="${i < bossHits ? 'offline' : ''}"></i>`).join('')}<span>${bossHits} / 3</span></div></div></div>` : ''}${hintShown && phase !== 'correct' ? hintMarkup() : ''}</section>
    ${kind === 'boss' ? `<div class="boss-figure ${bossHits === 3 ? 'defeated' : ''}" aria-hidden="true"><svg viewBox="0 0 260 150" fill="none"><ellipse cx="130" cy="80" rx="120" ry="66" stroke="${bossHits === 3 ? '#9ce6c7' : '#aec7f6'}" stroke-width="3" stroke-dasharray="9 7" opacity="${0.75 - bossHits * 0.2}"/><path d="M80 68 35 88 23 119m157-51 45 20 12 31" stroke="#6c93a5" stroke-width="12" stroke-linecap="round"/><path d="M130 24V8" stroke="#f7b584" stroke-width="5"/><circle cx="130" cy="8" r="5" fill="#9ce6c7"/><rect x="77" y="26" width="106" height="93" rx="26" fill="#304c60" stroke="#f7b584" stroke-width="4"/><rect x="88" y="38" width="84" height="46" rx="16" fill="#102831"/><circle cx="108" cy="59" r="11" fill="#ffe3a4"/><circle cx="152" cy="59" r="11" fill="#ffe3a4"/><path d="M113 101h34" stroke="#9ce6c7" stroke-width="5" stroke-linecap="round"/><path d="m103 123-8 14h70l-8-14" fill="#6c93a5"/><circle cx="23" cy="121" r="10" fill="#f7b584"/><circle cx="237" cy="121" r="10" fill="#f7b584"/></svg></div>` : ''}
    <div class="answer-gates" role="group" aria-label="${kind === 'portal' ? 'Ustaw kurs na odpowiedź' : 'Wyceluj w odpowiedź'}">${choices.map((choice, index) => `<button class="answer-gate ${selectedAnswer === index ? 'selected' : ''} ${incorrect.has(index) ? 'incorrect' : ''} ${phase === 'correct' && choice === fact.answer ? 'correct' : ''}" data-action="answer:${index}" aria-label="${targetLabel()} z odpowiedzią ${choice}" aria-pressed="${selectedAnswer === index}" ${phase === 'correct' || answerPending || incorrect.has(index) ? 'disabled' : ''}><span class="gate-top">${targetLabel()} 0${index + 1}</span><strong>${choice}</strong><span class="gate-bottom">${phase === 'correct' && choice === fact.answer ? '✦ DOBRA ODPOWIEDŹ' : incorrect.has(index) ? 'SPRÓBUJ INNEJ' : selectedAnswer === index ? `A / ENTER · ${actionLabel()}` : kind === 'portal' ? 'USTAW KURS' : kind === 'gate' ? 'WYBIERZ BRAMĘ' : 'USTAW CELOWNIK'}</span><i></i>${kind === 'laser' || kind === 'boss' ? '<span class="target-reticle" aria-hidden="true"></span>' : ''}</button>`).join('')}</div>
    ${phase === 'question' && !hintShown ? `<button class="hint-button" data-action="hint" ${answerPending ? 'disabled' : ''}><span class="key-x">X</span> / <kbd>H</kbd> Potrzebuję podpowiedzi</button>` : ''}`;
}
function newQuestion(): void {
  phase = 'question'; phaseTime = 0; selectedAnswer = 1; firstTry = true; hintShown = false; incorrect.clear(); answerPending = false;
  fact = chooseFact(factPool(mode, range), progress, recent, progress.missions * questionCount + questionIndex);
  recent.push(fact.id);
  choices = answerChoices(fact);
  if (isBasket()) { basketball.reset(questionIndex); basketMessage = ''; }
  scene.setPhase(isBasket() ? 'idle' : 'question'); scene.setTarget(selectedAnswer);
  renderGame();
}
function answer(index: number): void {
  if (isBasket() || phase !== 'question' || modal || answerPending || incorrect.has(index) || choices[index] === undefined) return;
  selectedAnswer = index;
  scene.setTarget(index);
  if (encounter() === 'gate') { resolveAnswer(index); return; }
  answerPending = true;
  renderGame();
  scene.performAnswer(encounter(), index);
  sound.play(encounter() === 'portal' ? 'launch' : 'laser');
  (document.activeElement as HTMLElement)?.blur();
}
function resolveAnswer(index: number): void {
  if (isBasket() && (view !== 'game' || basketMatch.finished)) return;
  if (isBasket()) basketMatch.basket(choices[index] === fact.answer);
  answerPending = false;
  if (!isBasket() && encounter() !== 'gate') scene.celebrateAnswer(choices[index] === fact.answer);
  if (choices[index] === fact.answer) {
    if (firstTry) firstTryCount++;
    missionCrystals += isBasket() ? 3 : firstTry ? 5 : 3;
    if (storageAvailable) progress = parseProgress(readStored(storageKey));
    updateFact(progress, fact, firstTry, progress.missions * questionCount + questionIndex);
    save();
    phase = 'correct'; phaseTime = 0;
    scene.setPhase('correct');
    sound.play('correct');
    input.getPad()?.vibrationActuator?.playEffect('dual-rumble', { duration: 140, strongMagnitude: 0.15, weakMagnitude: 0.35 }).catch(() => {});
  } else {
    firstTry = false; hintShown = true; incorrect.add(index);
    if (isBasket()) basketMessage = `−1 punkt. ${choices[index]} to inny wynik. Policz i spróbuj ponownie!`;
    sound.play('hint');
    selectedAnswer = choices.findIndex((_, i) => !incorrect.has(i));
    scene.setTarget(selectedAnswer);
  }
  renderGame();
  if (!basketMenu) (document.activeElement as HTMLElement)?.blur();
}
function showHint(): void {
  if (phase !== 'question' || answerPending) return;
  firstTry = false; hintShown = true; sound.play('hint'); renderGame();
}
function rankingMarkup(highlightId: string | null = null): string {
  if (!ranking.length) return '<p class="ranking-empty">Ranking czeka na pierwszy mecz. Masz 3 minuty na zdobycie punktów!</p>';
  const rows = ranking.slice(0, 10);
  const highlight = ranking.findIndex((entry) => entry.id === highlightId);
  if (highlight >= 10) rows.push(ranking[highlight]);
  return `<div class="ranking-table-wrap"><table class="ranking-table"><thead><tr><th>Miejsce</th><th>Gracz</th><th>Punkty</th><th>Tryb</th><th>Data</th></tr></thead><tbody>${rows.map((entry) => `<tr class="${entry.id === highlightId ? 'latest-match' : ''}"><td>${ranking.indexOf(entry) + 1}.</td><td>${escape(entry.player)}${entry.id === highlightId ? '<small>Ten mecz</small>' : ''}</td><td><strong>${entry.score}</strong></td><td>${modeNames[entry.mode]}<small>${entry.mode === 'arithmetic' ? '0–20' : entry.range === 'all' ? '1–10' : entry.range === 'easy' ? '1–5' : '6–10'}</small></td><td>${new Date(entry.finishedAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td></tr>`).join('')}</tbody></table></div>`;
}
function finishBasketMatch(): void {
  if (view !== 'game') return;
  view = 'result'; basketMenu = false; basketball.active = false; scene.setPhase('idle');
  if (!missionSaved) {
    const record: MatchRecord = { id: crypto.randomUUID(), player: pilot().name, score: basketMatch.score, correct: basketMatch.correct, wrong: basketMatch.wrong, shots: basketMatch.shots, mode, range, finishedAt: new Date().toISOString() };
    const savedRanking = readStored(RANKING_KEY);
    ranking = addMatch(savedRanking === null ? ranking : parseRanking(savedRanking), record);
    lastMatchId = record.id; missionSaved = true;
    try { localStorage.setItem(RANKING_KEY, serializeRanking(ranking)); } catch { storageAvailable = false; }
    if (storageAvailable) progress = parseProgress(readStored(storageKey));
    progress.missions++; progress.crystals += basketMatch.correct * 3; save();
  }
  sound.play('win');
  screen.className = 'result-screen basket-result';
  const place = ranking.findIndex((entry) => entry.id === lastMatchId) + 1;
  screen.innerHTML = `<section class="result-card"><span class="eyebrow">KONIEC MECZU · 3:00</span><h1>${pilot().greeting}, czas minął!</h1><div class="final-basket-score">${basketMatch.score}<small>PUNKTÓW</small></div><p>Dobry kosz +3 · błędny kosz −1 · pudło 0</p><div class="result-numbers"><span><strong>${basketMatch.correct}</strong>dobrych koszy</span><span><strong>${basketMatch.wrong}</strong>błędnych koszy</span><span><strong>${basketMatch.missed}</strong>niecelnych rzutów</span></div><div class="result-note">${storageAvailable ? `Wynik zapisany. Twoje miejsce w rankingu: ${place}.` : 'Zapis w przeglądarce jest niedostępny. Wynik pozostaje w rankingu do zamknięcia strony.'}</div><h2>Ranking basketu</h2>${rankingMarkup(lastMatchId)}<div class="result-actions"><button class="secondary-button" data-action="home">Wróć do menu</button><button class="launch-button" data-action="start"><span class="key-a">A</span> Zagraj kolejny mecz ${icons.arrow}</button></div></section>`;
  focusAction('start');
}
function finishMission(): void {
  if (isBasket()) { finishBasketMatch(); return; }
  view = 'result';
  scene.setPhase('idle');
  basketball.active = false;
  earnedStars = firstTryCount >= 10 ? 3 : firstTryCount >= 6 ? 2 : 1;
  if (!missionSaved) {
    if (storageAvailable) progress = parseProgress(readStored(storageKey));
    progress.missions++;
    progress.crystals += missionCrystals;
    progress.planets[planets[planetIndex].id] = Math.max(progress.planets[planets[planetIndex].id] ?? 0, earnedStars);
    missionSaved = true; save();
  }
  sound.play('win');
  const newSkin = [1, 3, 5].includes(progress.missions);
  screen.className = 'result-screen';
  screen.innerHTML = `<section class="result-card"><span class="eyebrow">${isBasket() ? 'MECZ ZAKOŃCZONY' : 'MISJA ZAKOŃCZONA'}</span><div class="result-planet"><span class="planet-orb ${planets[planetIndex].class}"><i></i></span><span class="result-spark">✦</span></div><h1>${pilot().greeting}, ${isBasket() ? 'świetny mecz!' : 'misja wykonana!'}</h1><p>${isBasket() ? 'Dwanaście działań i dwanaście celnych koszy. Piękna gra!' : `Stacja ${planets[planetIndex].name} działa, a Ty masz za sobą kolejną kosmiczną przygodę.`}</p><div class="result-stars">${stars(earnedStars)}</div><div class="result-numbers"><span><strong>${questionCount}</strong>rozwiązanych działań</span><span><strong>${firstTryCount}</strong>bez podpowiedzi</span><span><strong>◆ ${missionCrystals}</strong>nowych kryształów</span></div><div class="result-note">${newSkin ? '✦ Nowy kolor statku czeka na Ciebie w hangarze!' : `Każda próba to krok naprzód. Dobra robota, ${pilot().greeting}!`}${!storageAvailable ? '<br>Przeglądarka blokuje zapis. Postępy pozostaną do zamknięcia strony.' : ''}</div><div class="result-actions"><button class="secondary-button" data-action="home">Mapa wypraw</button><button class="launch-button" data-action="start"><span class="key-a">A</span> Jeszcze jedna misja ${icons.arrow}</button></div>${newSkin ? '<button class="text-button" data-action="hangar">Zobacz nowy statek →</button>' : ''}</section>`;
  focusAction('start');
}

scene.getMovement = () => input.movement;
scene.onAnswerImpact = resolveAnswer;
scene.onCrystal = () => { missionCrystals++; sound.play('crystal'); const counter = document.querySelector('#crystal-count'); if (counter) counter.textContent = String(missionCrystals); };
scene.onBump = () => toast('Mała turbulencja. Lecimy dalej!', 1.5);
scene.onTick = (seconds) => {
  if (isBasket() || view !== 'game' || modal) return;
  phaseTime += seconds;
  if (phase === 'flight') {
    const duration = questionIndex === 0 ? 16 : 12;
    const fill = document.querySelector<HTMLElement>('#flight-fill');
    if (fill) fill.style.width = `${Math.min(100, phaseTime / duration * 100)}%`;
    if (phaseTime >= duration) newQuestion();
  } else if (phase === 'correct' && phaseTime >= 1.5) {
    questionIndex++;
    if (questionIndex >= questionCount) finishMission();
    else if (calm || questionIndex >= 9) newQuestion();
    else { phase = 'flight'; phaseTime = 0; scene.setPhase('flight'); renderGame(); }
  }
};

function toast(message: string, duration = 4): void { document.querySelector('#toast')!.textContent = message; toastClock = performance.now() + duration * 1000; }
function modalTemplate(title: string, eyebrow: string, body: string): string {
  return `<div class="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-top"><span class="eyebrow">${eyebrow}</span><button class="close-button" data-action="close" aria-label="Zamknij">×</button></div><h2 id="modal-title">${title}</h2>${body}</section></div>`;
}
function openModal(kind: NonNullable<typeof modal>): void {
  if (!modal) previousFocus = document.activeElement as HTMLElement;
  modal = kind;
  scene.setPaused(true);
  let content = '';
  if (kind === 'ranking') { const savedRanking = readStored(RANKING_KEY); if (savedRanking !== null) ranking = parseRanking(savedRanking); content = modalTemplate('Ranking basketu', 'NAJLEPSZE MECZE · 3 MINUTY', `<p>Dobry kosz +3, błędny −1, pudło 0. Ranking aktualizuje się po zakończeniu każdego meczu i zapisuje na tym urządzeniu.</p>${rankingMarkup(lastMatchId)}<button class="launch-button modal-primary" data-action="close">Wróć →</button>`); }
  if (kind === 'settings') content = modalTemplate('Wyprawa na Twoich zasadach', 'USTAWIENIA MISJI', `<p>Wybierz zakres i tempo. Na odpowiedź zawsze masz tyle czasu, ile potrzebujesz.</p>${mode === 'arithmetic' ? '<h3>Zakres liczenia</h3><p class="setting-note">Dodawanie i odejmowanie od 0 do 20. Suma nigdy nie przekracza 20, a odejmowanie nie daje wyników ujemnych.</p>' : `<h3>Zakres tabliczki</h3><div class="segmented">${(['easy', 'hard', 'all'] as Range[]).map((entry) => `<button data-action="range:${entry}" aria-pressed="${range === entry}" class="${range === entry ? 'selected' : ''}">${entry === 'all' ? 'Cała · 1–10' : entry === 'easy' ? 'Początek · 1–5' : 'Wyzwanie · 6–10'}</button>`).join('')}</div><p class="setting-note">${range === 'all' ? 'Wszystkie iloczyny do 100 i odwrotne dzielenie bez reszty.' : range === 'easy' ? 'Mnożenie przez 1–5 lub dzielenie przez 1–5. Drugi czynnik i iloraz: 1–10.' : 'Mnożenie przez 6–10 lub dzielenie przez 6–10. Drugi czynnik i iloraz: 1–10.'}</p>`}<h3>Jak lecimy?</h3><div class="segmented"><button data-action="calm:false" class="${!calm ? 'selected' : ''}" aria-pressed="${!calm}">Przygoda z lotem</button><button data-action="calm:true" class="${calm ? 'selected' : ''}" aria-pressed="${calm}">Spokojnie · same bramy</button></div><p class="setting-note">Spokojny tryb zachowuje wybieranie bram, pomija strzelanie, bossa oraz przeloty między działaniami.</p><button class="launch-button modal-primary" data-action="close">Gotowe ${icons.arrow}</button>`);
  if (kind === 'pause') content = modalTemplate('Mały przystanek w kosmosie', 'PAUZA', '<p>Statek czeka. Możesz odpocząć, a potem wrócić do tej samej misji.</p><div class="stacked-actions"><button class="launch-button" data-action="close"><span class="key-a">A</span> Lecimy dalej →</button><button class="secondary-button" data-action="restart">Zacznij misję od początku</button><button class="text-button" data-action="leave">Wróć do mapy wypraw</button></div><p class="setting-note">Ukończone działania zostały zapamiętane. Nagrody za misję zapisują się po dotarciu na planetę.</p>');
  if (kind === 'help') content = modalTemplate('Każdy może zostać pilotem', 'INSTRUKCJA POKŁADOWA', `<div class="how-steps"><div><b>01</b><span><strong>Zbieraj kosmiczną energię</strong>Gałką lub strzałkami steruj statkiem. Łap kryształy i omijaj asteroidy.</span></div><div><b>02</b><span><strong>Strzelaj i skacz przez portale</strong>Gałką lub krzyżakiem ustaw cel z dobrym wynikiem. A strzela do drona lub uruchamia lot przez portal. Enter działa tak samo.</span></div><div><b>03</b><span><strong>Gdy potrzebujesz, poproś o pomoc</strong>Przycisk X albo H pokaże kryształy w grupach. Możesz próbować do skutku.</span></div><div><b>04</b><span><strong>Wyłącz tarczę strażnika stacji</strong>Ostatnie trzy poprawne trafienia wyłączają generatory tarczy bossa i ratują stację. Za ukończone misje odblokujesz kolory statku.</span></div></div><p class="setting-note">Start / P — pauza · B / Esc — wróć lub pauza. Menu również obsłużysz padem. Nie tracisz nagród za pomyłki.</p><button class="launch-button modal-primary" data-action="close">Rozumiem, lecimy! →</button>`);
  if (kind === 'pad') content = modalTemplate('Sprawdź swojego pada', 'KONTROLA PRZED STARTEM', '<p>Podłącz kontroler przez USB lub Bluetooth, kliknij stronę i naciśnij dowolny przycisk pada.</p><div id="pad-live"></div><div class="pad-legend"><span><b>Gałka / krzyżak</b>ruch i wybór</span><span><b>A / przycisk 0</b>strzel / leć / zatwierdź</span><span><b>X / przycisk 2</b>podpowiedź</span><span><b>Start / przycisk 9</b>pauza</span></div><p class="setting-note">Gra korzysta ze standardowego układu pada. Jeśli tani kontroler działa inaczej, przełącz go w tryb XInput, jeśli ma taką opcję. Klawiatura zawsze jest dostępna.</p><button class="launch-button modal-primary" data-action="close">Gotowe →</button>');
  if (kind === 'hangar') {
    const skins = [{ id: 'original', name: 'Odkrywca', class: '', missions: 0 }, { id: 'gold', name: 'Słoneczny', class: 'gold', missions: 1 }, { id: 'ice', name: 'Lodowy', class: 'ice', missions: 3 }, { id: 'rose', name: 'Gwiezdny', class: 'rose', missions: 5 }];
    content = modalTemplate('Twój statek, Twój styl', 'HANGAR PILOTA', `<p>Ukończ misje i odblokuj nowe kolory. Każda ukończona wyprawa się liczy.</p><div class="skin-grid">${skins.map((entry) => `<button class="skin-card ${skin === entry.id ? 'selected' : ''}" data-action="skin:${entry.id}" ${progress.missions < entry.missions ? 'disabled' : ''} aria-pressed="${skin === entry.id}"><img class="${entry.class}" src="${art}ship.png" alt=""/><strong>${entry.name}</strong><small>${progress.missions < entry.missions ? `Odblokuj: ${entry.missions} ${entry.missions === 1 ? 'misja' : entry.missions < 5 ? 'misje' : 'misji'}` : skin === entry.id ? 'Twój statek' : 'Wybierz statek'}</small></button>`).join('')}</div><button class="launch-button modal-primary" data-action="close">Gotowe →</button>`);
  }
  if (kind === 'stats') {
    const mastered = Object.values(progress.facts).filter((record) => record.streak >= 3).length;
    const practiced = Object.keys(progress.facts).length;
    const practice = Object.entries(progress.facts).filter(([, record]) => record.wrong > 0 && record.streak < 3).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 6);
    content = modalTemplate('Twoja kosmiczna historia', 'DZIENNIK PILOTA', `<div class="stats-grid"><span><strong>${progress.missions}</strong>ukończonych misji</span><span><strong>${progress.crystals}</strong>kryształów</span><span><strong>${practiced}</strong>różnych działań</span><span><strong>${mastered}</strong>opanowanych działań</span></div><h3>Nasze planety</h3><div class="stats-planets">${planets.map((entry) => `<span>${entry.name}<span>${stars(progress.planets[entry.id] ?? 0)}</span></span>`).join('')}</div>${practice.length ? `<h3>Do poćwiczenia podczas kolejnych misji</h3><div class="practice-facts">${practice.map(([id]) => { const [op, a, b] = id.split(':'); return `<span>${a} ${{ m: '×', d: '÷', a: '+', s: '−' }[op] ?? '?'} ${b}</span>`; }).join('')}</div>` : '<p>Robot pomocnik będzie zapamiętywać działania, które warto powtórzyć.</p>'}<p class="setting-note">Opanowane = 3 poprawne odpowiedzi z rzędu bez pomocy. Postępy są zapisane w tej przeglądarce, na tym komputerze.${!storageAvailable ? ' Uwaga: zapis jest obecnie zablokowany przez przeglądarkę.' : ''}</p><button class="launch-button modal-primary" data-action="close">Gotowe →</button>`);
  }
  if (isBasket() && kind === 'help') content = modalTemplate('Policz. Wyceluj. Traf!', 'MATEMATYCZNY BASKET', `<div class="how-steps"><div><b>01</b><span><strong>Znajdź dobry wynik</strong>Każdy kosz ma inną odpowiedź. Oblicz działanie i wybierz swój cel.</span></div><div><b>02</b><span><strong>Ustaw kąt i siłę</strong>Gałka góra / dół zmienia kąt, lewo / prawo zmienia siłę. Krzyżak wybiera przyciski; A je zatwierdza. Y przełącza tryb, B wraca do rzutu. Możesz też użyć suwaków. Kropki pokazują początek toru lotu.</span></div><div><b>03</b><span><strong>Rzuć piłkę</strong>A na padzie lub Enter / Spacja wykonuje rzut. Piłka odbija się od tablic, obręczy i boiska. Kosz liczy się przy wpadnięciu od góry.</span></div><div><b>04</b><span><strong>Próbuj, ile potrzebujesz</strong>Mecz trwa 3 minuty. Dobry kosz daje +3 punkty, błędny −1, pudło 0. Rzut poprawiasz od razu. X / H — pomoc, Start / P — pauza. Wynik zapisuje się w rankingu po meczu.</span></div></div><button class="launch-button modal-primary" data-action="close">Gramy! →</button>`);
  if (isBasket() && kind === 'pause') content = modalTemplate('Przerwa na boisku', 'PAUZA', '<p>Piłka i mecz czekają. Wrócisz dokładnie do tego samego rzutu.</p><div class="stacked-actions"><button class="launch-button" data-action="close"><span class="key-a">A</span> Wracamy na boisko →</button><button class="secondary-button" data-action="restart">Zacznij mecz od początku</button><button class="text-button" data-action="leave">Wróć do menu</button></div>');
  if (isBasket() && kind === 'settings') content = content.replace(/<h3>Jak lecimy[\s\S]*?<button class="launch-button modal-primary"/, '<p class="setting-note">W baskecie każdy rzut wykonujesz samodzielnie. Mecz trwa 3 minuty. Dobry kosz +3, błędny −1, pudło 0. Pauza zatrzymuje również zegar.</p><button class="launch-button modal-primary"');
  const restore = focusedAction();
  modalRoot.innerHTML = content;
  screen.inert = true;
  document.querySelector<HTMLElement>('.topbar')!.inert = true;
  document.querySelector<HTMLElement>('.footer')!.inert = true;
  if (restore && modalRoot.querySelector(`[data-action="${restore}"]`)) focusAction(restore);
  else focusButton(modalRoot.querySelector<HTMLButtonElement>('.modal-primary, .launch-button') ?? modalRoot.querySelector<HTMLButtonElement>('button'));
}
function closeModal(): void {
  modal = null; modalRoot.innerHTML = ''; scene.setPaused(false);
  screen.inert = false;
  document.querySelector<HTMLElement>('.topbar')!.inert = false;
  document.querySelector<HTMLElement>('.footer')!.inert = false;
  if (view === 'home') renderHome();
  if (previousFocus instanceof HTMLButtonElement && previousFocus.isConnected && !previousFocus.disabled) focusButton(previousFocus);
  else if (view === 'home' || view === 'result') focusAction('start');
}
function updateSoundButton(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-action="sound"]')!;
  button.classList.toggle('muted', !sound.enabled);
  button.setAttribute('aria-label', sound.enabled ? 'Wyłącz dźwięk' : 'Włącz dźwięk');
  button.setAttribute('aria-pressed', String(sound.enabled));
}
function updatePadStatus(pad: Gamepad | null): void {
  document.querySelector('#pad-label')!.textContent = pad ? 'Pad gotowy' : 'Podłącz pada';
  document.querySelector('#pad-dot')!.classList.toggle('connected', !!pad);
  if (pad && view === 'home' && !modal) { controllerNavigation = true; focusAction('start'); }
  if (!pad && view === 'game' && !modal) { openModal('pause'); toast('Pad został odłączony. Podłącz go lub użyj klawiatury.'); }
}
input.onPad = updatePadStatus;

function navigate(command: Direction): void {
  controllerNavigation = true;
  const container = modal ? modalRoot : root;
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter((button) => button.offsetParent !== null && !button.closest('[inert]'));
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0) { focusButton(buttons.find((button) => button.dataset.action === (modal ? 'close' : view === 'game' ? 'throw' : 'start')) ?? buttons[0]); return; }
  const next = nextControl(buttons.map((button) => button.getBoundingClientRect()), current, command);
  focusButton(buttons[next]); sound.play('select');
}
function toggleBasketMenu(): void {
  if (!isBasket() || view !== 'game' || modal) return;
  basketMenu = !basketMenu;
  if (basketMenu) { controllerNavigation = true; focusAction('throw'); }
  else { root.querySelectorAll('.pad-focus').forEach((entry) => entry.classList.remove('pad-focus')); (document.activeElement as HTMLElement)?.blur(); }
  updateBasketVisual();
}
input.onCommand = (command, source) => {
  sound.unlock();
  if (source !== 'keyboard') controllerNavigation = true;
  const direction = ['left', 'right', 'up', 'down'].includes(command);
  if (command === 'menu') { if (isBasket() && view === 'game' && !modal) toggleBasketMenu(); else navigate('right'); return; }
  if (command === 'back' && basketMenu && !modal && view === 'game') { toggleBasketMenu(); return; }
  if (command === 'back' || command === 'pause') {
    if (modal) closeModal();
    else if (view === 'game') openModal('pause');
    else if (view === 'result') renderHome('start');
    return;
  }
  if (modal || view !== 'game') {
    if (command === 'confirm') {
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement && active.offsetParent !== null && !active.closest('[inert]')) active.click();
      else if (view === 'home' || view === 'result') startMission();
    } else if (['left', 'right', 'up', 'down'].includes(command)) navigate(command as Direction);
    return;
  }
  if (isBasket()) {
    if (direction && (basketMenu || source === 'pad-button')) { basketMenu = true; navigate(command as Direction); updateBasketVisual(); }
    else if (command === 'confirm' && basketMenu) {
      const active = document.activeElement;
      if (active instanceof HTMLButtonElement && !active.disabled && !active.closest('[inert]')) active.click();
      else focusAction('throw');
    }
    else if (command === 'confirm') shootBasket();
    else if (command === 'hint' && !basketball.active) showHint();
    return;
  }
  if (phase === 'flight') { if (command === 'confirm') newQuestion(); return; }
  if (phase !== 'question' || answerPending) return;
  if (command === 'left' || command === 'right') {
    let index = selectedAnswer;
    for (let tries = 0; tries < choices.length; tries++) { index = (index + (command === 'left' ? -1 : 1) + 3) % 3; if (!incorrect.has(index)) break; }
    selectedAnswer = index; scene.setTarget(index); renderGame(); sound.play('select');
  } else if (command === 'confirm') answer(selectedAnswer);
  else if (command === 'hint') showHint();
};

root.addEventListener('click', async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action!;
  sound.unlock();
  if (action.startsWith('style:')) { gameStyle = action.endsWith('space') ? 'space' : 'basketball'; storeOption('matematyczny-basket:style', gameStyle); renderHome(action); }
  else if (action === 'basket-menu') toggleBasketMenu();
  else if (action === 'throw') shootBasket();
  else if (action.startsWith('aim:')) { const [, control, delta] = action.split(':'); changeAim(control, Number(delta)); }
  else if (action.startsWith('mode:')) { mode = action.split(':')[1] as Mode; sound.play('select'); renderHome(action); }
  else if (action.startsWith('pilot:')) { pilotId = action.split(':')[1]; storeOption('kosmiczna-wyprawa:pilot', pilotId); sound.play('select'); renderHome(action); }
  else if (action.startsWith('planet:')) { planetIndex = Number(action.split(':')[1]); sound.play('select'); renderHome(action); }
  else if (action.startsWith('range:')) { range = action.split(':')[1] as Range; openModal('settings'); }
  else if (action.startsWith('calm:')) { calm = action.endsWith('true'); openModal('settings'); }
  else if (action.startsWith('skin:')) { skin = action.split(':')[1]; storeOption('kosmiczna-wyprawa:skin', skin); applySkin(); openModal('hangar'); }
  else if (action.startsWith('answer:')) answer(Number(action.split(':')[1]));
  else if (action === 'start') startMission();
  else if (action === 'hint') showHint();
  else if (action === 'skip') newQuestion();
  else if (action === 'close') closeModal();
  else if (action === 'restart') { closeModal(); startMission(); }
  else if (action === 'leave') { closeModal(); renderHome('start'); }
  else if (action === 'home') { if (view === 'game') openModal('pause'); else renderHome('start'); }
  else if (['settings', 'pause', 'pad', 'hangar', 'help', 'stats', 'ranking'].includes(action)) openModal(action as NonNullable<typeof modal>);
  else if (action === 'sound') { sound.enabled = !sound.enabled; storeOption('kosmiczna-wyprawa:sound', sound.enabled ? 'on' : 'off'); updateSoundButton(); if (sound.enabled) sound.play('select'); }
  else if (action === 'fullscreen') {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { toast('Pełny ekran można też włączyć klawiszem F11 lub w menu przeglądarki.'); }
  }
});
root.addEventListener('focusin', (event) => {
  const button = event.target;
  root.querySelectorAll('.pad-focus').forEach((entry) => entry.classList.remove('pad-focus'));
  if (controllerNavigation && button instanceof HTMLButtonElement) button.classList.add('pad-focus');
});
root.addEventListener('pointermove', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action^="answer:"]');
  if (button && phase === 'question' && !button.disabled) {
    selectedAnswer = Number(button.dataset.action!.split(':')[1]);
    scene.setTarget(selectedAnswer);
    document.querySelectorAll('.answer-gate').forEach((gate, index) => {
      gate.classList.toggle('selected', index === selectedAnswer);
      gate.setAttribute('aria-pressed', String(index === selectedAnswer));
      const caption = gate.querySelector('.gate-bottom');
      if (caption && !incorrect.has(index)) caption.textContent = index === selectedAnswer ? `A / ENTER · ${actionLabel()}` : encounter() === 'portal' ? 'USTAW KURS' : encounter() === 'gate' ? 'WYBIERZ BRAMĘ' : 'USTAW CELOWNIK';
    });
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab' || !modal) return;
  const buttons = [...modalRoot.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
  if (!buttons.length) return;
  if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)!.focus(); }
  else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && view === 'game' && !modal) openModal('pause'); });
window.addEventListener('blur', () => { if (view === 'game' && !modal) openModal('pause'); });
function monitor(): void {
  const now = performance.now();
  const seconds = Math.max(0, (now - lastMonitorTime) / 1000);
  lastMonitorTime = now;
  if (isBasket() && view === 'game' && !modal) tickBasket(seconds);
  if (toastClock && performance.now() > toastClock) { document.querySelector('#toast')!.textContent = ''; toastClock = 0; }
  if (modal === 'pad') {
    const pad = input.getPad();
    const status = document.querySelector('#pad-live');
    if (status) status.innerHTML = pad ? `<strong class="pad-connected">● Kontroler wykryty</strong><p>${escape(pad.id)}</p><small>Mapowanie: ${escape(pad.mapping || 'niestandardowe')} · ${pad.buttons.length} przycisków</small><div class="pad-test-buttons">${pad.buttons.map((entry, i) => `<span class="${entry.pressed ? 'pressed' : ''}">${i}</span>`).join('')}</div><div class="pad-axes">${pad.axes.map((axis, i) => `<span>Oś ${i}: ${axis.toFixed(2)}</span>`).join('')}</div>` : '<div class="pad-waiting">Nie widzę jeszcze kontrolera.<br>Naciśnij przycisk na podłączonym padzie.</div>';
  }
  requestAnimationFrame(monitor);
}
renderHome(); updateSoundButton(); updatePadStatus(input.getPad()); monitor(); void initialize();
