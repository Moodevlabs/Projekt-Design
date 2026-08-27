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
    hint: 'Co projektujemy i w jakim jest stanie.',
    questions: [
      {
        id: 'obiekt.rodzaj',
        label: 'Co projektujemy?',
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
        hint: 'Potrzebny do wizji lokalnej i do dokumentów.',
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
        label: 'Jakie pomieszczenia wchodzą w zakres?',
        kind: 'longtext',
        hint: 'Wypisz je po przecinku — z tej listy powstaje wycena.',
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
        label: 'Ograniczenia techniczne, o których wiesz',
        kind: 'longtext',
        hint: 'Ściany nośne, piony, niskie sufity, wilgoć, zabytek, wspólnota.',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
  {
    id: 'ludzie',
    title: 'Kto tu będzie mieszkał',
    hint: 'Ta część decyduje o układzie funkcjonalnym — więcej niż metraż.',
    questions: [
      {
        id: 'ludzie.domownicy',
        label: 'Kto będzie korzystał z wnętrza?',
        kind: 'longtext',
        hint: 'Ile osób, w jakim wieku. Zwierzęta też się liczą — mają swoje potrzeby.',
        placeholder: 'para 30+, dziecko 4 lata, pies (labrador)',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.rytm',
        label: 'Jak wygląda Wasz zwykły dzień w domu?',
        kind: 'longtext',
        hint: 'Kto gotuje, kto pracuje zdalnie, o której wstajecie, gdzie jecie.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.goscie',
        label: 'Jak często przyjmujecie gości i ilu?',
        kind: 'text',
        hint: 'Decyduje o stole, siedziskach i miejscu do spania.',
        placeholder: 'raz w miesiącu, 4–6 osób',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.przechowywanie',
        label: 'Co trzeba pomieścić?',
        kind: 'longtext',
        hint: 'Rzeczy, których jest dużo: książki, sprzęt sportowy, narzędzia, ubrania.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'ludzie.bolaczki',
        label: 'Co najbardziej przeszkadza Wam w obecnym mieszkaniu?',
        kind: 'longtext',
        hint: 'Najcenniejsze pytanie w całym briefie — odpowiedź mówi, co ma się zmienić.',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
  {
    id: 'zakres',
    title: 'Zakres prac',
    hint: 'Co ma być zrobione, a co zostaje.',
    questions: [
      {
        id: 'zakres.oczekiwania',
        label: 'Czego oczekujecie od projektu?',
        kind: 'multi',
        hint: 'Zaznacz wszystko, co Was interesuje.',
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
        label: 'Co zostaje bez zmian?',
        kind: 'longtext',
        hint: 'Meble, sprzęt, okna, podłogi — rzeczy, których nie ruszamy.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'zakres.wykonawca',
        label: 'Macie już ekipę wykonawczą?',
        kind: 'choice',
        hint: '',
        placeholder: '',
        options: ['Tak, mamy', 'Nie, szukamy', 'Prosimy o polecenie'],
        required: false,
      },
    ],
  },
  {
    id: 'estetyka',
    title: 'Estetyka',
    hint: 'Kierunek, nie decyzje — te zapadną na etapie koncepcji.',
    questions: [
      {
        id: 'estetyka.styl',
        label: 'Bliski Wam styl',
        kind: 'multi',
        hint: 'Można zaznaczyć kilka — mieszanka też jest odpowiedzią.',
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
        label: 'Kolory, które lubicie',
        kind: 'text',
        hint: '',
        placeholder: 'ciepłe beże, drewno, zieleń',
        options: [],
        required: false,
      },
      {
        id: 'estetyka.nie',
        label: 'Czego zdecydowanie nie chcecie?',
        kind: 'longtext',
        hint: 'Równie ważne jak to, co się podoba. Oszczędza rundę poprawek.',
        placeholder: 'białe fronty na wysoki połysk, zimne światło',
        options: [],
        required: false,
      },
      {
        id: 'estetyka.inspiracje',
        label: 'Linki do inspiracji',
        kind: 'longtext',
        hint: 'Pinterest, Instagram, zdjęcia z internetu — wklej adresy.',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
  {
    id: 'warunki',
    title: 'Budżet i termin',
    hint: 'Dwie liczby, bez których reszta jest życzeniem.',
    questions: [
      {
        id: 'warunki.budzet',
        label: 'Budżet na realizację (bez projektu)',
        kind: 'text',
        hint: 'Widełki wystarczą. Od tej liczby zależy standard materiałów, nie jakość projektu.',
        placeholder: '120 000 – 150 000 zł',
        options: [],
        required: false,
      },
      {
        id: 'warunki.start',
        label: 'Kiedy chcecie zacząć?',
        kind: 'text',
        hint: '',
        placeholder: 'wrzesień 2026',
        options: [],
        required: false,
      },
      {
        id: 'warunki.termin',
        label: 'Czy jest termin, którego nie da się przesunąć?',
        kind: 'longtext',
        hint: 'Przeprowadzka, koniec najmu, narodziny dziecka, wesele.',
        placeholder: '',
        options: [],
        required: false,
      },
      {
        id: 'warunki.uwagi',
        label: 'Cokolwiek jeszcze, co powinniśmy wiedzieć',
        kind: 'longtext',
        hint: '',
        placeholder: '',
        options: [],
        required: false,
      },
    ],
  },
];
