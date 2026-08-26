import type { ReactNode } from 'react';
import authBackground from '@/assets/auth-background.jpg';
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
    // `isolate` domyka warstwy w tym komponencie. Zdjęcie i welon leżą na
    // ujemnym `z-index`, a taki element potrafi wpaść ZA tło elementu
    // nadrzędnego. Dziś nad tym ekranem nie ma nic z tłem, ale dołożenie
    // kiedykolwiek `bg-*` gdzieś wyżej wygasiłoby fotografię bez śladu
    // w tym pliku. Własny kontekst układania sprawia, że to niemożliwe.
    <div className="relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/*
        Zdjęcie jako osobna warstwa, nie `background` na kontenerze: dzięki
        temu welon wyżej może mieć własne krycie, bez mieszania go w gradient
        z obrazem.
      */}
      <img
        src={authBackground}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 size-full object-cover select-none"
      />

      {/*
        Ciepły welon nad zdjęciem. Nie jest ozdobą — jest gwarancją czytelności.

        Logotyp leży BEZPOŚREDNIO na fotografii (poza szklaną kartą), więc jego
        kontrast zależy od tego, co akurat wypadnie za nim: przy innym kadrze,
        innym rozmiarze okna albo podmianie zdjęcia brąz mógłby trafić na ciemną
        podłogę i zniknąć. Welon podnosi i ujednolica jasność całego tła, więc
        czytelność przestaje być kwestią szczęścia.

        Welon jest JASNY na całej wysokości, także u dołu. Kusiło, żeby
        przyciemnić dolną krawędź „dla głębi", ale karta jest wyśrodkowana
        w pionie, więc stopka pod nią ląduje mniej więcej w połowie ekranu —
        ciemny dół nic by jej nie dał, a przy niskim oknie wpadłaby na granicę
        dwóch jasności i przestała być czytelna przy jednym kolorze tekstu.
        Jednolicie jasne tło znaczy, że KAŻDY napis może być ciemny i zawsze
        się obroni, niezależnie od kadru i rozmiaru okna.

        Środek jest najbardziej przezroczysty — tam wnętrze widać najlepiej,
        i tam też stoi szklana karta, która ma co rozmywać.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(247,244,240,0.80) 0%, rgba(247,244,240,0.58) 55%, rgba(247,244,240,0.74) 100%)',
        }}
      />

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
          Stopka leży bezpośrednio na welonie, nie na karcie — dlatego `--ink`,
          a nie `--ink-soft` jak w reszcie aplikacji. Przeliczone: nad ciemnym
          fragmentem zdjęcia welon schodzi do ~0,53 luminancji, na czym
          `--ink-soft` daje ~2,9:1, czyli poniżej progu. `--ink` trzyma tam
          ponad 8:1. Biała poświata odkleja litery od faktury zdjęcia.
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
