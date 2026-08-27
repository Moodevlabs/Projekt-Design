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
    // `isolate` domyka warstwy w tym komponencie. Zdjęcie i szkło leżą na
    // ujemnym `z-index`, a taki element potrafi wpaść ZA tło elementu
    // nadrzędnego. Dziś nad tym ekranem nie ma nic z tłem, ale dołożenie
    // kiedykolwiek `bg-*` gdzieś wyżej wygasiłoby fotografię bez śladu
    // w tym pliku. Własny kontekst układania sprawia, że to niemożliwe.
    <div className="relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/*
        Zdjęcie jako osobna warstwa, nie `background` na kontenerze — bo szkło
        wyżej działa przez `backdrop-filter`, a ten rozmywa to, co leży ZA
        elementem. Tło kontenera nie jest „za" jego własnym dzieckiem, więc
        przy `background` na kontenerze nie byłoby czego rozmywać.
      */}
      <img
        src={authBackground}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 size-full object-cover select-none"
      />

      {/*
        Matowe szkło na całym zdjęciu — jedna warstwa, równa na całej
        powierzchni (2026-08-27). Wartości w `.auth-backdrop`, obok szkła
        karty, żeby obie warstwy trzymały te same liczby.

        Zastąpiło gradient o zmiennym kryciu i poświaty pod napisami. Rozmycie
        robi tu robotę, której samo krycie zrobić nie umiało: zdjęcie ma ciemny
        kasetonowy sufit tuż obok jasnych paneli świetlnych i to ten skok
        jasności zjadał logotyp.
      */}
      <div aria-hidden className="auth-backdrop pointer-events-none absolute inset-0 -z-10" />

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
          Stopka leży na szkle, nie na karcie — dlatego `--ink`, a nie
          `--ink-soft` jak w reszcie aplikacji. Poświata pod literami zdjęta
          razem z tą pod logotypem: rozmyte tło nie ma już ostrej faktury,
          od której trzeba było odklejać napis.
        */}
        {footer ? (
          <div className="text-ink relative mt-5 text-center text-sm">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
