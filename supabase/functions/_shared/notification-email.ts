/**
 * Treść powiadomień e-mail (T-116, oprawa graficzna T-117).
 *
 * ## Zasady, według których to jest napisane
 *
 *  * **Temat mówi wszystko.** Projektant czyta go na telefonie, w powiadomieniu
 *    z ekranu blokady. „Oferta DOK/2026/08/3 zaakceptowana — Jan Kowalski"
 *    załatwia sprawę bez otwierania wiadomości; „Powiadomienie z Toolier" nie
 *    załatwia niczego.
 *  * **Treść uwagi w całości.** To jedyne zdarzenie, przy którym „coś się
 *    wydarzyło" nie wystarcza: żeby ocenić, czy odpisać dziś, czy w poniedziałek,
 *    trzeba wiedzieć, co klient napisał.
 *  * **Bez linku do oferty.** Adres z tokenem jest jedynym sekretem całego
 *    mechanizmu udostępniania i nie ma powodu, żeby dodatkowo krążył w poczcie.
 *    Wycena jest w aplikacji, pod swoim numerem.
 *
 * ## Dlaczego układ stoi na tabelach, a nie na `flex`
 *
 * Bo to jest poczta, a nie strona. Outlook na Windows renderuje HTML silnikiem
 * Worda: nie zna `flex`, `grid` ani `border-radius`, a `<style>` w nagłówku
 * bywa wycinane razem z całą sekcją `<head>` (robi to m.in. Gmail w widoku
 * webowym). Stąd tabele, atrybuty `width` i **styl wpisany w każdy element
 * osobno**. To nie jest zaniedbanie — to jedyny układ, który wygląda tak samo
 * w Gmailu, Outlooku i na iPhonie.
 *
 * ⚠️ Wszystko, co pochodzi od klienta końcowego (imię, treść uwagi, powód
 *    odmowy), przechodzi przez `escapeHtml`. Bez tego uwaga z `<img onerror>`
 *    byłaby wstrzyknięciem HTML-a do skrzynki projektanta.
 */

export type NotificationKind = 'viewed' | 'accepted' | 'rejected' | 'comment' | 'brief';

export interface NotificationRow {
  id: string;
  kind: string;
  recipient: string;
  payload: Record<string, unknown>;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/* -------------------------------------------------------------------------
 * Marka
 * ---------------------------------------------------------------------- */

const BROWN = '#33251e';
const BEIGE = '#efece8';
const INK_SOFT = '#6b5f57';
const INK_FAINT = '#9a8e85';
const HAIRLINE = '#e6e1db';

const SITE_URL = 'https://toolier.pl';

/**
 * Logotyp w nagłówku.
 *
 * **PNG, nie SVG i nie `data:`** — i to nie jest wybór estetyczny. Gmail
 * i Outlook nie renderują SVG w wiadomościach, a obrazków osadzonych jako
 * `data:` nie pokazuje żaden z nich. Zostaje plik pod publicznym adresem;
 * leży w `public/` aplikacji, więc serwuje go ta sama domena co stronę oferty.
 *
 * Adres da się nadpisać `NOTIFY_LOGO_URL` — na wypadek własnej domeny albo
 * podmiany znaku bez wdrażania funkcji. Pusta wartość **wyłącza obrazek**
 * i zostawia sam napis, co jest właściwym zachowaniem, gdy plik nie jest
 * jeszcze wdrożony: lepszy czysty nagłówek tekstowy niż ikona zepsutego
 * obrazka w każdej wiadomości.
 */
function logoUrl(): string {
  const configured = Deno.env.get('NOTIFY_LOGO_URL');
  if (configured !== undefined) return configured.trim();
  return 'https://klient.toolier.pl/logo-toolier-mail.png';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function str(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

function num(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** „DOK/2026/08/3" albo — gdy wycena numeru jeszcze nie ma — jej tytuł. */
function quoteLabel(payload: Record<string, unknown>): string {
  const number = str(payload, 'quoteNumber');
  if (number !== '') return number;
  const title = str(payload, 'quoteTitle');
  return title === '' ? 'wycena bez numeru' : title;
}

/** „ — Jan Kowalski" albo pusto. Domyka temat, nie zaczyna go. */
function clientSuffix(payload: Record<string, unknown>): string {
  const client = str(payload, 'clientName');
  return client === '' ? '' : ` — ${client}`;
}

interface Body {
  subject: string;
  /** Zdanie otwierające — to samo w HTML i w tekście. */
  lead: string;
  /** Pary „etykieta: wartość" pod zdaniem otwierającym. */
  facts: [string, string][];
  /** Cytat: treść uwagi albo powód odmowy. */
  quote?: string;
  /** Co z tym zrobić. */
  hint: string;
}

function bodyFor(kind: string, payload: Record<string, unknown>): Body {
  const label = quoteLabel(payload);
  const client = str(payload, 'clientName');
  const signer = str(payload, 'signerName');
  const author = str(payload, 'authorName');

  switch (kind) {
    case 'viewed':
      return {
        subject: `Klient otworzył ofertę ${label}${clientSuffix(payload)}`,
        lead: 'Oferta została otwarta po raz pierwszy.',
        facts: [
          ['Wycena', label],
          ['Klient', client || 'nieprzypisany'],
        ],
        hint: 'To powiadomienie przychodzi raz — przy pierwszym otwarciu linku. O decyzji dowiesz się osobną wiadomością.',
      };

    case 'accepted': {
      const count = num(payload, 'itemCount');
      return {
        subject: `Oferta ${label} zaakceptowana${signer === '' ? '' : ` — ${signer}`}`,
        lead: 'Klient przyjął ofertę.',
        facts: [
          ['Wycena', label],
          ['Klient', client || 'nieprzypisany'],
          ['Podpisano jako', signer || 'bez podpisu'],
          ...(count === null
            ? []
            : ([['Pozycje w przyjętym zakresie', String(count)]] as [string, string][])),
        ],
        hint: 'Zakres, który klient wybrał, widać w Toolier na karcie wyceny — razem z listą pozycji, które wyłączył.',
      };
    }

    case 'rejected':
      return {
        subject: `Oferta ${label} odrzucona${signer === '' ? '' : ` — ${signer}`}`,
        lead: 'Klient nie przyjął oferty.',
        facts: [
          ['Wycena', label],
          ['Klient', client || 'nieprzypisany'],
          ['Odpowiedział', signer || 'bez podpisu'],
        ],
        quote: str(payload, 'reason'),
        hint: 'Wycena ma teraz status „odrzucona". Nową propozycję najprościej zrobić jako kolejną wersję tej samej oferty.',
      };

    case 'comment':
      return {
        subject: `Uwagi do oferty ${label}${author === '' ? '' : ` — ${author}`}`,
        lead: 'Klient zostawił uwagi zamiast decyzji.',
        facts: [
          ['Wycena', label],
          ['Klient', client || 'nieprzypisany'],
          ['Napisał(a)', author || 'bez podpisu'],
        ],
        quote: str(payload, 'message'),
        hint: 'Uwagi czekają w Toolier przy wycenie — link do oferty nadal działa, więc po poprawkach nie trzeba wysyłać nowego.',
      };

    case 'brief':
      return {
        subject: `Klient odesłał brief${clientSuffix(payload)}`,
        lead: 'Wypełniony brief czeka w kartotece klienta.',
        facts: [['Klient', client || 'nieprzypisany']],
        hint: 'Odpowiedzi znajdziesz w Toolier na karcie klienta, w zakładce Brief.',
      };

    default:
      return {
        subject: 'Powiadomienie z Toolier',
        lead: 'Coś wydarzyło się po stronie klienta.',
        facts: [],
        hint: 'Szczegóły znajdziesz w aplikacji.',
      };
  }
}

export function renderNotification(row: NotificationRow): RenderedEmail {
  const body = bodyFor(row.kind, row.payload ?? {});
  return { subject: body.subject, html: renderHtml(body), text: renderText(body) };
}

/** Testowa wiadomość z ustawień — sprawdza całą drogę, nie samą konfigurację. */
export function renderTestEmail(): RenderedEmail {
  const body: Body = {
    subject: 'Toolier — testowe powiadomienie',
    lead: 'Powiadomienia e-mail działają.',
    facts: [['Rodzaj', 'wiadomość testowa']],
    hint: 'Prawdziwe powiadomienia przychodzą wtedy, gdy klient otworzy link z ofertą, zaakceptuje ją, odrzuci, zostawi uwagi albo odeśle brief.',
  };
  return { subject: body.subject, html: renderHtml(body), text: renderText(body) };
}

/* -------------------------------------------------------------------------
 * HTML
 * ---------------------------------------------------------------------- */

/**
 * Nagłówek ze znakiem marki.
 *
 * `width` i `height` są podane **atrybutami, nie tylko stylem**: Outlook
 * ignoruje wymiary z CSS i bez atrybutów rysuje obrazek w pełnej rozdzielczości
 * pliku. Plik ma 420 px szerokości, a pokazujemy go w 132 px — dwukrotny zapas
 * jest po to, żeby znak nie był rozmyty na ekranach o wysokiej gęstości.
 *
 * `alt="Toolier"` to nie formalność: obrazki w poczcie bywają domyślnie
 * zablokowane, więc w wielu skrzynkach to jest JEDYNA rzecz, którą odbiorca
 * zobaczy w tym miejscu.
 */
function header(): string {
  const url = logoUrl();

  if (url === '') {
    return `<span style="display:inline-block;font-family:Georgia,'Times New Roman',serif;
                          font-size:22px;letter-spacing:.14em;color:${BROWN};">TOOLIER</span>`;
  }

  return `<img src="${escapeHtml(url)}" alt="Toolier" width="132" height="38"
               style="display:block;width:132px;height:auto;border:0;outline:none;text-decoration:none;">`;
}

function renderHtml(body: Body): string {
  const facts = body.facts
    .map(
      ([label, value]) =>
        `<tr>
           <td style="padding:5px 18px 5px 0;color:${INK_SOFT};font-size:13px;line-height:1.5;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
           <td style="padding:5px 0;color:${BROWN};font-size:13px;line-height:1.5;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
         </tr>`,
    )
    .join('');

  const quote =
    body.quote && body.quote.trim() !== ''
      ? `<tr><td style="padding:20px 0 0;">
           <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
             <tr>
               <td style="background:${BEIGE};border-left:3px solid ${BROWN};border-radius:0 8px 8px 0;
                          padding:14px 18px;color:${BROWN};font-size:14px;line-height:1.6;">${escapeHtml(body.quote).replaceAll('\n', '<br>')}</td>
             </tr>
           </table>
         </td></tr>`
      : '';

  /*
   * Tekst podglądu — to, co skrzynka pokazuje obok tematu, zanim wiadomość
   * zostanie otwarta. Bez niego Gmail wypełnia to miejsce pierwszym tekstem
   * z treści, czyli stopką albo słowem „Toolier". Ukrywamy go kombinacją,
   * którą rozumieją wszystkie klienty naraz.
   */
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;
                                  mso-hide:all;font-size:1px;line-height:1px;color:${BEIGE};">
    ${escapeHtml(body.lead)}
  </div>`;

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(body.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BEIGE};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${BEIGE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
               style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${HAIRLINE};
                      border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

          <!-- nagłówek -->
          <tr>
            <td style="padding:28px 32px 0;">
              ${header()}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid ${HAIRLINE};font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- treść -->
          <tr>
            <td style="padding:22px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color:${BROWN};font-size:19px;line-height:1.4;font-weight:600;padding-bottom:16px;">
                    ${escapeHtml(body.lead)}
                  </td>
                </tr>
                ${
                  facts === ''
                    ? ''
                    : `<tr><td>
                         <table role="presentation" cellpadding="0" cellspacing="0" border="0">${facts}</table>
                       </td></tr>`
                }
                ${quote}
                <tr>
                  <td style="padding:22px 0 0;color:${INK_SOFT};font-size:13px;line-height:1.65;">
                    ${escapeHtml(body.hint)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- stopka -->
          <tr>
            <td style="padding:26px 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid ${HAIRLINE};font-size:0;line-height:0;padding-bottom:16px;">&nbsp;</td></tr>
                <tr>
                  <td style="color:${INK_SOFT};font-size:12px;line-height:1.6;">
                    <strong style="color:${BROWN};">Toolier</strong> — workspace pracowni projektowania wnętrz.<br>
                    <a href="${SITE_URL}" style="color:${INK_SOFT};text-decoration:underline;">toolier.pl</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;color:${INK_FAINT};font-size:11px;line-height:1.6;">
                    Otrzymujesz tę wiadomość, ponieważ jesteś właścicielem konta w Toolier,
                    a Twój klient wykonał działanie pod przekazanym linkiem.
                    Powiadomienia wyłączysz w aplikacji: Ustawienia → Aplikacja → Powiadomienia e-mail.
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:10px;color:${INK_FAINT};font-size:11px;line-height:1.6;">
                    Developed by AnzorgeDesign &amp; Moodevlabs
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Wersja tekstowa nie jest formalnością: filtry antyspamowe traktują maile
 * wyłącznie HTML-owe gorzej, a powiadomienie, które wpada do spamu, jest
 * dokładnie tak samo bezużyteczne jak niewysłane.
 */
function renderText(body: Body): string {
  const facts = body.facts.map(([label, value]) => `${label}: ${value}`).join('\n');
  const quote = body.quote && body.quote.trim() !== '' ? `\n\n„${body.quote}"` : '';

  return [
    'TOOLIER',
    `\n\n${body.lead}`,
    facts === '' ? '' : `\n\n${facts}`,
    quote,
    `\n\n${body.hint}`,
    '\n\n—\nToolier — workspace pracowni projektowania wnętrz.',
    `\n${SITE_URL}`,
    '\n\nOtrzymujesz tę wiadomość, ponieważ jesteś właścicielem konta w Toolier,',
    '\na Twój klient wykonał działanie pod przekazanym linkiem.',
    '\nPowiadomienia wyłączysz w aplikacji: Ustawienia → Aplikacja → Powiadomienia e-mail.',
  ]
    .join('')
    .trim();
}
