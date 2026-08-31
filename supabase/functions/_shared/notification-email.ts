/**
 * Treść powiadomień e-mail (T-116).
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
 *  * **HTML prosty jak list.** Klienty pocztowe (Outlook w szczególności) tną
 *    wszystko, co ambitniejsze; styl jest w atrybutach `style`, bo `<style>`
 *    w nagłówku bywa usuwane.
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

const BROWN = '#33251e';
const BEIGE = '#efece8';

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

function renderHtml(body: Body): string {
  const facts = body.facts
    .map(
      ([label, value]) =>
        `<tr>
           <td style="padding:4px 16px 4px 0;color:#6b5f57;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
           <td style="padding:4px 0;color:${BROWN};font-size:13px;font-weight:600;">${escapeHtml(value)}</td>
         </tr>`,
    )
    .join('');

  const quote =
    body.quote && body.quote.trim() !== ''
      ? `<div style="margin:20px 0 0;padding:14px 16px;background:${BEIGE};border-radius:10px;
                     color:${BROWN};font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(
                       body.quote,
                     )}</div>`
      : '';

  return `<!doctype html>
<html lang="pl"><body style="margin:0;padding:24px;background:${BEIGE};
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;">
    <p style="margin:0 0 18px;color:#6b5f57;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Toolier</p>
    <h1 style="margin:0 0 16px;color:${BROWN};font-size:19px;line-height:1.35;font-weight:600;">${escapeHtml(body.lead)}</h1>
    ${facts === '' ? '' : `<table role="presentation" style="border-collapse:collapse;">${facts}</table>`}
    ${quote}
    <p style="margin:22px 0 0;color:#6b5f57;font-size:13px;line-height:1.6;">${escapeHtml(body.hint)}</p>
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid ${BEIGE};color:#9a8e85;font-size:11px;line-height:1.6;">
      Wiadomość wysłana automatycznie przez Toolier. Powiadomienia wyłączysz w aplikacji:
      Ustawienia → Aplikacja → Powiadomienia e-mail.
    </p>
  </div>
</body></html>`;
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
    body.lead,
    facts === '' ? '' : `\n${facts}`,
    quote,
    `\n\n${body.hint}`,
    '\n\n—\nWiadomość wysłana automatycznie przez Toolier.',
    'Powiadomienia wyłączysz w aplikacji: Ustawienia → Aplikacja → Powiadomienia e-mail.',
  ]
    .join('')
    .trim();
}
