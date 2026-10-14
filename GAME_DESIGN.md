# Kosmiczna wyprawa

Gra webowa dla dziewięciolatka, wyświetlana na telewizorze podłączonym do komputera i obsługiwana padem. Nauka mnożenia i dzielenia w zakresie tabliczki do 10 × 10.

Gra jest spersonalizowana dla Emilii, Jakuba i Piotra. Na ekranie startowym wybiera się pilota; imię pojawia się w powitaniu, przelotach, podpowiedziach, po poprawnej odpowiedzi i na ekranie ukończenia misji. Wybór pilota jest zapamiętany w przeglądarce. Postępy pozostają wspólne na danym komputerze.

## Zakres nauki

- Mnożenie: oba czynniki od 1 do 10, wyniki od 1 do 100.
- Dzielenie: działania odwrotne, dzielniki i ilorazy od 1 do 10, dzielne do 100. Zawsze bez reszty, bez dzielenia przez zero.
- Tryby: mnożenie, dzielenie, mieszany (mnożenie i dzielenie) oraz „Do 20” (dodawanie i odejmowanie).
- Tryb „Do 20”: liczby od 0 do 20, sumy do 20 i odejmowanie bez wyników ujemnych. Podpowiedzi pokazują łączenie grup kryształów lub przekreślanie zabieranych kryształów.
- Zakres: 1–5, 6–10 lub pełna tabliczka. Zakres ogranicza pierwszy czynnik mnożenia lub dzielnik; drugi czynnik i iloraz pozostają od 1 do 10.
- Działania wymagające pomocy wracają częściej. Przynajmniej cztery ostatnie pytania są wyłączane z natychmiastowej powtórki.
- Brak limitu czasu odpowiedzi. Podpowiedź pokazuje grupy kryształów i sposób obliczenia. Dziecko próbuje aż do poprawnej odpowiedzi, bez utraty nagród.

## Pętla gry

1. Wybierz rodzaj działań, planetę i zakres.
2. Pilotuj automatycznie lecący statek. Pierwszy przelot trwa 16 sekund, kolejne 12 sekund. Można ręcznie przejść do działania. Zbieraj kryształy i omijaj asteroidy. Zderzenia powodują jedynie lekkie przesunięcie.
3. Zadania 1–9 przeplatają strzelanie do dronów z odpowiedziami i lot przez portale. Gałka/krzyżak ustawia jeden z trzech celów, A strzela lub uruchamia lot. Akcja jest blokowana do trafienia/przelotu, więc trzymanie A nie wysyła wielu odpowiedzi.
4. Wynik sprawdzany jest po dotarciu lasera lub statku do celu. Poprawne trafienie uruchamia efekty i nagrodę, błędne pokazuje podpowiedź oraz pozwala wybrać inny cel. Pauza zatrzymuje animację i sprawdzenie odpowiedzi.
5. Ostatnie trzy działania wyłączają kolejne generatory tarczy strażnika stacji. Widoczny robot i wskaźnik 0–3 pokazują postęp; trzeci generator uwalnia stację. Łącznie jedna misja ma 12 działań.
6. Otrzymaj 1–3 gwiazdki, kryształy i postęp misji. Kolory statku odblokowują się po 1, 3 i 5 ukończonych misjach.

Trzy planety: Flora, Polaris i Sol. Można grać na każdej od początku. Spokojny tryb pomija przeloty, strzelanie i bossa; zachowuje wybieranie bram. Preferencja ograniczonego ruchu skraca nowe akcje i wyłącza lot statku do portalu oraz obracanie pierścieni.

## Sterowanie

Standardowy pad: gałka/krzyżak – ruch i wybór; A – zatwierdzenie; X – podpowiedź; Start – pauza; B – powrót/pauza. Klawiatura: strzałki lub WASD, Enter/Spacja, H, P, Esc. Menu działa na padzie, klawiaturze i myszce. Dostępny ekran testowania pada z przyciskami i osiami. Gra automatycznie pauzuje po odłączeniu pada, utracie fokusu i ukryciu karty.

## Warstwa wizualna i dźwiękowa

Autorskie ilustracje wygenerowane przez ImageGen: kosmiczne tło i statek z przezroczystością. Animacje, planety, kryształy, asteroidy, robot oraz interfejs rysowane w kodzie. Paleta: nocny granat, mięta, krem i pomarańcz. Czytelne liczby, pełny ekran, responsywny układ, ograniczenie ruchu przy preferencji systemowej. Krótkie autorskie sygnały dźwiękowe generowane przez Web Audio, z wyciszeniem.

## Zapis i publikacja

Postępy zapisują się lokalnie w przeglądarce; gra nie wymaga konta ani backendu. Postępy nie synchronizują się między urządzeniami. Technologia: PixiJS 8, TypeScript i Vite. Automatyczny test, build oraz deployment na GitHub Pages po pushu do main. Repozytorium: maciejkoch/Tabliczka-mnozenia.

## Matematyczny basket

Domyślny dodatkowy tryb na bocznym boisku. Trzy odpowiedzi wiszą pod koszami rozmieszczonymi na różnych wysokościach i odległościach. Postać rzuca z lewej w prawo. Gracz reguluje kąt (25–78°) i siłę (10–100%), bez automatycznego naprowadzania. Kropki pokazują początek trajektorii.

Matter.js symuluje grawitację, tarcie, obrót i kolizje z końcami obręczy, tablicami, podłożem i granicami boiska. Krok fizyki 1/240 sekundy jest niezależny od odświeżania ekranu. Trafienie jest rozstrzygane jednokrotnie przy przejściu piłki od góry przez wnętrze obręczy. Ponowne A / Enter od razu zastępuje piłkę nowym rzutem, bez czekania na zatrzymanie.

Mecz trwa 180 sekund aktywnej gry. Zegar korzysta z faktycznego upływu czasu, także przy spadkach liczby klatek; pauza zatrzymuje czas i fizykę. Każdy dobry kosz daje +3, błędny kosz −1, pudło 0. Wynik może być ujemny. Podpowiedź nie zmienia wartości kosza. Po poprawnym koszu jest następne działanie po 0,8 sekundy, bez limitu 12 działań. Upływ czasu kończy również lecącą piłkę lub animację sukcesu; nie ma punktów po sygnale końca.

Lewa gałka celuje. Krzyżak wybiera przyciski i włącza tryb interfejsu. Y / M przełącza rzut i interfejs; B / Esc wraca do rzutu lub zamyka modal. A zatwierdza podświetlony przycisk w interfejsie albo rzuca w trybie celowania. Wszystkie menu, ustawienia, pauza, ranking i wynik są dostępne padem. Wybór przycisku ma jawne podświetlenie i przewija do elementu. Nawigacja przestrzenna zawija na krawędziach.

Po ukończonym meczu ranking w localStorage (`matematyczny-basket:ranking:v1`) otrzymuje jeden wpis z graczem, wynikiem, statystykami rzutów, trybem, zakresem i datą. Przerwanie lub restart nie zapisuje wyniku. Zachowywane są wszystkie wyniki; wyświetlane top 10 i bieżący wynik, gdy jest poza pierwszą dziesiątką. Remisy rozstrzygają liczba dobrych koszy, mniej błędnych koszy, a następnie data. Ranking jest widoczny w menu i po meczu.

Grafika wektorowa (SVG) korzysta z tych samych współrzędnych co fizyka. Trzy układy zmieniają się między działaniami. Testy sprawdzają osiągalność wszystkich koszy, punktację, granicę czasu, trwałość rankingu oraz sterowanie padem i nawigację przycisków.
