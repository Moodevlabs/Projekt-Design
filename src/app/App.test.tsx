import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renderuje nazwę aplikacji', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Anzorge' })).toBeInTheDocument();
  });
});
