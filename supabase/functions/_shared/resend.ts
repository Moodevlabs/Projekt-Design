/**
 * Wysyłka maila przez Resend (T-116).
 *
 * ## Dlaczego jednak Resend, skoro T-20 go odrzucił
 *
 * T-20 chciał wysyłać przez Resend **ofertę do inwestora** — i to było złe:
 * mail z obcej domeny zamiast z poczty projektanta, załącznik zamiast
 * klikalnej wyceny, my jako procesor cudzych adresów. Tutaj kierunek jest
 * odwrotny: piszemy do **właściciela konta**, na jego własny adres, o tym, co
 * dzieje się z jego ofertą. Adresat jest jeden, jest naszym użytkownikiem
 * i sam sobie to włączył — żaden z tamtych zarzutów nie ma tu zastosowania.
 *
 * ## Bez SDK
 *
 * `fetch` na jeden endpoint. SDK Resenda dołożyłoby zależność i warstwę
 * abstrakcji nad jednym żądaniem POST, którego kształt i tak trzeba znać,
 * czytając odpowiedzi błędów.
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Adres, pod który trafi odpowiedź. Ustawiamy go na adresata: powiadomienie
   * przychodzi z domeny Toolier, a „Odpowiedz" nie ma prawa prowadzić do
   * skrzynki, której nikt nie czyta.
   */
  replyTo?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/** Nadawca. Musi być adresem z domeny zweryfikowanej w Resendzie. */
export function resendFrom(): string {
  return Deno.env.get('RESEND_FROM') ?? 'Toolier <powiadomienia@toolier.pl>';
}

export function resendConfigured(): boolean {
  return Boolean(Deno.env.get('RESEND_API_KEY'));
}

export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'Brak RESEND_API_KEY w sekretach funkcji.' };

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom(),
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
    });
  } catch (error) {
    // Sieć padła — wiersz wraca do kolejki i spróbujemy jeszcze raz.
    return { ok: false, error: error instanceof Error ? error.message : 'Błąd sieci.' };
  }

  const raw = await response.text();
  if (!response.ok) {
    // Treść błędu Resenda bywa jedynym śladem, dlaczego mail nie poszedł
    // („domain not verified", „invalid to field") — przycinamy ją, ale nie
    // zjadamy: ląduje w `notification_outbox.last_error`.
    return { ok: false, error: `Resend ${response.status}: ${raw.slice(0, 500)}` };
  }

  try {
    const parsed = JSON.parse(raw) as { id?: string };
    return { ok: true, id: parsed.id };
  } catch {
    // Wysłane, ale odpowiedź nieczytelna — to nie jest powód do ponowienia.
    return { ok: true };
  }
}
