# Matematyczny basket 🏀 i Kosmiczna wyprawa 🚀

Gra edukacyjna dla dzieci: mnożenie i dzielenie w zakresie **10 × 10** oraz **dodawanie i odejmowanie do 20**, lot statkiem, trzy planety i nagrody. Zaprojektowana do wyświetlania na dużym telewizorze i sterowania padem.

**Graj:** https://maciejkoch.github.io/Tabliczka-mnozenia/

Wyprawa przygotowana dla **Emilii, Jakuba i Piotra**. Wybierz pilota w menu; gra przywita dziecko po imieniu i będzie zwracać się do niego podczas lotu, podpowiedzi i ukończenia misji. Wybór jest zapamiętywany, a postępy na jednym komputerze są wspólne.

## Matematyczny basket

Widok boiska z boku: zawodnik po lewej i trzy kosze z odpowiedziami na różnych wysokościach i odległościach. Oblicz działanie, ustaw kąt i siłę, a potem rzuć do właściwego kosza. W menu możesz wrócić do kosmicznej wyprawy.

Mecz trwa **3 minuty aktywnej gry**. Każdy kosz z poprawnym wynikiem daje **+3 punkty**, każdy kosz z błędnym wynikiem **−1 punkt**, a pudło **0**. Wynik może być ujemny. Podpowiedź nie obniża punktów za poprawny kosz. Po dobrym koszu pojawia się kolejne działanie; liczba działań nie jest ograniczona. Pauza zatrzymuje zegar i fizykę. Po sygnale końca nie nalicza się kolejnych trafień.

| Akcja | Pad | Klawiatura / mysz |
| --- | --- | --- |
| Kąt i siła rzutu | Lewa gałka | Strzałki / WASD, suwaki, + / − |
| Rzut / natychmiastowe ponowienie | A w trybie rzutu | Enter / Spacja, „Rzuć piłkę” |
| Wybór przycisków | Krzyżak; także gałka w trybie przycisków | Strzałki w menu, Tab |
| Przełącz rzut / przyciski | Y | M lub przycisk Y / M |
| Zatwierdź wybrany przycisk | A w trybie przycisków | Enter / Spacja |
| Wróć do rzutu / zamknij okno | B | Esc |
| Podpowiedź | X | H |
| Pauza | Start | P |

Przyciski wybierane padem mają wyraźną ramkę. Nawigacja przewija do wybranego elementu i zawija na brzegach menu. Krzyżak w trakcie meczu włącza wybieranie przycisków; B wraca do celowania gałką. Menu główne, ustawienia, pauza, ranking i ekran wyniku działają bez myszy.

Fizyka Matter.js symuluje grawitację, obrót, tarcie i odbicia od obręczy, tablic oraz podłoża. Kosz liczy się po przejściu piłki od góry przez obręcz. Każdy kosz jest osiągalny dostępnym kątem 25–78° i siłą 10–100%. Nowy rzut natychmiast zastępuje poprzednią piłkę.

**Ranking** aktualizuje się po każdym ukończonym meczu i zapisuje w localStorage pod kluczem `matematyczny-basket:ranking:v1`. Zachowuje wszystkie ukończone mecze, nazwę gracza, punkty, kosze, liczbę rzutów, tryb, zakres i datę. Pokazuje 10 najlepszych wyników oraz bieżący wynik, jeśli zajmuje dalsze miejsce. Sortowanie: punkty malejąco, dobre kosze malejąco, błędne kosze rosnąco, data. Ranking jest dostępny z menu oraz na ekranie końca meczu. Przerwany lub zrestartowany mecz nie dodaje wpisu. Ranking jest lokalny dla danego urządzenia i adresu strony.

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
