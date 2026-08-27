import type { BriefTemplate } from './schema';

/**
 * Wbudowany brief projektanta wnętrz (T-93, poprawka 9).
 *
 * ## Skąd te pytania
 *
 * Z praktyki zawodu. Pięć bloków, zawsze w tej kolejności — obiekt, ludzie,
 * zakres, estetyka, budżet i termin. Kolejność nie jest przypadkowa: klient
 * odpowiada najłatwiej na fakty (metraż, adres), a najtrudniej na budżet.
 * Zaczęcie od pieniędzy kończy się zamkniętą kartą.
 *
 * ## Czego tu świadomie NIE MA
 *
 *  - **Pytań o kolor ścian w konkretnym pokoju.** To ustalenia z etapu
 *    koncepcji, nie z briefu. Brief ma dać obraz całości.
 *  - **Wymagalności prawie wszędzie.** Brief wypełnia się wieczorem, na
 *    telefonie, na raty; formularz, który nie pozwala zapisać połowy, zostaje
 *    niewypełniony w całości. Wymagane są dwa pytania: co projektujemy
 *    i metraż — bez nich nie ma czego wyceniać.
 *  - **Pól na pliki.** Inspiracje przychodzą linkiem do Pinteresta, a nie
 *    uploadem — i tak trafiają potem do teczki jako pliki projektu.
 *
 * Zestaw jest **snapshotowany** przy wystawieniu linku (`client_briefs.template`),
 * więc zmiana tego pliku nie rusza briefów już wysłanych.
 */
export const DEFAULT_BRIEF_TEMPLATE: BriefTemplate = [
  {
    id: 'obiekt',
    title: 'Obiekt',
    hint: 'Przedmiot opracowania projektowego i jego stan techniczny.',
    questions: [
      {
        id: 'obiekt.rodzaj',
        label: 'Przedmiot opracowania',
        kind: 'choice',
        hint: '',
        placeholder: '',
        options: [
          'Mieszkanie',
          'Dom',
          'Apartament',
          'Lokal usługowy',
          'Biuro',
          'Pojedyncze pomieszczenie',
        ],
        required: true,
      },
      {
        id: 'obiekt.adres',
        label: 'Adres inwestycji',
        kind: 'text',
        hint: 'Niezbędny do przeprowadzenia wizji lokalnej oraz przygotowania dokumentacji.',
        placeholder: 'ul. Wiosenna 12/3, Poznań',
        options: [],
        required: false,
      },
      {
        id: 'obiekt.metraz',
        label: 'Metraż (m²)',
        kind: 'number',
        hint: 'Powierzchnia objęta projektem, nie całego budynku.',
        placeholder: '64',
        options: [],
        required: true,
      },
      {
        id: 'obiekt.pomieszczenia',
        label: 'Pomieszczenia objęte zakresem opracowania',
        kind: 'longtext',
        hint: 'Prosimy wymienić po przecinku — lista stanowi podstawę wyceny.',
        placeholder: 'salon z aneksem, sypialnia, pokój dziecka, łazienka, przedpokój',
        options: [],
        required: false,
      },
      {
        id: 'obiekt.stan',
        label: 'Stan obecny',
        kind: 'choice',
        hint: '',
        placeholder: '',
        options: [
          'Stan deweloperski',
          'Do generalnego remontu',
          'Do odświeżenia',
          'Zamieszkane, zmiana częściowa',
          'Budynek w trakcie budowy',
        ],
        required: false,
      },
      {
        id: 'obiekt.ograniczenia',
        label: 'Znane ograniczenia techniczne',
        kind: 'longtext',
        hint: 'Ściany nośne, piony instalacyjne, wysokość pomieszczeń, zawilgocenia, ochrona konserwatorska, wymogi wspólnoty.',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
  {
    id: 'ludzie',
    title: 'Użytkownicy wnętrza',
    hint: 'Ta część decyduje o układzie funkcjonalnym w stopniu większym niż sam metraż.',
    questions: [
      {
        id: 'ludzie.domownicy',
        label: 'Kto będzie korzystał z wnętrza?',
        kind: 'longtext',
        hint: 'Liczba osób i ich wiek. Prosimy uwzględnić również zwierzęta domowe.',
        placeholder: 'para 30+, dziecko 4 lata, pies (labrador)',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.rytm',
        label: 'Jak przebiega typowy dzień domowników?',
        kind: 'longtext',
        hint: 'Osoby przygotowujące posiłki, praca zdalna, pory dnia, miejsce spożywania posiłków.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.goscie',
        label: 'Jak często i w jakiej liczbie przyjmowani są goście?',
        kind: 'text',
        hint: 'Informacja decydująca o doborze stołu, siedzisk i dodatkowego miejsca do spania.',
        placeholder: 'raz w miesiącu, 4–6 osób',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.przechowywanie',
        label: 'Co wymaga zaplanowania miejsca do przechowywania?',
        kind: 'longtext',
        hint: 'Przedmioty występujące w większej ilości: książki, sprzęt sportowy, narzędzia, odzież.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.bolaczki',
        label: 'Jakie niedogodności obecnego wnętrza są najbardziej uciążliwe?',
        kind: 'longtext',
        hint: 'Odpowiedź o kluczowym znaczeniu — wskazuje, co w projekcie wymaga zmiany.',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
  {
    id: 'zakres',
    title: 'Zakres prac',
    hint: 'Elementy objęte opracowaniem oraz pozostające bez zmian.',
    questions: [
      {
        id: 'zakres.oczekiwania',
        label: 'Jaki jest oczekiwany zakres opracowania?',
        kind: 'multi',
        hint: 'Prosimy zaznaczyć wszystkie interesujące pozycje.',
        placeholder: '',
        options: [
          'Układ funkcjonalny',
          'Wizualizacje 3D',
          'Rysunki wykonawcze',
          'Dobór materiałów i wykończeń',
          'Dobór mebli i oświetlenia',
          'Projekt mebli na wymiar',
          'Nadzór autorski',
          'Wsparcie w zakupach',
        ],
        required: false,
      },
      {
        id: 'zakres.zostaje',
        label: 'Elementy pozostające bez zmian',
        kind: 'longtext',
        hint: 'Meble, urządzenia, stolarka okienna, posadzki — elementy wyłączone z zakresu prac.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'zakres.wykonawca',
        label: 'Czy wykonawca robót został już wybrany?',
        kind: 'choice',
        hint: '',
        placeholder: '',
        options: ['Tak, wykonawca wybrany', 'Nie, trwa poszukiwanie', 'Prosimy o rekomendację'],
        required: false,
      },
    ],
  },
  {
    id: 'estetyka',
    title: 'Estetyka',
    hint: 'Kierunek stylistyczny. Decyzje szczegółowe zapadają na etapie koncepcji.',
    questions: [
      {
        id: 'estetyka.styl',
        label: 'Preferowana stylistyka wnętrza',
        kind: 'multi',
        hint: 'Możliwy jest wybór kilku pozycji — połączenie stylów również stanowi odpowiedź.',
        placeholder: '',
        options: [
          'Nowoczesny minimalizm',
          'Klasyczny',
          'Skandynawski',
          'Industrialny',
          'Japandi',
          'Boho',
          'Rustykalny',
          'Nie wiem, liczę na propozycje',
        ],
        required: false,
      },
      {
        id: 'estetyka.kolory',
        label: 'Preferowana kolorystyka',
        kind: 'text',
        hint: '',
        placeholder: 'ciepłe beże, drewno, zieleń',
        options: [],
        required: false,
      },
      {
        id: 'estetyka.nie',
        label: 'Rozwiązania wykluczone',
        kind: 'longtext',
        hint: 'Informacja równie istotna jak preferencje — pozwala uniknąć zbędnej rundy poprawek.',
        placeholder: 'białe fronty na wysoki połysk, zimne światło',
        options: [],
        required: false,
      },
      {
        id: 'estetyka.inspiracje',
        label: 'Materiały inspiracyjne',
        kind: 'longtext',
        hint: 'Prosimy o wklejenie adresów: Pinterest, Instagram, publikacje branżowe.',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
  {
    id: 'warunki',
    title: 'Budżet i termin',
    hint: 'Dwa parametry warunkujące realność pozostałych założeń.',
    questions: [
      {
        id: 'warunki.budzet',
        label: 'Budżet realizacji (bez kosztów projektu)',
        kind: 'text',
        hint: 'Wystarczy podanie widełek. Wartość ta określa standard materiałów, nie jakość opracowania projektowego.',
        placeholder: '120 000 – 150 000 zł',
        options: [],
        required: false,
      },
      {
        id: 'warunki.start',
        label: 'Planowany termin rozpoczęcia prac',
        kind: 'text',
        hint: '',
        placeholder: 'wrzesień 2026',
        options: [],
        required: false,
      },
      {
        id: 'warunki.termin',
        label: 'Terminy nieprzekraczalne',
        kind: 'longtext',
        hint: 'Przykładowo: planowana przeprowadzka, zakończenie umowy najmu, inne zdarzenia losowe.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'warunki.uwagi',
        label: 'Dodatkowe informacje istotne dla opracowania',
        kind: 'longtext',
        hint: '',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
];
