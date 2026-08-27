import type { ReactNode } from 'react';
/*
 * `auth-background2.jpg`, a nie `auth-background.jpg` — nazwa zmieniona
 * świadomie (2026-08-27). Podmiana samego pliku pod tą samą nazwą nie wchodzi
 * do gita bez dodatkowego kroku i zostawia w cache przeglądarki oraz w paczce
 * aplikacji stare zdjęcie. Nowa nazwa = nowy hash w buildzie i pewność, że
 * wszędzie widać to, co trzeba.
 */
import authBackground from '@/assets/auth-background2.jpg';
import { LogoLockup } from '@/assets/brand/LogoLockup';
import { pl } from '@/i18n/pl';

/**
 * Ekrany logowania nie mają sidebara — jedna karta na środku (05-UI §3).
 *
 * Tło to fotografia wnętrza, a karta jest ze SZKŁA. To nie jest powrót do
 * „liquid glass" wycofanego w T-76: tamto padło, bo rozmycie na płaskim beżu
 * nie miało czego załamać. Tutaj pod spodem leży zdjęcie z pełnym zakresem
 * tonalnym — dokładnie ten warunek, którego brakowało w powłoce.
 *
 * Zasięg jest wąski i celowy: jeden ekran oglądany kilkanaście sekund przy
 * starcie. Reszta aplikacji, w której pracuje się godzinami, zostaje płaska.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    // `isolate` domyka warstwy w tym komponencie. Zdjęcie leży na ujemnym
    // `z-index`, a taki element potrafi wpaść ZA tło elementu nadrzędnego.
    // Dziś nad tym ekranem nie ma nic z tłem, ale dołożenie kiedykolwiek
    // `bg-*` gdzieś wyżej wygasiłoby fotografię bez śladu w tym pliku.
    // Własny kontekst układania sprawia, że to niemożliwe.
    <div className="relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/*
        Zdjęcie jako osobna warstwa, nie `background` na kontenerze. Zostaje
        tak także po zdjęciu welonu: własna warstwa pozwala sterować kadrem
        (`object-cover`) niezależnie od tego, co leży wyżej, i wrócić z welonem
        bez przepisywania tła kontenera.
      */}
      <img
        src={authBackground}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 size-full object-cover select-none"
      />

      {/*
        WELON ZDJĘTY NA ŻYCZENIE WŁAŚCICIELA (2026-08-27) — fotografia idzie
        teraz na ekran bez żadnego przykrycia.

        ⚠️ CZYM BYŁ I CO ZA SOBĄ ZABRAŁ. Nad zdjęciem leżał jasny gradient
        `rgba(247,244,240, 0.66 → 0.55 → 0.62)`. Nie był ozdobą: logotyp
        i stopka leżą BEZPOŚREDNIO na fotografii (poza szklaną kartą), więc
        ich kontrast zależy teraz od tego, co akurat wypadnie za nimi. Krycie
        0,55 było policzonym dnem dla `--ink` na najciemniejszych miejscach
        kadru:

            krycie   ekran TV   ciemna podłoga
            0,50       4,46           4,76      ← poniżej progu WCAG AA
            0,55       5,07           5,38      ← bezpieczne
            0,66       6,60           6,90

        Bez welonu ten margines znika. Przy jasnym, równym kadrze wszystko się
        obroni; brąz na ciemnej podłodze albo na ekranie telewizora w tle —
        nie. Jeśli logotyp gdzieś zniknie, wracamy nie do samego welonu, tylko
        do decyzji: albo on, albo własne tło pod napisami.

        Szklana karta z formularzem ma własne wypełnienie i rozmycie, więc pola
        logowania są czytelne niezależnie od tej zmiany.
      */}

      {/*
        Pełny lockup — jedyne miejsce, gdzie stoi w całości (08-REDESIGN D-2).
        Nie ma pod nim `pl.app.name` ani `pl.app.tagline`: hasło „Tools for
        Atelier" jest już w krzywych wewnątrz logotypu, więc dopisanie go
        obok dałoby tagline dwa razy.

        Logotyp stoi POZA kolumną karty i jest od niej szerszy — dwa powody:
        1. Tagline „WEB STUDIO FOR YOUR ATELIER" jest w krzywych i ma ~5,6%
           wysokości lockupu. Przy poprzednim `h-20` wychodziło z tego 4,5 px,
           czyli nieczytelna mazia. Tutaj ma ~11 px i daje się przeczytać.
        2. Sam plik ma ~12% marginesu wbitego w `viewBox` (treść zaczyna się
           na x≈134 z 1080), więc szerokość ramki jest zawsze większa niż
           to, co widać. Rozmiar dobrany z zapasem na tę różnicę.

        Sterujemy SZEROKOŚCIĄ, nie wysokością: `w-full` pozwala logotypowi
        zwęzić się w wąskim oknie, zamiast wystawać poza ekran.
      */}
      <LogoLockup
        title={`${pl.app.name} — ${pl.app.tagline}`}
        className="text-brown relative mb-10 w-full max-w-[460px]"
      />

      <div className="relative w-full max-w-[380px]">
        <div className="auth-glass rounded-[var(--radius-card)] p-7">
          <h1 className="font-display text-ink text-[19px]">{title}</h1>
          {description ? <p className="text-ink-soft mt-1.5 text-sm">{description}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {/*
          Stopka leży bezpośrednio na FOTOGRAFII, nie na karcie — dlatego
          `--ink`, a nie `--ink-soft` jak w reszcie aplikacji, i dlatego biała
          poświata pod literami. Po zdjęciu welonu (2026-08-27) obie te rzeczy
          są jedyną obroną tego napisu: `--ink-soft` dawał tu poniżej 3:1 już
          przy welonie, a bez niego jest gorzej. Poświata odkleja litery od
          faktury zdjęcia — nie usuwaj jej razem z welonem.
        */}
        {footer ? (
          <div className="text-ink relative mt-5 text-center text-sm [text-shadow:0_1px_2px_rgba(255,255,255,0.8)]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
