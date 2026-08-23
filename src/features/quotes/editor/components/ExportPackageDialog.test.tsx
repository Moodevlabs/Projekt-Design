import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExportPackageDialog } from './ExportPackageDialog';
import type { PackageContents } from '@/pdf/package-plan';
import { pl } from '@/i18n/pl';

const PELNY: PackageContents = { hasSchedule: true, hasStages: true, hasPriceList: true };
const PUSTY: PackageContents = { hasSchedule: false, hasStages: false, hasPriceList: false };

function pokaz(contents: PackageContents, onExport = vi.fn()) {
  render(
    <ExportPackageDialog
      open
      onOpenChange={vi.fn()}
      contents={contents}
      exporting={false}
      onExport={onExport}
    />,
  );
  return onExport;
}

describe('ExportPackageDialog — co da się wybrać', () => {
  it('pokazuje wszystkie cztery dokumenty, gdy wycena je ma', () => {
    pokaz(PELNY);
    for (const label of Object.values(pl.pdf.packageDoc)) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('dokumentu, którego wycena NIE ma, w ogóle nie ma na liście', () => {
    // Checkbox, ktorego nie da sie zaznaczyc, to pytanie bez odpowiedzi.
    pokaz(PUSTY);
    expect(screen.getByLabelText(pl.pdf.packageDoc.quote)).toBeInTheDocument();
    expect(screen.queryByLabelText(pl.pdf.packageDoc.schedule)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(pl.pdf.packageDoc.stages)).not.toBeInTheDocument();
  });

  it('domyślnie zaznaczone jest wszystko, co jest', () => {
    // Pakiet to domyslnie CALOSC; odznaczenie jest swiadoma decyzja.
    pokaz(PELNY);
    for (const label of Object.values(pl.pdf.packageDoc)) {
      expect(screen.getByLabelText(label)).toBeChecked();
    }
  });
});

describe('ExportPackageDialog — wybór i eksport', () => {
  it('oddaje zaznaczone dokumenty i tryb jednego pliku', async () => {
    const user = userEvent.setup();
    const onExport = pokaz(PELNY);

    await user.click(screen.getByLabelText(pl.pdf.packageDoc.priceList));
    await user.click(screen.getByRole('button', { name: pl.pdf.packageExport }));

    expect(onExport).toHaveBeenCalledTimes(1);
    const [wybrane, single] = onExport.mock.calls[0] as [string[], boolean];
    expect(wybrane).not.toContain('priceList');
    expect(wybrane).toContain('quote');
    expect(single).toBe(true);
  });

  it('przełącznik „jeden plik" schodzi do osobnych plików', async () => {
    const user = userEvent.setup();
    const onExport = pokaz(PELNY);

    await user.click(screen.getByLabelText(pl.pdf.packageSingle));
    expect(screen.getByText(pl.pdf.packageSeparateHint)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: pl.pdf.packageExport }));
    expect(onExport.mock.calls[0]?.[1]).toBe(false);
  });

  it('bez zaznaczenia nie da się eksportować', async () => {
    const user = userEvent.setup();
    const onExport = pokaz(PUSTY);

    await user.click(screen.getByLabelText(pl.pdf.packageDoc.quote));

    expect(screen.getByRole('button', { name: pl.pdf.packageExport })).toBeDisabled();
    expect(onExport).not.toHaveBeenCalled();
  });

  it('w trakcie eksportu przycisk jest zablokowany', () => {
    render(
      <ExportPackageDialog
        open
        onOpenChange={vi.fn()}
        contents={PELNY}
        exporting
        onExport={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: pl.pdf.packageExport })).toBeDisabled();
  });
});
