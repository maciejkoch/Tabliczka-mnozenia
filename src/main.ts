import '@fontsource-variable/baloo-2';
import '@fontsource-variable/nunito-sans';
import './style.css';
import { answerChoices, chooseFact, equation, explanation, factPool, parseProgress, updateFact, type Fact, type Mode, type Range } from './learning';
import { Input, type Command } from './input';
import { Sound } from './audio';
import { SpaceScene } from './scene';

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
const modeNames = { multiply: 'Mnożenie', divide: 'Dzielenie', mixed: 'Mieszany' };
const storageKey = 'kosmiczna-wyprawa:progress:v1';
function readStored(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
let progress = parseProgress(readStored(storageKey));
let storageAvailable = true;
let mode: Mode = 'mixed';
let range: Range = 'all';
let planetIndex = 0;
let calm = false;
let skin = readStored('kosmiczna-wyprawa:skin') ?? 'original';
let view: 'home' | 'game' | 'result' = 'home';
let modal: 'settings' | 'pause' | 'pad' | 'hangar' | 'help' | 'stats' | null = null;
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
let toastClock = 0;
const questionCount = 12;
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
function focusAction(action: string): void { const button = [...document.querySelectorAll<HTMLButtonElement>('button[data-action]')].find((entry) => entry.dataset.action === action && entry.offsetParent !== null); button?.focus({ preventScroll: true }); }
function renderHome(restore?: string | null): void {
  view = 'home';
  scene.setPhase('idle');
  canvasHost.classList.remove('visible');
  root.classList.remove('playing');
  const planet = planets[planetIndex];
  screen.className = 'home-screen';
  screen.innerHTML = `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="tiny-orbit"></span> TWOJA MISJA: ODKRYWAĆ I LICZYĆ</div>
    <h1>Kosmos czeka.<br><span>Leć po przygodę!</span></h1><p class="hero-description">Pilotuj statek, odkrywaj planety i oswajaj<br class="wide-only"> mnożenie oraz dzielenie do <strong>10 × 10.</strong></p>
    <div class="hero-badges"><span><i></i> Dla małych odkrywców</span><span>Bez pośpiechu</span><span>Na padzie lub klawiaturze</span></div></div>
    <div class="hero-visual" aria-hidden="true"><div class="orbit-dash"></div><img class="hero-ship" src="${art}ship.png" alt=""/><span class="coordinate">SEKTOR 10 × 10<span>WSZYSTKIE SYSTEMY GOTOWE</span></span><span class="hero-spark spark-one">✧</span><span class="hero-spark spark-two">+</span></div>
  </section>
  <section class="mission-panel" aria-labelledby="mission-title"><div class="section-title"><h2 id="mission-title">Przygotuj swoją wyprawę</h2><button class="text-button" data-action="help">Jak gramy? ${icons.arrow}</button></div>
    <div class="mission-config"><div class="mode-block"><p class="field-label"><span>01</span> CO DZIŚ ĆWICZYMY?</p><div class="mode-options" role="group" aria-label="Rodzaj działań">${(['multiply', 'divide', 'mixed'] as Mode[]).map((entry) => `<button class="mode-card ${mode === entry ? 'selected' : ''}" data-action="mode:${entry}" aria-pressed="${mode === entry}"><span class="mode-symbol">${entry === 'multiply' ? '×' : entry === 'divide' ? '÷' : '× ÷'}</span><span>${modeNames[entry]}<small>${entry === 'mixed' ? 'Podwójna przygoda' : entry === 'multiply' ? 'Łączymy w grupy' : 'Dzielimy po równo'}</small></span><i class="selection-dot"></i></button>`).join('')}</div></div>
    <div class="planet-block"><p class="field-label"><span>02</span> WYBIERZ PLANETĘ</p><div class="planet-options" role="group" aria-label="Cel wyprawy">${planets.map((entry, i) => `<button class="planet-card ${planetIndex === i ? 'selected' : ''}" data-action="planet:${i}" aria-pressed="${planetIndex === i}" style="--planet-color:${entry.color}"><span class="planet-orb ${entry.class}"><i></i></span><span>${entry.name}<small>${stars(progress.planets[entry.id] ?? 0)}</small></span></button>`).join('')}</div></div></div>
    <div class="launch-row"><button class="settings-button" data-action="settings">${icons.settings}<span>Zakres: <strong>${range === 'all' ? '1–10' : range === 'easy' ? '1–5' : '6–10'}</strong><small>${calm ? 'Spokojny lot' : 'Lot z kryształami'}</small></span></button><div class="mission-summary"><span class="mini-dot" style="background:${planet.color}"></span><span>${planet.subtitle}<small>12 działań · krótka misja · bez limitu odpowiedzi</small></span></div><button class="launch-button" data-action="start" ${!ready ? 'disabled' : ''}><span class="key-a">A</span><span>${failed ? 'Spróbuj ponownie' : ready ? 'Ruszaj w kosmos' : 'Przygotowanie statku…'}</span>${icons.arrow}</button></div>
  </section>
  <section class="home-bottom"><button class="progress-chip" data-action="stats"><span class="chip-icon">${icons.star}</span><span>Twoja kosmiczna historia<small>${progress.missions ? `${progress.missions} ukończonych misji · ${progress.crystals} kryształów` : 'Pierwsza przygoda dopiero przed Tobą'}</small></span>${icons.arrow}</button><button class="hangar-link" data-action="hangar"><span class="mini-ship">✦</span> Hangar <small>${unlockedSkin() + 1}/4 statki</small>${icons.arrow}</button></section>`;
  if (restore) focusAction(restore);
}

async function initialize(): Promise<void> {
  try {
    await scene.init(canvasHost);
    ready = true;
    failed = false;
    applySkin();
    renderHome();
  } catch (error) {
    console.error('Nie udało się przygotować grafiki gry:', error);
    failed = true;
    toast('Nie udało się uruchomić grafiki. Odśwież stronę i sprawdź akcelerację sprzętową przeglądarki.', 15);
    const button = screen.querySelector<HTMLButtonElement>('[data-action="start"]');
    if (button) { button.disabled = false; button.textContent = 'Odśwież grę'; }
  }
}
function startMission(): void {
  if (!ready) { if (failed) location.reload(); return; }
  sound.unlock();
  sound.play('select');
  view = 'game';
  questionIndex = 0; firstTryCount = 0; missionCrystals = 0; recent = []; earnedStars = 0; missionSaved = false;
  phase = 'flight'; phaseTime = 0;
  scene.reset();
  scene.setTheme(planets[planetIndex].hex, planetIndex);
  applySkin();
  scene.setPhase(calm ? 'question' : 'flight');
  canvasHost.classList.add('visible');
  root.classList.add('playing');
  if (calm) newQuestion(); else renderGame();
  (document.activeElement as HTMLElement)?.blur();
}
function renderGame(): void {
  screen.className = 'game-screen';
  const planet = planets[planetIndex];
  const station = questionIndex >= questionCount - 3;
  screen.innerHTML = `<div class="game-hud"><button class="hud-destination" data-action="pause"><span class="planet-orb tiny ${planet.class}"><i></i></span><span>${station ? 'Stacja ' : 'Kierunek: '}${planet.name}<small>${station ? 'Finał misji · uruchom stację' : `${modeNames[mode]} · zakres ${range === 'all' ? '1–10' : range === 'easy' ? '1–5' : '6–10'}`}</small></span></button><div class="mission-dots" aria-label="${questionIndex} z ${questionCount} działań">${Array.from({ length: questionCount }, (_, i) => `<i class="${i < questionIndex ? 'done' : i === questionIndex ? 'current' : ''} ${i >= 9 ? 'station-dot' : ''}"></i>`).join('')}</div><div class="hud-right"><span class="crystal-count"><span>◆</span><b id="crystal-count">${missionCrystals}</b></span><button class="icon-button pause-button" data-action="pause" aria-label="Pauza">Ⅱ</button></div></div>
    <div id="game-content">${phase === 'flight' ? flightMarkup() : questionMarkup()}</div>
    <div class="game-bottom-label"><span>SEKTOR ${planet.number} / ${station ? 'STACJA ORBITALNA' : 'SZLAK ODKRYWCÓW'}</span><span>${phase === 'flight' ? '<kbd>← →</kbd> / gałka — steruj statkiem' : '<kbd>← →</kbd> wybierz bramę · <span class="key-a">A</span> / <kbd>Enter</kbd> zatwierdź'}</span></div>`;
}
function flightMarkup(): string {
  return `<section class="flight-info"><div class="eyebrow">${questionIndex === 0 ? 'WITAJ NA POKŁADZIE, PILOCIE!' : 'ŚWIETNIE! LECIMY DALEJ'}</div><h2>${questionIndex === 0 ? 'Złap trochę gwiezdnej energii' : 'Zbieraj kryształy po drodze'}</h2><p>Ruszaj gałką lub strzałkami. Omijaj asteroidy — nie tracisz punktów.</p><div class="flight-progress"><i id="flight-fill"></i></div><button class="skip-flight" data-action="skip">Przejdź do działania ${icons.arrow}</button></section>`;
}
function hintMarkup(): string {
  const groups = fact.op === 'multiply' ? fact.a : fact.answer;
  const perGroup = fact.b;
  return `<div class="hint-card" role="status"><div class="robot-face" aria-hidden="true"><i></i><i></i></div><div class="hint-copy"><strong>Policzmy razem</strong><p>${explanation(fact)}</p><div class="hint-groups" aria-label="Kryształy ułożone w równe grupy">${Array.from({ length: groups }, () => `<span class="hint-group">${Array.from({ length: perGroup }, () => '<i></i>').join('')}</span>`).join('')}</div></div></div>`;
}
function questionMarkup(): string {
  const station = questionIndex >= questionCount - 3;
  return `<section class="question-area" aria-label="Działanie ${questionIndex + 1}"><div class="eyebrow">${station ? 'URUCHOM STACJĘ · ' : 'OTWÓRZ BRAMĘ · '}DZIAŁANIE ${questionIndex + 1} Z ${questionCount}</div><h2 class="equation" aria-label="${equation(fact)} równa się ile">${equation(fact)} <span>= ?</span></h2><p class="question-prompt" aria-live="polite">${phase === 'correct' ? 'Brawo! Brama otwarta. Lecimy dalej!' : hintShown ? 'Spokojnie, masz tyle prób, ile potrzebujesz.' : station ? 'Wybierz wynik, żeby zasilić kosmiczną stację.' : 'Która brama ma właściwy wynik?'}</p>${hintShown && phase !== 'correct' ? hintMarkup() : ''}</section>
    <div class="answer-gates" role="group" aria-label="Wybierz odpowiedź">${choices.map((choice, index) => `<button class="answer-gate ${selectedAnswer === index ? 'selected' : ''} ${incorrect.has(index) ? 'incorrect' : ''} ${phase === 'correct' && choice === fact.answer ? 'correct' : ''}" data-action="answer:${index}" aria-label="Odpowiedź ${choice}" aria-pressed="${selectedAnswer === index}" ${phase === 'correct' || incorrect.has(index) ? 'disabled' : ''}><span class="gate-top">BRAMA 0${index + 1}</span><strong>${choice}</strong><span class="gate-bottom">${phase === 'correct' && choice === fact.answer ? '✦ DOBRA ODPOWIEDŹ' : incorrect.has(index) ? 'SPRÓBUJ INNEJ' : selectedAnswer === index ? 'A / ENTER · WYBIERZ' : 'WYBIERZ BRAMĘ'}</span><i></i></button>`).join('')}</div>
    ${phase === 'question' && !hintShown ? '<button class="hint-button" data-action="hint"><span class="key-x">X</span> / <kbd>H</kbd> Potrzebuję podpowiedzi</button>' : ''}`;
}
function newQuestion(): void {
  phase = 'question'; phaseTime = 0; selectedAnswer = 1; firstTry = true; hintShown = false; incorrect.clear();
  fact = chooseFact(factPool(mode, range), progress, recent, progress.missions * questionCount + questionIndex);
  recent.push(fact.id);
  choices = answerChoices(fact);
  scene.setPhase('question'); scene.setTarget(selectedAnswer);
  renderGame();
}
function answer(index: number): void {
  if (phase !== 'question' || modal || incorrect.has(index)) return;
  selectedAnswer = index;
  scene.setTarget(index);
  if (choices[index] === fact.answer) {
    if (firstTry) firstTryCount++;
    missionCrystals += firstTry ? 5 : 3;
    if (storageAvailable) progress = parseProgress(readStored(storageKey));
    updateFact(progress, fact, firstTry, progress.missions * questionCount + questionIndex);
    save();
    phase = 'correct'; phaseTime = 0;
    scene.setPhase('correct');
    sound.play('correct');
    input.getPad()?.vibrationActuator?.playEffect('dual-rumble', { duration: 140, strongMagnitude: 0.15, weakMagnitude: 0.35 }).catch(() => {});
  } else {
    firstTry = false; hintShown = true; incorrect.add(index);
    sound.play('hint');
    selectedAnswer = choices.findIndex((_, i) => !incorrect.has(i));
    scene.setTarget(selectedAnswer);
  }
  renderGame();
  (document.activeElement as HTMLElement)?.blur();
}
function showHint(): void {
  if (phase !== 'question') return;
  firstTry = false; hintShown = true; sound.play('hint'); renderGame();
}
function finishMission(): void {
  view = 'result';
  scene.setPhase('idle');
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
  screen.innerHTML = `<section class="result-card"><span class="eyebrow">MISJA ZAKOŃCZONA</span><div class="result-planet"><span class="planet-orb ${planets[planetIndex].class}"><i></i></span><span class="result-spark">✦</span></div><h1>Witaj na ${planets[planetIndex].name}!</h1><p>Stacja działa, a Ty masz za sobą kolejną kosmiczną przygodę.</p><div class="result-stars">${stars(earnedStars)}</div><div class="result-numbers"><span><strong>${questionCount}</strong>rozwiązanych działań</span><span><strong>${firstTryCount}</strong>bez podpowiedzi</span><span><strong>◆ ${missionCrystals}</strong>nowych kryształów</span></div><div class="result-note">${newSkin ? '✦ Nowy kolor statku czeka na Ciebie w hangarze!' : 'Każda próba to krok naprzód. Dobra robota, pilocie!'}${!storageAvailable ? '<br>Przeglądarka blokuje zapis. Postępy pozostaną do zamknięcia strony.' : ''}</div><div class="result-actions"><button class="secondary-button" data-action="home">Mapa wypraw</button><button class="launch-button" data-action="start"><span class="key-a">A</span> Jeszcze jedna misja ${icons.arrow}</button></div>${newSkin ? '<button class="text-button" data-action="hangar">Zobacz nowy statek →</button>' : ''}</section>`;
  focusAction('start');
}

scene.getMovement = () => input.movement;
scene.onCrystal = () => { missionCrystals++; sound.play('crystal'); const counter = document.querySelector('#crystal-count'); if (counter) counter.textContent = String(missionCrystals); };
scene.onBump = () => toast('Mała turbulencja. Lecimy dalej!', 1.5);
scene.onTick = (seconds) => {
  if (view !== 'game' || modal) return;
  phaseTime += seconds;
  if (phase === 'flight') {
    const duration = questionIndex === 0 ? 8 : 6;
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
  if (kind === 'settings') content = modalTemplate('Wyprawa na Twoich zasadach', 'USTAWIENIA MISJI', `<p>Wybierz zakres i tempo. Na odpowiedź zawsze masz tyle czasu, ile potrzebujesz.</p><h3>Zakres tabliczki</h3><div class="segmented">${(['easy', 'hard', 'all'] as Range[]).map((entry) => `<button data-action="range:${entry}" aria-pressed="${range === entry}" class="${range === entry ? 'selected' : ''}">${entry === 'all' ? 'Cała · 1–10' : entry === 'easy' ? 'Początek · 1–5' : 'Wyzwanie · 6–10'}</button>`).join('')}</div><p class="setting-note">${range === 'all' ? 'Wszystkie iloczyny do 100 i odwrotne dzielenie bez reszty.' : range === 'easy' ? 'Mnożenie przez 1–5 lub dzielenie przez 1–5. Drugi czynnik i iloraz: 1–10.' : 'Mnożenie przez 6–10 lub dzielenie przez 6–10. Drugi czynnik i iloraz: 1–10.'}</p><h3>Jak lecimy?</h3><div class="segmented"><button data-action="calm:false" class="${!calm ? 'selected' : ''}" aria-pressed="${!calm}">Przygoda z lotem</button><button data-action="calm:true" class="${calm ? 'selected' : ''}" aria-pressed="${calm}">Spokojnie · same bramy</button></div><p class="setting-note">Spokojny tryb pomija asteroidy i zbieranie kryształów między działaniami.</p><button class="launch-button modal-primary" data-action="close">Gotowe ${icons.arrow}</button>`);
  if (kind === 'pause') content = modalTemplate('Mały przystanek w kosmosie', 'PAUZA', '<p>Statek czeka. Możesz odpocząć, a potem wrócić do tej samej misji.</p><div class="stacked-actions"><button class="launch-button" data-action="close"><span class="key-a">A</span> Lecimy dalej →</button><button class="secondary-button" data-action="restart">Zacznij misję od początku</button><button class="text-button" data-action="leave">Wróć do mapy wypraw</button></div><p class="setting-note">Ukończone działania zostały zapamiętane. Nagrody za misję zapisują się po dotarciu na planetę.</p>');
  if (kind === 'help') content = modalTemplate('Każdy może zostać pilotem', 'INSTRUKCJA POKŁADOWA', `<div class="how-steps"><div><b>01</b><span><strong>Zbieraj kosmiczną energię</strong>Gałką lub strzałkami steruj statkiem. Łap kryształy i omijaj asteroidy.</span></div><div><b>02</b><span><strong>Otwieraj bramy działaniami</strong>Wybierz prawidłowy wynik mnożenia albo dzielenia. Zatwierdź przyciskiem A lub Enter.</span></div><div><b>03</b><span><strong>Gdy potrzebujesz, poproś o pomoc</strong>Przycisk X albo H pokaże kryształy w grupach. Możesz próbować do skutku.</span></div><div><b>04</b><span><strong>Uruchom stację i zdobądź nagrody</strong>Ostatnie trzy działania zasilają stację. Za ukończone misje odblokujesz kolory statku.</span></div></div><p class="setting-note">Start / P — pauza · B / Esc — wróć lub pauza. Menu również obsłużysz padem. Nie tracisz nagród za pomyłki.</p><button class="launch-button modal-primary" data-action="close">Rozumiem, lecimy! →</button>`);
  if (kind === 'pad') content = modalTemplate('Sprawdź swojego pada', 'KONTROLA PRZED STARTEM', '<p>Podłącz kontroler przez USB lub Bluetooth, kliknij stronę i naciśnij dowolny przycisk pada.</p><div id="pad-live"></div><div class="pad-legend"><span><b>Gałka / krzyżak</b>ruch i wybór</span><span><b>A / przycisk 0</b>zatwierdź</span><span><b>X / przycisk 2</b>podpowiedź</span><span><b>Start / przycisk 9</b>pauza</span></div><p class="setting-note">Gra korzysta ze standardowego układu pada. Jeśli tani kontroler działa inaczej, przełącz go w tryb XInput, jeśli ma taką opcję. Klawiatura zawsze jest dostępna.</p><button class="launch-button modal-primary" data-action="close">Gotowe →</button>');
  if (kind === 'hangar') {
    const skins = [{ id: 'original', name: 'Odkrywca', class: '', missions: 0 }, { id: 'gold', name: 'Słoneczny', class: 'gold', missions: 1 }, { id: 'ice', name: 'Lodowy', class: 'ice', missions: 3 }, { id: 'rose', name: 'Gwiezdny', class: 'rose', missions: 5 }];
    content = modalTemplate('Twój statek, Twój styl', 'HANGAR PILOTA', `<p>Ukończ misje i odblokuj nowe kolory. Każda ukończona wyprawa się liczy.</p><div class="skin-grid">${skins.map((entry) => `<button class="skin-card ${skin === entry.id ? 'selected' : ''}" data-action="skin:${entry.id}" ${progress.missions < entry.missions ? 'disabled' : ''} aria-pressed="${skin === entry.id}"><img class="${entry.class}" src="${art}ship.png" alt=""/><strong>${entry.name}</strong><small>${progress.missions < entry.missions ? `Odblokuj: ${entry.missions} ${entry.missions === 1 ? 'misja' : entry.missions < 5 ? 'misje' : 'misji'}` : skin === entry.id ? 'Twój statek' : 'Wybierz statek'}</small></button>`).join('')}</div><button class="launch-button modal-primary" data-action="close">Gotowe →</button>`);
  }
  if (kind === 'stats') {
    const mastered = Object.values(progress.facts).filter((record) => record.streak >= 3).length;
    const practiced = Object.keys(progress.facts).length;
    const practice = Object.entries(progress.facts).filter(([, record]) => record.wrong > 0 && record.streak < 3).sort((a, b) => b[1].wrong - a[1].wrong).slice(0, 6);
    content = modalTemplate('Twoja kosmiczna historia', 'DZIENNIK PILOTA', `<div class="stats-grid"><span><strong>${progress.missions}</strong>ukończonych misji</span><span><strong>${progress.crystals}</strong>kryształów</span><span><strong>${practiced}</strong>różnych działań</span><span><strong>${mastered}</strong>opanowanych działań</span></div><h3>Nasze planety</h3><div class="stats-planets">${planets.map((entry) => `<span>${entry.name}<span>${stars(progress.planets[entry.id] ?? 0)}</span></span>`).join('')}</div>${practice.length ? `<h3>Do poćwiczenia podczas kolejnych misji</h3><div class="practice-facts">${practice.map(([id]) => { const [op, a, b] = id.split(':'); return `<span>${a} ${op === 'm' ? '×' : '÷'} ${b}</span>`; }).join('')}</div>` : '<p>Robot pomocnik będzie zapamiętywać działania, które warto powtórzyć.</p>'}<p class="setting-note">Opanowane = 3 poprawne odpowiedzi z rzędu bez pomocy. Postępy są zapisane w tej przeglądarce, na tym komputerze.${!storageAvailable ? ' Uwaga: zapis jest obecnie zablokowany przez przeglądarkę.' : ''}</p><button class="launch-button modal-primary" data-action="close">Gotowe →</button>`);
  }
  const restore = focusedAction();
  modalRoot.innerHTML = content;
  screen.inert = true;
  document.querySelector<HTMLElement>('.topbar')!.inert = true;
  document.querySelector<HTMLElement>('.footer')!.inert = true;
  if (restore && modalRoot.querySelector(`[data-action="${restore}"]`)) focusAction(restore);
  else modalRoot.querySelector<HTMLButtonElement>('.modal-primary, .launch-button, button')?.focus({ preventScroll: true });
}
function closeModal(): void {
  modal = null; modalRoot.innerHTML = ''; scene.setPaused(false);
  screen.inert = false;
  document.querySelector<HTMLElement>('.topbar')!.inert = false;
  document.querySelector<HTMLElement>('.footer')!.inert = false;
  if (view === 'home') renderHome();
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
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
  if (!pad && view === 'game' && !modal) { openModal('pause'); toast('Pad został odłączony. Podłącz go lub użyj klawiatury.'); }
}
input.onPad = updatePadStatus;

function navigate(command: Command): void {
  const container = modal ? modalRoot : root;
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter((button) => button.offsetParent !== null && !button.closest('[inert]'));
  const current = document.activeElement as HTMLButtonElement;
  if (!buttons.includes(current)) { (modal ? modalRoot.querySelector<HTMLButtonElement>('.launch-button') : screen.querySelector<HTMLButtonElement>('[data-action="start"]'))?.focus({ preventScroll: true }); return; }
  const origin = current.getBoundingClientRect();
  const x = origin.x + origin.width / 2, y = origin.y + origin.height / 2;
  const horizontal = command === 'left' || command === 'right';
  const direction = command === 'left' || command === 'up' ? -1 : 1;
  const candidates = buttons.filter((button) => button !== current).map((button) => {
    const rect = button.getBoundingClientRect();
    const dx = rect.x + rect.width / 2 - x, dy = rect.y + rect.height / 2 - y;
    return { button, primary: (horizontal ? dx : dy) * direction, cross: Math.abs(horizontal ? dy : dx) };
  }).filter((candidate) => candidate.primary > 5).sort((a, b) => (a.primary + a.cross * 2.4) - (b.primary + b.cross * 2.4));
  candidates[0]?.button.focus({ preventScroll: true });
  if (candidates.length) sound.play('select');
}
input.onCommand = (command) => {
  sound.unlock();
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
    } else if (['left', 'right', 'up', 'down'].includes(command)) navigate(command);
    return;
  }
  if (phase === 'flight') { if (command === 'confirm') newQuestion(); return; }
  if (phase !== 'question') return;
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
  if (action.startsWith('mode:')) { mode = action.split(':')[1] as Mode; sound.play('select'); renderHome(action); }
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
  else if (['settings', 'pause', 'pad', 'hangar', 'help', 'stats'].includes(action)) openModal(action as NonNullable<typeof modal>);
  else if (action === 'sound') { sound.enabled = !sound.enabled; storeOption('kosmiczna-wyprawa:sound', sound.enabled ? 'on' : 'off'); updateSoundButton(); if (sound.enabled) sound.play('select'); }
  else if (action === 'fullscreen') {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { toast('Pełny ekran można też włączyć klawiszem F11 lub w menu przeglądarki.'); }
  }
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
      if (caption && !incorrect.has(index)) caption.textContent = index === selectedAnswer ? 'A / ENTER · WYBIERZ' : 'WYBIERZ BRAMĘ';
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
  if (toastClock && performance.now() > toastClock) { document.querySelector('#toast')!.textContent = ''; toastClock = 0; }
  if (modal === 'pad') {
    const pad = input.getPad();
    const status = document.querySelector('#pad-live');
    if (status) status.innerHTML = pad ? `<strong class="pad-connected">● Kontroler wykryty</strong><p>${escape(pad.id)}</p><small>Mapowanie: ${escape(pad.mapping || 'niestandardowe')} · ${pad.buttons.length} przycisków</small><div class="pad-test-buttons">${pad.buttons.map((entry, i) => `<span class="${entry.pressed ? 'pressed' : ''}">${i}</span>`).join('')}</div><div class="pad-axes">${pad.axes.map((axis, i) => `<span>Oś ${i}: ${axis.toFixed(2)}</span>`).join('')}</div>` : '<div class="pad-waiting">Nie widzę jeszcze kontrolera.<br>Naciśnij przycisk na podłączonym padzie.</div>';
  }
  requestAnimationFrame(monitor);
}
renderHome(); updateSoundButton(); updatePadStatus(input.getPad()); monitor(); void initialize();
