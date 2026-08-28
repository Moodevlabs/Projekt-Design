import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editor.store';
import { newQuoteBody, newSection } from '@/domain/quote';
import type { Template } from '@/data/repos/templates.repo';

function szablon(): Template {
  return {
    id: 't1',
    workspaceId: 'ws',
    name: 'Projekt kompleksowy',
    body: newQuoteBody({ title: 'Kompleksowy', sections: [newSection({ title: 'Zakres' })] }),
    bodyError: null,
    schedule: null,
    documents: null,
    itemCount: 0,
    totalNetCents: 0,
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-02T10:00:00Z',
  };
}

/** Edytor szablonu (T-113): ten sam store, inne zrodlo. */
describe('editor.store.loadTemplate', () => {
  beforeEach(() => useEditorStore.getState().reset());

  it('wczytuje szablon BEZ tozsamosci dokumentu — bez numeru, klienta, projektu', () => {
    useEditorStore.getState().loadTemplate(szablon());
    const s = useEditorStore.getState();
    expect(s.templateId).toBe('t1');
    expect(s.quoteId).toBeNull();
    expect(s.clientId).toBeNull();
    expect(s.number).toBeNull();
    expect(s.body?.title).toBe('Kompleksowy');
    expect(s.saveState).toBe('idle');
  });

  it('edycja tresci szablonu brudzi store jak w dokumencie — autozapis ma co wyslac', () => {
    useEditorStore.getState().loadTemplate(szablon());
    useEditorStore.getState().addSection();
    expect(useEditorStore.getState().saveState).toBe('dirty');
    expect(useEditorStore.getState().body?.sections).toHaveLength(2);
  });

  it('wczytanie dokumentu po szablonie zdejmuje tryb szablonu', () => {
    useEditorStore.getState().loadTemplate(szablon());
    useEditorStore.getState().load({
      id: 'q1',
      workspaceId: 'ws',
      clientId: null,
      projectId: null,
      lineageId: 'q1',
      version: 1,
      number: 'WYC/1',
      title: 'Wycena',
      status: 'draft',
      totalNetCents: 0,
      totalGrossCents: 0,
      currency: 'PLN',
      clientName: null,
      city: null,
      internalNotes: null,
      docKind: 'offer',
      validUntil: null,
      sentAt: null,
      acceptedAt: null,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
      body: newQuoteBody(),
      bodyError: null,
      schedule: null,
      documents: null,
    });
    expect(useEditorStore.getState().templateId).toBeNull();
    expect(useEditorStore.getState().quoteId).toBe('q1');
  });
});
