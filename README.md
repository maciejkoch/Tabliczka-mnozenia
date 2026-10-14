# Kosmiczna wyprawa 🚀

Gra edukacyjna dla dzieci: mnożenie i dzielenie w zakresie **10 × 10** oraz **dodawanie i odejmowanie do 20**, lot statkiem, trzy planety i nagrody. Zaprojektowana do wyświetlania na dużym telewizorze i sterowania padem.

**Graj:** https://maciejkoch.github.io/Tabliczka-mnozenia/

Wyprawa przygotowana dla **Emilii, Jakuba i Piotra**. Wybierz pilota w menu; gra przywita dziecko po imieniu i będzie zwracać się do niego podczas lotu, podpowiedzi i ukończenia misji. Wybór jest zapamiętywany, a postępy na jednym komputerze są wspólne.

## Jak uruchomić

Podłącz komputer do telewizora, podłącz pad, otwórz grę i naciśnij przycisk na padzie. Ikona w prawym górnym rogu włącza pełny ekran. „Podłącz pada” otwiera test kontrolera. W ustawieniach wybierz całą tabliczkę albo zakres 1–5 / 6–10. Tryb „Do 20” miesza dodawanie i odejmowanie, uwzględnia zero i nie generuje wyników ujemnych. Pierwszy przelot trwa 16 sekund, kolejne 12 sekund. Spokojny tryb zachowuje wybieranie bram i pomija przeloty, strzelanie oraz bossa.

W przygodzie zadania przeplatają **laser matematyczny** i **portale**. Gałką lub krzyżakiem ustaw cel albo kurs, a przyciskiem **A** strzel do drona z poprawnym wynikiem lub wleć do właściwego portalu. Ostatnie trzy działania wyłączają generatory tarczy **strażnika stacji**. Akcje czekają na decyzję pilota; nie ma limitu czasu na obliczenia. Pauza zatrzymuje także wystrzelony laser i lot przez portal.

| Akcja | Standardowy pad | Klawiatura |
| --- | --- | --- |
| Ruch / wybór | Lewa gałka lub krzyżak | Strzałki / WASD |
| Strzel / leć / zatwierdź / pomiń przelot | A (przycisk 0) | Enter / Spacja |
| Podpowiedź | X (przycisk 2) | H |
| Pauza | Start (przycisk 9) | P |
| Wróć / pauza | B (przycisk 1) | Esc |

Pad korzysta z Gamepad API. Przy niestandardowym kontrolerze może być potrzebny tryb XInput. Faktyczne wykrywanie i mapowanie sprawdzisz na ekranie testu pada.

Misja ma 12 działań. Podpowiedzi pokazują kryształy w grupach. Odpowiedzi nie mają limitu czasu; pomyłki nie odejmują punktów. Trudniejsze działania pojawiają się częściej. Postępy i odblokowane statki zapisują się w localStorage na używanym komputerze. Czyszczenie danych przeglądarki usuwa ten zapis. Gra nie wysyła wyników na serwer. Fonty są dołączone do gry i nie wymagają połączenia z Google Fonts.

## Rozwój lokalny

Wymagany Node.js 22 lub nowszy.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Publikacja

GitHub Pages powinno mieć źródło **GitHub Actions**. Workflow `.github/workflows/deploy.yml` uruchamia testy, buduje aplikację i publikuje `dist` po każdym pushu do `main`. Vite ustawia ścieżkę bazową `/Tabliczka-mnozenia/` podczas budowania w Actions.

Opis mechaniki: [GAME_DESIGN.md](GAME_DESIGN.md). Prompty grafik: [public/art/ART_PROMPTS.md](public/art/ART_PROMPTS.md).
