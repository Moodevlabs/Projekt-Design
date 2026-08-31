import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ClientLinksEditor } from './ClientLinksEditor';
import { useEditorStore } from '../editor.store';
import { MAX_QUOTE_LINKS, newQuoteBody, newQuoteLink } from '@/domain/quote';
import { pl } from '@/i18n/pl';

/**
 * Odnośniki dla klienta (T-116) — edytor podpięty do prawdziwego store'u.
 *
 * Testujemy przez store, a nie przez propsy, bo cały sens tego komponentu
 * polega na tym, że okno „Udostępnij" i karta w edytorze zmieniają JEDNĄ
 * listę. Gdyby stan trzymał komponent, obie kopie mogłyby się rozjechać.
 */
function linki() {
  return useEditorStore.getState().body?.links ?? [];
}

beforeEach(() => {
  useEditorStore.getState().reset();
  useEditorStore.setState({
    body: newQuoteBody(),
    quoteId: 'q1',
    saveState: 'idle',
  });
});

describe('ClientLinksEditor', () => {
  it('pusta lista mówi wprost, że oferta pójdzie bez materiałów', () => {
    render(<ClientLinksEditor />);
    expect(screen.getByText(pl.quoteLinks.empty)).toBeInTheDocument();
  });

  it('dodaje odnośnik i zapisuje nazwę do dokumentu', async () => {
    const user = userEvent.setup();
    render(<ClientLinksEditor />);

    await user.click(screen.getByRole('button', { name: pl.quoteLinks.add }));
    expect(linki()).toHaveLength(1);

    await user.type(screen.getByLabelText(pl.quoteLinks.labelLabel), 'Wizualizacje');
    expect(linki()[0]?.label).toBe('Wizualizacje');
    // Zmiana w dokumencie musi obudzić autozapis — inaczej odnośnik zostaje
    // w pamięci przeglądarki i nie dojdzie do klienta.
    expect(useEditorStore.getState().saveState).toBe('dirty');
  });

  it('dokleja https:// przy wyjściu z pola adresu', async () => {
    const user = userEvent.setup();
    render(<ClientLinksEditor />);
    await user.click(screen.getByRole('button', { name: pl.quoteLinks.add }));

    const adres = screen.getByLabelText(pl.quoteLinks.urlLabel);
    await user.type(adres, 'drive.google.com/drive/folders/abc');
    await user.tab();

    expect(linki()[0]?.url).toBe('https://drive.google.com/drive/folders/abc');
  });

  /*
   * Adres z literówką ma ZOSTAĆ w polu razem z komunikatem. Wyczyszczenie go
   * albo zapisanie mimo błędu to dwa sposoby na to, żeby klient dostał link
   * prowadzący donikąd.
   */
  it('nie zapisuje czegoś, co nie jest adresem — i mówi o tym', async () => {
    const user = userEvent.setup();
    render(<ClientLinksEditor />);
    await user.click(screen.getByRole('button', { name: pl.quoteLinks.add }));

    const adres = screen.getByLabelText(pl.quoteLinks.urlLabel);
    await user.type(adres, 'wizualizacje sa na dysku');
    await user.tab();

    expect(screen.getByText(pl.quoteLinks.invalidUrl)).toBeInTheDocument();
    expect(linki()[0]?.url).toBe('');
    expect(adres).toHaveValue('wizualizacje sa na dysku');
  });

  it('usuwa odnośnik', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      body: newQuoteBody({
        links: [newQuoteLink({ label: 'Rendery', url: 'https://we.tl/t-abc' })],
      }),
    });

    render(<ClientLinksEditor />);
    await user.click(screen.getByRole('button', { name: pl.quoteLinks.remove }));

    expect(linki()).toHaveLength(0);
  });

  it('nie pozwala przekroczyć limitu odnośników', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      body: newQuoteBody({
        links: Array.from({ length: MAX_QUOTE_LINKS }, () =>
          newQuoteLink({ url: 'https://przyklad.pl' }),
        ),
      }),
    });

    render(<ClientLinksEditor />);
    const dodaj = screen.getByRole('button', { name: pl.quoteLinks.add });
    expect(dodaj).toBeDisabled();

    await user.click(dodaj);
    expect(linki()).toHaveLength(MAX_QUOTE_LINKS);
  });

  /** W podglądzie (bez edycji) lista jest do czytania, nie do zmieniania. */
  it('tryb tylko do odczytu nie pokazuje ani dodawania, ani kasowania', () => {
    useEditorStore.setState({
      body: newQuoteBody({ links: [newQuoteLink({ url: 'https://we.tl/t-abc' })] }),
    });

    render(<ClientLinksEditor disabled />);

    expect(screen.queryByRole('button', { name: pl.quoteLinks.add })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: pl.quoteLinks.remove })).not.toBeInTheDocument();
  });
});
