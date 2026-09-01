import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pl } from '@/i18n/pl';

/** Kształt zmiennych mutacji — bez tego `mock.calls[0]` wraca jako `any`
 * i asercje na zawartości zestawu niczego nie pilnują. */
type SetVars = { name: string; items: { name: string }[] };

const createMutate = vi.hoisted(() => vi.fn<(vars: SetVars) => void>());

vi.mock('@/data/queries/useLibraryDocGroups', () => ({
  useCreateDocSet: () => ({ mutate: createMutate, isPending: false }),
}));

const { SaveDocSetButton } = await import('./SaveDocSetButton');

beforeEach(() => vi.clearAllMocks());

/**
 * T-122: zestaw dokumentu ma powstawać z rozpisanego dokumentu, a nie
 * z ręcznego składania karty w bibliotece.
 */
describe('SaveDocSetButton', () => {
  it('zapisuje kopie wpisów bez `id` — zestaw to snapshot, nie referencje', async () => {
    const user = userEvent.setup();
    render(
      <SaveDocSetButton
        kind="stages"
        entries={[
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            name: 'Koncepcja',
            description: '',
            included: true,
            sectionLabel: '',
            linkedItemTags: [],
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: pl.editor.docLibrary.saveSet }));
    await user.type(screen.getByLabelText(pl.library.docs.sets.nameLabel), 'Zakres podstawowy');
    await user.click(screen.getByRole('button', { name: pl.common.save }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    const [vars] = createMutate.mock.calls[0]!;
    expect(vars.name).toBe('Zakres podstawowy');
    expect(vars.items).toHaveLength(1);
    expect(vars.items[0]).not.toHaveProperty('id');
    expect(vars.items[0]).toMatchObject({ name: 'Koncepcja' });
  });

  it('pusty dokument nie da się zapisać — zestaw bez wpisów nic nie wnosi', () => {
    render(<SaveDocSetButton kind="schedule" entries={[]} />);

    expect(screen.getByRole('button', { name: pl.editor.docLibrary.saveSet })).toBeDisabled();
  });

  it('wpis, którego nie da się odczytać, wypada zamiast blokować zapis', async () => {
    const user = userEvent.setup();
    render(
      <SaveDocSetButton
        kind="stages"
        entries={[
          { name: 'Koncepcja', description: '', included: true, sectionLabel: '', linkedItemTags: [] },
          { name: 42 },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: pl.editor.docLibrary.saveSet }));
    await user.type(screen.getByLabelText(pl.library.docs.sets.nameLabel), 'Cokolwiek');
    await user.click(screen.getByRole('button', { name: pl.common.save }));

    const [vars] = createMutate.mock.calls[0]!;
    expect(vars.items).toHaveLength(1);
  });

  it('bez nazwy nie zapisuje — zestaw bez nazwy jest nie do odnalezienia', async () => {
    const user = userEvent.setup();
    render(
      <SaveDocSetButton
        kind="price_list"
        entries={[{ name: 'Panorama 360', description: '', sectionLabel: '' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: pl.editor.docLibrary.saveSet }));

    expect(screen.getByRole('button', { name: pl.common.save })).toBeDisabled();
    expect(createMutate).not.toHaveBeenCalled();
  });
});
