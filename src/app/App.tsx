import { pl } from '@/i18n/pl';

export function App() {
  return (
    <div className="bg-canvas flex min-h-full items-center justify-center p-8">
      <div className="card-surface w-full max-w-md p-8 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-full text-xl font-semibold">
          A
        </div>
        <h1 className="text-ink mt-5 text-2xl font-semibold tracking-tight">{pl.app.name}</h1>
        <p className="text-ink-soft mt-2 text-sm">{pl.app.tagline}</p>
      </div>
    </div>
  );
}
