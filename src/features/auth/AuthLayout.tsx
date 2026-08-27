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
    // `isolate` domyka warstwy w tym komponencie. Zdjęcie i welon leżą na
    // ujemnym `z-index`, a taki element potrafi wpaść ZA tło elementu
    // nadrzędnego. Dziś nad tym ekranem nie ma nic z tłem, ale dołożenie
    // kiedykolwiek `bg-*` gdzieś wyżej wygasiłoby fotografię bez śladu
    // w tym pliku. Własny kontekst układania sprawia, że to niemożliwe.
    <div className="relative isolate flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/*
        Zdjęcie jako osobna warstwa, nie `background` na kontenerze: dzięki
        temu welon wyżej ma własne krycie i własny gradient, bez mieszania go
        w tło razem z obrazem.
      */}
      <img
        src={authBackground}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 size-full object-cover select-none"
      />

      {/*
        Welon nad zdjęciem — wrócił 2026-08-27, po tym jak logotyp zginął na
        gołej fotografii. Nie jest ozdobą: logotyp i stopka leżą BEZPOŚREDNIO
        na zdjęciu (poza szklaną kartą), więc ich kontrast zależy od tego, co
        akurat wypadnie za nimi.

        ## Dlaczego nierówny, a nie jedno krycie na całość

        Nowe zdjęcie (`auth-background2.jpg`) ma **ciemny kasetonowy sufit
        w górnej części** i jasną drewnianą podłogę na dole. To najgorszy
        możliwy układ dla tego ekranu, bo blok logo + karta + stopka jest
        wyśrodkowany w pionie: logotyp — brązowy — ląduje mniej więcej tam,
        gdzie sufit jest najciemniejszy, a stopka na jasnej podłodze, gdzie
        pomocy nie potrzebuje wcale.

        Stąd gradient robi dokładnie odwrotnie niż poprzedni (0,66 → 0,55 →
        0,62, czyli prawie równy): **kryje tam, gdzie ciemno, i schodzi z drogi
        tam, gdzie jasno.** Dół spada do 0,30 — o połowę mniej niż wcześniej —
        więc wnętrza widać znacznie więcej mimo że logotyp jest bezpieczniejszy.

        ## Dlaczego wolno tu zejść niżej niż kiedyś

        Poprzednia wersja pilnowała progu 0,55 na CAŁEJ wysokości, bo napisy
        nie miały żadnej własnej obrony. Teraz logotyp ma białą poświatę
        (`drop-shadow` niżej), a stopka miała ją od początku — obie odklejają
        litery od faktury zdjęcia i robią robotę, której wcześniej musiało
        pilnować samo krycie.

        ⚠️ Gdyby logotyp gdzieś jeszcze znikał: podnoś **górny** stop, nie całość.
        Podniesienie dolnego nic mu nie da, a zabierze widok wnętrza.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(247,244,240,0.60) 0%, rgba(247,244,240,0.52) 45%, rgba(247,244,240,0.34) 80%, rgba(247,244,240,0.30) 100%)',
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
      {/*
        Biała poświata pod logotypem (2026-08-27) — ta sama sztuczka, co pod
        stopką, tylko `drop-shadow` zamiast `text-shadow`, bo to SVG, a nie
        tekst. `text-shadow` nie działa na kształty w krzywych.

        Dzięki niej brąz nie zlewa się z ciemnym sufitem nawet tam, gdzie welon
        jest najcieńszy, i to ona pozwoliła zejść z kryciem welonu poniżej
        dawnego progu 0,55. Rozmycie 3 px: tyle wystarczy, żeby odkleić litery
        od faktury zdjęcia, a mało, żeby nie zrobić wokół logotypu widocznej
        białej obwódki.
      */}
      <LogoLockup
        title={`${pl.app.name} — ${pl.app.tagline}`}
        className="text-brown relative mb-10 w-full max-w-[460px] [filter:drop-shadow(0_1px_3px_rgba(255,255,255,0.75))]"
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
          poświata pod literami. `--ink-soft` dawał tu poniżej 3:1 nawet przy
          grubym welonie.

          Od 2026-08-27 welon na dole schodzi do 0,30, więc poświata jest tu
          jeszcze ważniejsza niż była — nie usuwaj jej, dobierając krycie
          welonu.
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
