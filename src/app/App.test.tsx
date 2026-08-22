import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renderuje powłokę z nawigacją i pulpitem', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Pulpit', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Wyceny' })).toBeInTheDocument();
  });
});
